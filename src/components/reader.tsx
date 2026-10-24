import { useEffect, useState } from 'react'
import {
  BookOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Copy,
  Share2,
  Volume2,
  Download,
  Trash2,
  Check,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { books } from '@/lib/books'
import {
  readLocal,
  writeLocal,
  loadBible,
  downloadBible,
  removeBible,
  type Book,
  type Saved,
  type Reading,
} from '@/lib/local'
import { PageHeading, Empty } from './bible-app'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'
export function Reader({
  initial,
  ready,
  onReading,
  onFavorites,
  notify,
}: {
  initial: Reading
  ready: boolean
  onReading: (r: Reading) => void
  onFavorites: (v: Saved[]) => void
  notify: (m: string) => void
}) {
  const [data, setData] = useState<Book[]>([])
  const [position, setPosition] = useState(initial)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Saved[] | null>(null)
  const [favorites, setFavorites] = useState<Saved[]>([])
  const [highlights, setHighlights] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Saved | null>(null)
  const [size, setSize] = useState(22)
  const [theme, setTheme] = useState('dark')
  const [settingsReady, setSettingsReady] = useState(false)
  useEffect(() => {
    loadBible()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    Promise.all([
      readLocal<Saved[]>('favorites', []),
      readLocal<Record<string, string>>('highlights', {}),
      readLocal<number>('fontSize', 22),
      readLocal<string>('readerTheme', 'dark'),
    ])
      .then(([f, h, s, t]) => {
        setFavorites(f)
        setHighlights(h)
        setSize(s)
        setTheme(t)
        setSettingsReady(true)
      })
      .catch(() => {
        setSettingsReady(true)
        notify(
          'Le stockage local est indisponible. La lecture en ligne reste possible, mais vos données ne sont pas enregistrées.',
        )
      })
    return () => {
      window.speechSynthesis?.cancel()
    }
  }, [])
  useEffect(() => {
    if (ready) setPosition(initial)
  }, [initial, ready])
  useEffect(() => {
    if (!data.length) return
    const ref = new URLSearchParams(location.search).get('ref')
    const m = ref?.match(/^(.+) (\d+):(\d+)/)
    if (!m) return
    const b = books.findIndex((v) => v.name === m[1])
    const c = Number(m[2]) - 1
    const v = Number(m[3]) - 1
    if (b >= 0 && data[b]?.chapters[c]?.[v]) {
      setPosition({ book: b, chapter: c })
      onReading({ book: b, chapter: c })
      setSelected({
        book: b,
        chapter: c,
        verse: v,
        ref: `${books[b].name} ${c + 1}:${v + 1}`,
        text: data[b].chapters[c][v],
      })
    } else
      setError(
        'Cette référence est introuvable dans le texte disponible. Vérifiez le livre, le chapitre et le verset.',
      )
  }, [data])
  async function navigate(book: number, chapter: number) {
    if (!books[book] || chapter < 0 || chapter >= books[book].chapters) return
    const r = { book, chapter }
    setPosition(r)
    onReading(r)
    setResults(null)
    window.speechSynthesis?.cancel()
  }
  async function favorite() {
    if (!selected) return
    const f = favorites.some((v) => v.ref === selected.ref)
      ? favorites.filter((v) => v.ref !== selected.ref)
      : [...favorites, selected]
    try {
      await writeLocal('favorites', f)
      setFavorites(f)
      onFavorites(f)
      toast.success('Favoris mis à jour')
    } catch {
      notify('Le favori n’a pas été enregistré.')
    }
  }
  async function highlight(color: string) {
    if (!selected) return
    const next = { ...highlights }
    if (color) next[selected.ref] = color
    else delete next[selected.ref]
    try {
      await writeLocal('highlights', next)
      setHighlights(next)
    } catch {
      notify('Le surlignage n’a pas été enregistré.')
    }
  }
  function search() {
    const clean = query
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    if (!clean) {
      setResults(null)
      return
    }
    const match = clean.match(/^(.+?)\s+(\d+)(?::(\d+))?$/)
    if (match) {
      const b = books.findIndex(
        (v) =>
          v.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase() === match[1],
      )
      const c = Number(match[2]) - 1
      const v = Number(match[3] || 1) - 1
      if (b >= 0 && data[b]?.chapters[c]?.[v]) {
        navigate(b, c)
        setSelected({
          book: b,
          chapter: c,
          verse: v,
          ref: `${books[b].name} ${c + 1}:${v + 1}`,
          text: data[b].chapters[c][v],
        })
        return
      }
      setResults([])
      return
    }
    const found: Saved[] = []
    data.forEach((b, bi) =>
      b.chapters.forEach((c, ci) =>
        c.forEach((text, vi) => {
          if (
            found.length < 150 &&
            text
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .toLowerCase()
              .includes(clean)
          )
            found.push({
              book: bi,
              chapter: ci,
              verse: vi,
              text,
              ref: `${b.name} ${ci + 1}:${vi + 1}`,
            })
        }),
      ),
    )
    setResults(found)
  }
  const chapter = data[position.book]?.chapters[position.chapter] || []
  return (
    <>
      <PageHeading eyebrow="LA PAROLE, À VOTRE RYTHME" title="Votre Bible">
        <span className="mini-badge">David Martin 1744 · Domaine public</span>
      </PageHeading>
      <form
        className="search-field"
        onSubmit={(e) => {
          e.preventDefault()
          search()
        }}
      >
        <Search size={20} />
        <input
          aria-label="Référence ou mot biblique"
          placeholder="Un mot, une référence… Jean 3:16"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">Rechercher</button>
      </form>
      <div className="reader-toolbar panel">
        <label>
          Livre
          <select
            value={position.book}
            onChange={(e) => navigate(Number(e.target.value), 0)}
          >
            {books.map((b, i) => (
              <option key={b.name} value={i}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Chapitre
          <select
            value={position.chapter}
            onChange={(e) => navigate(position.book, Number(e.target.value))}
          >
            {Array.from({ length: books[position.book].chapters }, (_, i) => (
              <option key={i} value={i}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label>
          Taille
          <select
            value={size}
            disabled={!settingsReady}
            onChange={(e) => {
              const n = Number(e.target.value)
              setSize(n)
              writeLocal('fontSize', n).catch(() =>
                notify('Taille non enregistrée.'),
              )
            }}
          >
            {[18, 22, 26, 30].map((s) => (
              <option key={s} value={s}>
                {s} px
              </option>
            ))}
          </select>
        </label>
        <label>
          Thème
          <select
            value={theme}
            disabled={!settingsReady}
            onChange={(e) => {
              setTheme(e.target.value)
              writeLocal('readerTheme', e.target.value).catch(() =>
                notify('Thème non enregistré.'),
              )
            }}
          >
            <option value="dark">Sombre</option>
            <option value="sepia">Sépia</option>
            <option value="light">Clair</option>
          </select>
        </label>
        <button
          className="button"
          onClick={() => {
            if (!window.speechSynthesis) {
              notify('La lecture vocale n’est pas disponible sur cet appareil.')
              return
            }
            if (speechSynthesis.speaking) {
              speechSynthesis.cancel()
              return
            }
            const u = new SpeechSynthesisUtterance(chapter.join(' '))
            u.lang = 'fr-FR'
            speechSynthesis.speak(u)
          }}
        >
          <Volume2 size={18} /> Écouter / arrêter
        </button>
      </div>
      {loading ? (
        <div className="panel skeleton" aria-live="polite">
          Chargement des Écritures…
        </div>
      ) : error ? (
        <div className="notice" role="alert">
          {error}
          <button
            onClick={() => {
              setError('')
              setLoading(true)
              loadBible()
                .then(setData)
                .catch((e) => setError(e.message))
                .finally(() => setLoading(false))
            }}
          >
            Réessayer
          </button>
        </div>
      ) : results ? (
        <>
          <p>
            {results.length} résultat(s)
            {results.length === 150 ? ' · 150 premiers résultats affichés' : ''}
          </p>
          <div className="list-grid">
            {results.length ? (
              results.map((v) => (
                <button
                  className="panel search-result"
                  key={v.ref}
                  onClick={() => {
                    navigate(v.book, v.chapter)
                    setSelected(v)
                  }}
                >
                  <strong>{v.ref}</strong>
                  <p>{v.text}</p>
                </button>
              ))
            ) : (
              <Empty text="Aucun passage trouvé. Utilisez le nom complet du livre ou un autre mot." />
            )}
          </div>
        </>
      ) : (
        <article className={`scripture ${theme}`} style={{ fontSize: size }}>
          <div className="scripture-heading">
            <span className="eyebrow">DAVID MARTIN · 1744</span>
            <h2>{books[position.book].name}</h2>
            <span>CHAPITRE {position.chapter + 1}</span>
          </div>
          {chapter.map((text, i) => {
            const ref = `${books[position.book].name} ${position.chapter + 1}:${i + 1}`
            return (
              <button
                className="verse"
                style={{
                  background: highlights[ref] || undefined,
                  color: highlights[ref] ? '#ffffff' : undefined,
                }}
                key={i}
                onClick={() =>
                  setSelected({
                    book: position.book,
                    chapter: position.chapter,
                    verse: i,
                    text,
                    ref,
                  })
                }
              >
                <sup>{i + 1}</sup>
                <span>{text}</span>
                {favorites.some((v) => v.ref === ref) && <Bookmark size={15} />}
              </button>
            )
          })}
          <div className="chapter-nav">
            <button
              disabled={position.book === 0 && position.chapter === 0}
              onClick={() =>
                position.chapter > 0
                  ? navigate(position.book, position.chapter - 1)
                  : navigate(
                      position.book - 1,
                      books[position.book - 1].chapters - 1,
                    )
              }
            >
              <ChevronLeft size={18} /> Précédent
            </button>
            <button onClick={() => onReading(position)}>
              Enregistrer ma progression <Check size={17} />
            </button>
            <button
              disabled={
                position.book === 65 &&
                position.chapter === books[65].chapters - 1
              }
              onClick={() =>
                position.chapter + 1 < books[position.book].chapters
                  ? navigate(position.book, position.chapter + 1)
                  : navigate(position.book + 1, 0)
              }
            >
              Suivant <ChevronRight size={18} />
            </button>
          </div>
        </article>
      )}
      <p className="quiet reader-hint">
        Sélectionnez un verset pour le conserver, le surligner, le copier ou le
        partager.
      </p>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent className="verse-dialog">
          <DialogTitle>{selected?.ref}</DialogTitle>
          <DialogDescription>{selected?.text}</DialogDescription>
          <div className="button-row">
            <button className="button" onClick={favorite}>
              <Bookmark size={17} />
              {favorites.some((v) => v.ref === selected?.ref)
                ? 'Retirer le favori'
                : 'Garder en favori'}
            </button>
            <button
              className="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${selected?.text} — ${selected?.ref} (Martin 1744)`,
                  )
                  toast.success('Verset copié')
                } catch {
                  notify('La copie n’est pas disponible.')
                }
              }}
            >
              <Copy size={17} /> Copier
            </button>
            <button
              className="button"
              onClick={async () => {
                try {
                  if (!navigator.share) {
                    notify(
                      'Le partage n’est pas disponible sur cet appareil. Utilisez Copier.',
                    )
                    return
                  }
                  await navigator.share({
                    text: `${selected?.text} — ${selected?.ref} (Martin 1744)`,
                  })
                } catch {
                  notify('Partage annulé ou indisponible.')
                }
              }}
            >
              <Share2 size={17} /> Partager
            </button>
          </div>
          <span>Surligner ce verset</span>
          <div className="highlight-colors">
            {[
              ['Or', '#856b2f'],
              ['Vert', '#365e51'],
              ['Bleu', '#315a7d'],
              ['Rose', '#785260'],
              ['Effacer', ''],
            ].map(([name, color]) => (
              <button
                key={name}
                onClick={() => highlight(color)}
                style={{ background: color || '#263a50' }}
              >
                {name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
export function Downloads({ notify }: { notify: (m: string) => void }) {
  const [bytes, setBytes] = useState(0)
  const [progress, setProgress] = useState(0)
  const [pending, setPending] = useState(false)
  useEffect(() => {
    readLocal<number>('bibleBytes', 0)
      .then(setBytes)
      .catch(() => notify('Le stockage local est inaccessible.'))
  }, [notify])
  return (
    <>
      <PageHeading
        eyebrow="VOTRE BIBLE VOUS ACCOMPAGNE"
        title="Téléchargements hors ligne"
      />
      <section className="panel download-card">
        <Download size={32} />
        <h2>La Bible complète</h2>
        <p>David Martin 1744 · 66 livres · 1 189 chapitres</p>
        <p>
          {bytes
            ? `${(bytes / 1024 / 1024).toFixed(1)} Mo enregistrés dans IndexedDB sur cet appareil.`
            : 'Le texte n’est pas encore enregistré pour la lecture hors ligne.'}
        </p>
        {pending && (
          <>
            <progress value={progress} max={100} />
            <p role="status">Téléchargement : {progress} %</p>
          </>
        )}
        <div className="button-row">
          <button
            className="button gold-button"
            disabled={pending}
            onClick={async () => {
              setPending(true)
              try {
                setBytes(await downloadBible(setProgress))
                toast.success(
                  'Les 66 livres sont enregistrés sur cet appareil.',
                )
              } catch (e) {
                notify(
                  e instanceof Error ? e.message : 'Échec du téléchargement.',
                )
              } finally {
                setPending(false)
              }
            }}
          >
            <Download size={18} />
            {pending
              ? 'Téléchargement…'
              : bytes
                ? 'Télécharger à nouveau'
                : 'Télécharger les 66 livres'}
          </button>
          {bytes > 0 && (
            <button
              className="button"
              disabled={pending}
              onClick={async () => {
                if (
                  !confirm(
                    'Supprimer le texte téléchargé ? Vos favoris et notes seront conservés.',
                  )
                )
                  return
                try {
                  await removeBible()
                  setBytes(0)
                  setProgress(0)
                } catch {
                  notify('La suppression a échoué.')
                }
              }}
            >
              <Trash2 size={17} /> Supprimer
            </button>
          )}
        </div>
        <p className="quiet">
          Le journal, les favoris et surlignages sont enregistrés séparément. Le
          stockage peut être effacé par le navigateur ; sa persistance absolue
          n’est pas garantie. L’IA, les messages et les plateformes externes
          nécessitent Internet.
        </p>
        <a href="/data/SOURCES.md" target="_blank" rel="noreferrer">
          Droits et origine du texte <ArrowRight size={15} />
        </a>
      </section>
    </>
  )
}
export function SavedPage({
  items,
  open,
}: {
  items: Saved[]
  open: (r: Reading) => void
}) {
  return (
    <>
      <PageHeading eyebrow="DES PAROLES QUI RESTENT" title="Mes favoris" />
      {items.length ? (
        <div className="list-grid">
          {items.map((v) => (
            <button
              className="panel search-result"
              onClick={() => open({ book: v.book, chapter: v.chapter })}
              key={v.ref}
            >
              <Bookmark size={19} />
              <h2>{v.ref}</h2>
              <p>{v.text}</p>
            </button>
          ))}
        </div>
      ) : (
        <Empty text="Sélectionnez un verset dans le lecteur et choisissez « Garder en favori »." />
      )}
    </>
  )
}
export function Journal() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('Chargement du journal…')
  const [ready, setReady] = useState(false)
  useEffect(() => {
    readLocal<string>('journal', '')
      .then((t) => {
        setText(t)
        setReady(true)
        setStatus('Privé · enregistré uniquement sur cet appareil')
      })
      .catch(() => setStatus('Stockage local indisponible.'))
  }, [])
  return (
    <section className="panel journal">
      <BookOpen size={25} />
      <h2>Mon journal de prière</h2>
      <label htmlFor="journal">Ce que je confie aujourd’hui</label>
      <textarea
        id="journal"
        disabled={!ready}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setStatus('Modifications non enregistrées')
        }}
        placeholder="Une gratitude, une intention, une pensée…"
        rows={8}
      />
      <p className="quiet" role="status">
        {status}
      </p>
      <div className="button-row">
        <button
          className="button gold-button"
          disabled={!ready}
          onClick={async () => {
            try {
              await writeLocal('journal', text)
              setStatus('Journal enregistré sur cet appareil.')
            } catch {
              setStatus('Échec de l’enregistrement.')
            }
          }}
        >
          Enregistrer
        </button>
        <button
          className="button"
          disabled={!ready}
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([text], { type: 'text/plain;charset=utf-8' }),
            )
            const a = document.createElement('a')
            a.href = url
            a.download = 'mon-journal-de-priere.txt'
            a.click()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
          }}
        >
          Exporter
        </button>
        <button
          className="icon-button"
          disabled={!ready}
          aria-label="Effacer mon journal"
          onClick={async () => {
            if (!confirm('Effacer votre journal local ?')) return
            try {
              await writeLocal('journal', '')
              setText('')
              setStatus('Journal effacé.')
            } catch {
              setStatus('Échec de la suppression.')
            }
          }}
        >
          <Trash2 size={17} />
        </button>
      </div>
    </section>
  )
}
