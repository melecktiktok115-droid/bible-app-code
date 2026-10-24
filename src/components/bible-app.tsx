import { useEffect, useState, type ReactNode } from 'react'
import {
  BookOpen,
  House,
  Heart,
  MessagesSquare,
  Users,
  Menu,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  Sun,
  Bell,
  Bookmark,
  Download,
  Music2,
  Play,
  Sparkles,
  Leaf,
  Cross,
  Search,
  Settings,
  ShieldCheck,
  WifiOff,
  GraduationCap,
  Baby,
  Headphones,
  X,
} from 'lucide-react'
import {
  getUser,
  onAuthChange,
  handleAuthCallback,
  type User,
} from '@netlify/identity'
import { readLocal, writeLocal, type Reading, type Saved } from '@/lib/local'
import { books } from '@/lib/books'
import { dailyVerses } from '@/lib/daily'
import { Reader, Downloads, SavedPage, Journal } from './reader'
import { Account, Online } from './online'
export type Navigate = (page: string) => void
export function BibleApp() {
  const [page, setPage] = useState('accueil')
  const [user, setUser] = useState<User | null>(null)
  const [reading, setReading] = useState<Reading>({ book: 18, chapter: 22 })
  const [visited, setVisited] = useState<string[]>([])
  const [favorites, setFavorites] = useState<Saved[]>([])
  const [online, setOnline] = useState(true)
  const [notice, setNotice] = useState('')
  const [ready, setReady] = useState(false)
  const [recover, setRecover] = useState(false)
  const [invitation, setInvitation] = useState('')
  const nav: Navigate = (p) => {
    setPage(p)
    const u = new URL(location.href)
    u.searchParams.set('page', p)
    u.searchParams.delete('ref')
    history.pushState({}, '', u)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  useEffect(() => {
    setPage(new URLSearchParams(location.search).get('page') || 'accueil')
    const pop = () =>
      setPage(new URLSearchParams(location.search).get('page') || 'accueil')
    window.addEventListener('popstate', pop)
    setOnline(navigator.onLine)
    const network = () => setOnline(navigator.onLine)
    window.addEventListener('online', network)
    window.addEventListener('offline', network)
    Promise.all([
      readLocal<Reading>('reading', { book: 18, chapter: 22 }),
      readLocal<string[]>('visited', []),
      readLocal<Saved[]>('favorites', []),
    ])
      .then(([r, v, f]) => {
        setReading(r)
        setVisited(v)
        setFavorites(f)
        setReady(true)
      })
      .catch(() => {
        setReady(true)
        setNotice(
          'Le stockage local est indisponible. Les enregistrements ne sont pas garantis.',
        )
      })
    const off = onAuthChange((_event, u) => setUser(u))
    ;(async () => {
      try {
        const cb = await handleAuthCallback()
        if (cb?.type === 'recovery') {
          setRecover(true)
          nav('profil')
        }
        if (cb?.type === 'invite') {
          setInvitation(cb.token)
          nav('profil')
        }
        setUser(await getUser())
      } catch {
        setNotice(
          'Le lien de connexion ne peut pas être traité. Réessayez depuis votre profil.',
        )
      }
    })()
    if ('serviceWorker' in navigator)
      navigator.serviceWorker
        .register('/sw.js')
        .then(async () => {
          const registration = await navigator.serviceWorker.ready
          registration.active?.postMessage({
            type: 'CACHE_ASSETS',
            urls: performance.getEntriesByType('resource').map((r) => r.name),
          })
        })
        .catch(() =>
          setNotice('L’ouverture hors ligne n’a pas pu être préparée.'),
        )
    return () => {
      off()
      window.removeEventListener('popstate', pop)
      window.removeEventListener('online', network)
      window.removeEventListener('offline', network)
    }
  }, [])
  async function onReading(r: Reading) {
    setReading(r)
    if (!ready) return
    try {
      await writeLocal('reading', r)
      const v = await readLocal<string[]>('visited', [])
      const next = [...new Set([...v, `${r.book}:${r.chapter}`])]
      await writeLocal('visited', next)
      setVisited(next)
    } catch {
      setNotice('La progression n’a pas pu être enregistrée.')
    }
  }
  const mainNav = [
    ['accueil', 'Accueil', House],
    ['bible', 'Bible', BookOpen],
    ['prieres', 'Prières', Heart],
    ['ia', 'Messagerie IA', MessagesSquare],
    ['communaute', 'Communauté', Users],
    ['plus', 'Plus', Menu],
  ] as const
  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="?page=accueil"
          onClick={(e) => {
            e.preventDefault()
            nav('accueil')
          }}
        >
          <span className="brand-mark">
            <Cross size={25} />
          </span>
          <span>
            Bible Chrétienne Moderne<small>PAR MELECK</small>
          </span>
        </a>
        <nav aria-label="Navigation principale">
          {mainNav.map(([id, label, Icon]) => (
            <a
              key={id}
              className={page === id ? 'active' : ''}
              href={`?page=${id}`}
              onClick={(e) => {
                e.preventDefault()
                nav(id)
              }}
            >
              <Icon size={17} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label="Notifications"
            onClick={() => nav('notifications')}
          >
            <Bell size={20} />
          </button>
          <button
            className="avatar"
            aria-label="Mon profil"
            onClick={() => nav('profil')}
          >
            {user?.name?.slice(0, 1) || <Users size={18} />}
          </button>
        </div>
      </header>
      {!online && (
        <div className="offline-bar">
          <WifiOff size={16} /> Mode hors ligne · Seuls les contenus enregistrés
          sont disponibles.
        </div>
      )}
      <main className="main-content">
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button aria-label="Fermer" onClick={() => setNotice('')}>
              <X size={16} />
            </button>
          </div>
        )}
        {page === 'accueil' ? (
          <Home
            nav={nav}
            reading={reading}
            visited={visited}
            favorites={favorites}
          />
        ) : page === 'bible' ? (
          <Reader
            initial={reading}
            ready={ready}
            onReading={onReading}
            onFavorites={setFavorites}
            notify={setNotice}
          />
        ) : page === 'telechargements' ? (
          <Downloads notify={setNotice} />
        ) : page === 'favoris' ? (
          <SavedPage
            items={favorites}
            open={(r) => {
              onReading(r)
              nav('bible')
            }}
          />
        ) : page === 'historique' ? (
          <>
            <PageHeading
              eyebrow="VOTRE CHEMINEMENT"
              title="Historique de lecture"
            />
            <div className="list-grid">
              {visited.length ? (
                visited
                  .slice()
                  .reverse()
                  .map((v) => {
                    const [b, c] = v.split(':').map(Number)
                    return (
                      <button
                        className="panel row"
                        key={v}
                        onClick={() => {
                          onReading({ book: b, chapter: c })
                          nav('bible')
                        }}
                      >
                        {books[b]?.name} {c + 1}
                        <ArrowRight size={18} />
                      </button>
                    )
                  })
              ) : (
                <Empty text="Votre parcours commence avec votre premier chapitre." />
              )}
            </div>
          </>
        ) : page === 'prieres' ? (
          <PrayerPage />
        ) : page === 'ia' ||
          page === 'communaute' ||
          page === 'messages' ||
          page === 'createur' ? (
          <Online page={page} user={user} nav={nav} />
        ) : page === 'profil' ? (
          <Account
            user={user}
            recover={recover}
            invitation={invitation}
            onComplete={() => {
              setRecover(false)
              setInvitation('')
            }}
          />
        ) : page === 'musique' ? (
          <MusicPage />
        ) : page === 'plus' ? (
          <More nav={nav} />
        ) : page === 'enseignements' ? (
          <Studies nav={nav} />
        ) : page === 'enfants' ? (
          <Kids />
        ) : page === 'videos' ? (
          <>
            <PageHeading
              eyebrow="REGARDER ET GRANDIR"
              title="Vidéos chrétiennes"
            />
            <Empty text="La sélection de vidéos francophones autorisées est en cours de vérification. Aucun lecteur externe n’est chargé sans source validée." />
          </>
        ) : page === 'premium' ? (
          <Premium />
        ) : page === 'notifications' ? (
          <>
            <PageHeading eyebrow="RESTER INFORMÉ" title="Notifications" />
            <Empty text="Aucune notification. Les notifications push ne sont pas activées ; les conversations se rafraîchissent quand leur écran est ouvert." />
          </>
        ) : page === 'parametres' ? (
          <>
            <PageHeading
              eyebrow="À VOTRE RYTHME"
              title="Paramètres & confidentialité"
            />
            <div className="panel">
              <h2>Vos données, vos choix</h2>
              <p>
                Les favoris, surlignages et le journal restent dans IndexedDB
                sur cet appareil. Ils ne sont pas chiffrés : évitez un appareil
                partagé. Les messages et publications sont conservés sur le
                serveur.
              </p>
              <button className="button" onClick={() => nav('telechargements')}>
                <Download size={17} /> Gérer les téléchargements
              </button>
              <p>
                Les comptes et les conversations nécessitent Internet. Aucun
                outil publicitaire ni suivi d’audience n’est ajouté.
              </p>
            </div>
          </>
        ) : page === 'aide' ? (
          <Help />
        ) : (
          <>
            <PageHeading title="Page introuvable" />
            <button className="button" onClick={() => nav('accueil')}>
              Revenir à l’accueil
            </button>
          </>
        )}
      </main>
      <footer>
        <span className="footer-brand">
          <Cross size={16} /> Une parole. Une prière. Un pas de plus.
        </span>
        <span>
          Créé par Meleck <span className="gold">✦</span>
        </span>
        <button onClick={() => nav('aide')}>Aide & confidentialité</button>
      </footer>
    </div>
  )
}
export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow || 'BIBLE CHRÉTIENNE MODERNE'}</span>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  )
}
export function Empty({ text }: { text: string }) {
  return (
    <div className="empty panel">
      <BookOpen size={32} />
      <p>{text}</p>
    </div>
  )
}
function Home({
  nav,
  reading,
  visited,
  favorites,
}: {
  nav: Navigate
  reading: Reading
  visited: string[]
  favorites: Saved[]
}) {
  const [date, setDate] = useState('Un nouveau jour avec Dieu')
  const [daily, setDaily] = useState(dailyVerses[0])
  useEffect(() => {
    setDate(
      new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    )
    setDaily(
      dailyVerses[Math.floor(Date.now() / 86400000) % dailyVerses.length],
    )
  }, [])
  return (
    <>
      <div className="welcome-line">
        <div className="eyebrow">
          <span className="tiny-dot" />
          {date}
        </div>
        <span className="quiet">
          <Sun size={16} /> Que la paix vous accompagne
        </span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow gold">LA FOI SE CULTIVE CHAQUE JOUR</span>
          <h1>
            Un moment avec Dieu.
            <br />
            <em>Une lumière pour votre vie.</em>
          </h1>
          <p>
            Dans le calme d’un verset, la force d’une prière.
            <br />
            Prenez le temps de nourrir votre foi, à votre rythme.
          </p>
          <div className="hero-buttons">
            <button className="button gold-button" onClick={() => nav('bible')}>
              <BookOpen size={18} /> Ouvrir ma Bible <ArrowUpRight size={17} />
            </button>
            <button className="text-button" onClick={() => nav('prieres')}>
              Prendre un temps de prière <ArrowRight size={16} />
            </button>
          </div>
          <div className="hero-foot">
            <span className="line" /> LA PAROLE, PARTOUT AVEC VOUS
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <svg viewBox="0 0 600 460" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="sky" x2="0" y2="1">
                <stop stopColor="#829291" />
                <stop offset=".55" stopColor="#c5b99b" />
                <stop offset="1" stopColor="#37566b" />
              </linearGradient>
              <linearGradient id="mount" x2="0" y2="1">
                <stop stopColor="#60787b" />
                <stop offset="1" stopColor="#142b3d" />
              </linearGradient>
              <radialGradient id="sun">
                <stop stopColor="#f6df9f" stopOpacity=".8" />
                <stop offset="1" stopColor="#edd7a2" stopOpacity="0" />
              </radialGradient>
              <filter id="grain">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency=".65"
                  numOctaves="3"
                  stitchTiles="stitch"
                />
                <feColorMatrix type="saturate" values="0" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope=".13" />
                </feComponentTransfer>
                <feBlend in="SourceGraphic" mode="soft-light" />
              </filter>
            </defs>
            <g filter="url(#grain)">
              <path fill="url(#sky)" d="M0 0h600v460H0z" />
              <circle fill="url(#sun)" cx="375" cy="150" r="165" />
              <circle fill="#eed5a0" cx="375" cy="150" r="34" />
              <path
                fill="#94a09a"
                d="M0 310L100 178l55 56 80-136 60 130 70-38 70 90 80-55 85 72v163H0z"
              />
              <path
                fill="url(#mount)"
                d="M0 315l95-60 72 48 120-129 81 103 55-30 177 112v101H0z"
              />
              <path
                fill="#18384b"
                d="M0 362l125-51 106 36 77-30 140 57 152-52v138H0z"
              />
              <path
                fill="#0a2235"
                d="M0 418l140-51 80 30 128-12 120 45 132-37v67H0z"
              />
              <path
                fill="#bba57d"
                opacity=".8"
                d="M315 460h48l-54-45-50-13 28-21-46 20 42 24z"
              />
            </g>
          </svg>
          <div className="art-caption">
            « Ta parole est une lampe à mon pied »
            <small>PSAUMES 119:105 · DAVID MARTIN 1744</small>
          </div>
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="daily-verse panel">
          <div className="card-label">
            <span>
              <Sun size={17} /> LE VERSET DU JOUR
            </span>
            <button
              className="icon-button"
              onClick={() => nav('bible')}
              aria-label="Lire le verset"
            >
              <ArrowUpRight size={19} />
            </button>
          </div>
          <span className="quote-mark">“</span>
          <blockquote>« {daily.text} »</blockquote>
          <a
            className="verse-ref"
            href={`?page=bible&ref=${encodeURIComponent(daily.ref)}`}
          >
            {daily.ref} <span>David Martin 1744</span>
          </a>
          <div className="verse-bottom">
            <span>Une parole à garder dans votre cœur.</span>
            <BookOpen size={21} />
          </div>
        </section>
        <section className="continue panel">
          <div className="card-label">
            <span>
              <BookOpen size={17} /> VOTRE CHEMINEMENT
            </span>
            <span className="mini-badge">À votre rythme</span>
          </div>
          <h2>Chaque page vous rapproche.</h2>
          <p>Reprenez votre lecture là où vous l’avez laissée.</p>
          <div className="reading-place">
            <span className="book-icon">
              <BookOpen size={25} />
            </span>
            <div>
              <strong>{books[reading.book]?.name || 'Psaumes'}</strong>
              <span>Chapitre {reading.chapter + 1} · David Martin 1744</span>
            </div>
            <ChevronRight size={20} />
          </div>
          <div className="progress-caption">
            <span>Votre parcours biblique</span>
            <span>{visited.length} / 1 189 chapitres</span>
          </div>
          <progress value={visited.length} max={1189} />
          <button
            className="button blue-button wide"
            onClick={() => nav('bible')}
          >
            Reprendre ma lecture <ArrowRight size={17} />
          </button>
        </section>
        <section className="prayer-small panel">
          <div className="card-label">
            <span>
              <Heart size={17} /> LA PRIÈRE DU JOUR
            </span>
          </div>
          <h2>Confier sa journée</h2>
          <p>
            Seigneur, guide mes pas aujourd’hui. Apprends-moi à accueillir ta
            paix et à la partager autour de moi.
          </p>
          <span className="quiet">Prière proposée par l’application</span>
          <button className="text-button gold" onClick={() => nav('prieres')}>
            Entrer dans la prière <ArrowRight size={16} />
          </button>
        </section>
      </div>
      <section className="explore-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">NOURRIR L’ÂME, JOUR APRÈS JOUR</span>
            <h2>Un espace pour chaque élan de foi</h2>
          </div>
          <button className="text-button" onClick={() => nav('plus')}>
            Tout explorer <ArrowRight size={17} />
          </button>
        </div>
        <div className="explore-grid">
          {[
            {
              page: 'ia',
              icon: Sparkles,
              title: 'Le Conseiller',
              label: 'VOTRE ASSISTANT BIBLIQUE',
              text: 'Un passage à comprendre, une question à confier.',
              color: 'sage',
            },
            {
              page: 'musique',
              icon: Headphones,
              title: 'La foi en musique',
              label: 'MUSIQUE CHRÉTIENNE',
              text: 'Louange, adoration et gospel. Une sélection attentive.',
              color: 'amber',
            },
            {
              page: 'enseignements',
              icon: GraduationCap,
              title: 'Grandir dans la Parole',
              label: 'ÉTUDES & MÉDITATIONS',
              text: 'Explorer les Écritures et les vivre au quotidien.',
              color: 'blue',
            },
            {
              page: 'enfants',
              icon: Baby,
              title: 'Les petits dans la foi',
              label: 'ESPACE ENFANTS',
              text: 'Découvrir la Bible ensemble, avec simplicité.',
              color: 'rose',
            },
          ].map(({ page, icon: Icon, title, label, text, color }) => (
            <button
              className={`explore-card ${color}`}
              key={page}
              onClick={() => nav(page)}
            >
              <div className="explore-top">
                <span className="explore-icon">
                  <Icon size={25} />
                </span>
                <ArrowUpRight size={19} />
              </div>
              <span className="eyebrow">{label}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </button>
          ))}
        </div>
      </section>
      <div className="bottom-grid">
        <section className="panel meditation">
          <span className="eyebrow gold">
            <Leaf size={15} /> LA PAUSE MÉDITATION
          </span>
          <h2>Apprendre à faire confiance.</h2>
          <p>
            Le berger connaît le chemin. À la lumière du Psaume 23, prenez un
            instant pour nommer ce que vous souhaitez confier à Dieu
            aujourd’hui.
          </p>
          <button className="text-button" onClick={() => nav('prieres')}>
            Écrire dans mon journal <ArrowRight size={17} />
          </button>
        </section>
        <section className="panel">
          <div className="card-label">
            <span>
              <Users size={17} /> ENSEMBLE DANS LA FOI
            </span>
          </div>
          <h2>Portons nos prières ensemble.</h2>
          <p>
            Partagez une intention dans la communauté, ou retrouvez une
            conversation privée.
          </p>
          <div className="button-row">
            <button className="button" onClick={() => nav('communaute')}>
              La communauté <ArrowUpRight size={16} />
            </button>
            <button className="text-button" onClick={() => nav('messages')}>
              Messagerie privée <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </div>
      {favorites.length > 0 && (
        <section className="panel recent-favorites">
          <span className="eyebrow gold">VOS FAVORIS RÉCENTS</span>
          {favorites.slice(-2).map((v) => (
            <a
              key={v.ref}
              href={`?page=bible&ref=${encodeURIComponent(v.ref)}`}
            >
              <strong>{v.ref}</strong>
              <p>{v.text}</p>
            </a>
          ))}
        </section>
      )}
      <div className="home-links">
        <button onClick={() => nav('favoris')}>
          <Bookmark size={18} />
          {favorites.length
            ? `${favorites.length} favori${favorites.length > 1 ? 's' : ''} enregistré${favorites.length > 1 ? 's' : ''}`
            : 'Vos premiers favoris vous attendent'}
          <ChevronRight size={16} />
        </button>
        <button onClick={() => nav('telechargements')}>
          <Download size={18} />
          Votre Bible, même sans réseau
          <ChevronRight size={16} />
        </button>
        <button onClick={() => nav('videos')}>
          <Play size={18} />
          Découvrir les vidéos
          <ChevronRight size={16} />
        </button>
      </div>
    </>
  )
}
function More({ nav }: { nav: Navigate }) {
  return (
    <>
      <PageHeading
        eyebrow="PRENDRE LE TEMPS D’EXPLORER"
        title="Tout votre univers de foi"
      />
      <div className="more-grid">
        {[
          ['enseignements', 'Enseignements', GraduationCap],
          ['musique', 'Musique chrétienne', Music2],
          ['videos', 'Vidéos', Play],
          ['enfants', 'Espace enfants', Baby],
          ['favoris', 'Favoris', Bookmark],
          ['historique', 'Historique de lecture', BookOpen],
          ['telechargements', 'Téléchargements hors ligne', Download],
          ['messages', 'Messagerie privée', MessagesSquare],
          ['notifications', 'Notifications', Bell],
          ['profil', 'Profil', Users],
          ['parametres', 'Paramètres', Settings],
          ['premium', 'Premium', ShieldCheck],
          ['aide', 'Aide', Heart],
          ['createur', 'Espace créateur', ShieldCheck],
        ].map(([id, label, Icon]) => {
          const I = Icon as typeof Heart
          return (
            <button
              className="panel row"
              key={String(id)}
              onClick={() => nav(String(id))}
            >
              <I size={22} />
              <span>{String(label)}</span>
              <ChevronRight size={19} />
            </button>
          )
        })}
      </div>
    </>
  )
}
function PrayerPage() {
  const [theme, setTheme] = useState('Paix')
  const prayers: Record<string, string> = {
    Paix: 'Seigneur, apaise mon cœur. Aide-moi à agir avec douceur, même lorsque tout m’inquiète. Que ta paix oriente mes décisions.',
    Gratitude:
      'Seigneur, merci pour la vie reçue aujourd’hui. Ouvre mes yeux aux gestes simples et apprends-moi à donner à mon tour.',
    Famille:
      'Seigneur, veille sur nos familles. Aide-nous à écouter, à pardonner et à prendre soin les uns des autres.',
    Espérance:
      'Seigneur, soutiens mon espérance dans les jours difficiles. Donne-moi la force de faire le prochain pas.',
  }
  return (
    <>
      <PageHeading
        eyebrow="UN CŒUR À CŒUR AVEC DIEU"
        title="Prières & méditations"
      />
      <div className="chips">
        {Object.keys(prayers).map((t) => (
          <button
            className={t === theme ? 'selected' : ''}
            onClick={() => setTheme(t)}
            key={t}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="bottom-grid">
        <article className="panel prayer-content">
          <Heart size={26} />
          <h2>Une prière pour la {theme.toLowerCase()}</h2>
          <p>{prayers[theme]}</p>
          <small>
            Prière originale proposée par l’application, sans attribution
            biblique.
          </small>
          <h3>Un pas pour aujourd’hui</h3>
          <p>
            Lisez Psaumes 23, puis notez une chose que vous voulez confier à
            Dieu. Ces textes sont inclus dans l’application.
          </p>
        </article>
        <Journal />
      </div>
    </>
  )
}
function MusicPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Toutes')
  return (
    <>
      <PageHeading
        eyebrow="UNE SÉLECTION CHRÉTIENNE, SANS COMPROMIS"
        title="La foi en musique"
      />
      <div className="search-field">
        <Search size={20} />
        <input
          aria-label="Rechercher un titre chrétien vérifié"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher dans le catalogue chrétien vérifié…"
        />
      </div>
      <div className="chips">
        {[
          'Toutes',
          'Louange',
          'Adoration',
          'Gospel francophone',
          'Gospel africain',
          'Chrétienne ivoirienne',
          'Hymnes',
          'Instrumentale',
          'Prière',
          'Enfants',
          'Nouveautés',
          'Artistes',
          'Albums',
        ].map((c) => (
          <button
            key={c}
            className={category === c ? 'selected' : ''}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="artist panel">
        <div className="artist-monogram">DO</div>
        <div>
          <span className="eyebrow gold">ARTISTE À DÉCOUVRIR</span>
          <h2>David Okit</h2>
          <p>Catalogue en cours de vérification</p>
          <small>
            Aucun titre ni lien d’écoute n’est publié avant validation des
            sources officielles et des droits.
          </small>
        </div>
      </div>
      <Empty text="Aucun titre chrétien vérifié trouvé" />
      <p className="quiet">
        La recherche porte exclusivement sur les titres vérifiés. Aucun morceau
        n’est actuellement publié. Aucun téléchargement musical n’est proposé
        sans autorisation.
      </p>
    </>
  )
}
function Studies({ nav }: { nav: Navigate }) {
  return (
    <>
      <PageHeading
        eyebrow="COMPRENDRE ET METTRE EN PRATIQUE"
        title="Grandir dans la Parole"
      />
      <div className="list-grid">
        {[
          [
            'Découvrir Jésus',
            'Jean',
            'Lire un chapitre par jour de l’Évangile de Jean. Notez ce que Jésus dit et fait.',
          ],
          [
            'La confiance au quotidien',
            'Psaumes 23',
            'Lisez le psaume. Quelles images expriment la présence de Dieu ?',
          ],
          [
            'Aimer son prochain',
            'Luc 10:25–37',
            'Lisez la parabole du Samaritain. Quel geste concret pouvez-vous poser aujourd’hui ?',
          ],
        ].map(([title, ref, text]) => (
          <article className="panel" key={title}>
            <span className="eyebrow gold">PARCOURS DE LECTURE · {ref}</span>
            <h2>{title}</h2>
            <p>{text}</p>
            <small>
              Guide original de l’application. Le lecteur permet de choisir le
              passage indiqué.
            </small>
            <button className="text-button" onClick={() => nav('bible')}>
              Ouvrir la Bible <ArrowRight size={17} />
            </button>
          </article>
        ))}
      </div>
    </>
  )
}
function Kids() {
  const [answer, setAnswer] = useState('')
  return (
    <>
      <PageHeading
        eyebrow="À DÉCOUVRIR AVEC UN ADULTE"
        title="Les petits dans la foi"
      />
      <article className="panel reading-panel">
        <Baby size={32} />
        <h2>Prendre soin de son prochain</h2>
        <p>
          Dans Luc 10:25–37, Jésus raconte qu’un homme blessé reçoit l’aide d’un
          Samaritain. Cette histoire nous invite à aider avec bonté.
        </p>
        <small>
          Résumé original de l’application. À lire et à discuter avec un parent
          ; aucune certification pédagogique n’est revendiquée.
        </small>
        <h3>Qui s’arrête pour aider l’homme blessé ?</h3>
        <div className="button-row">
          {['Le Samaritain', 'Personne', 'Un marchand'].map((a) => (
            <button className="button" key={a} onClick={() => setAnswer(a)}>
              {a}
            </button>
          ))}
        </div>
        {answer && (
          <p role="status">
            {answer === 'Le Samaritain'
              ? 'Oui ! Le Samaritain prend soin de lui.'
              : 'Relisons ensemble Luc 10:33–35.'}
          </p>
        )}
        <h3>Une prière toute simple</h3>
        <p>
          Seigneur, aide-moi à voir ceux qui ont besoin de moi et à leur faire
          du bien. Amen.
        </p>
        <small>Aucun compte enfant ni collecte de réponses au quiz.</small>
      </article>
    </>
  )
}
function Premium() {
  return (
    <>
      <PageHeading
        eyebrow="SOUTENIR LE PROJET"
        title="Une foi accessible à tous"
      />
      <div className="bottom-grid">
        {[
          ['Mensuel', '2 000 FCFA', 'par mois'],
          ['Annuel', '15 000 FCFA', 'par an'],
        ].map(([t, p, d]) => (
          <article className="panel premium-card" key={t}>
            <span className="eyebrow gold">{t}</span>
            <h2>{p}</h2>
            <p>{d}</p>
            <p>
              Offre envisagée. L’abonnement et les avantages Premium ne sont pas
              encore activés.
            </p>
            <span className="mini-badge">Paiements non disponibles</span>
          </article>
        ))}
      </div>
      <p>
        Wave et Orange Money nécessitent une intégration officielle ou une
        vérification manuelle documentée. Aucun paiement ni justificatif n’est
        collecté ici et aucun accès Premium n’est accordé automatiquement.
      </p>
    </>
  )
}
function Help() {
  return (
    <>
      <PageHeading
        eyebrow="EN TOUTE TRANSPARENCE"
        title="Aide & informations"
      />
      <div className="panel reading-panel">
        <h2>Lire sans réseau</h2>
        <p>
          Ouvrez « Plus → Téléchargements hors ligne » et téléchargez les 66
          livres. IndexedDB conserve le texte, les favoris, les surlignages et
          le journal. L’ouverture de l’application dépend aussi de la
          préparation du service worker ; ce fonctionnement reste à tester sur
          votre appareil. Le navigateur peut effacer les données, notamment en
          navigation privée. Exportez votre journal pour en garder une copie.
        </p>
        <h2>Une traduction historique</h2>
        <p>
          David Martin 1744, domaine public. Le texte n’a pas été modernisé.
          Source : Scrollmapper, module FreBDM1744 ; statut consulté auprès de
          CrossWire.
        </p>
        <a href="/data/SOURCES.md" target="_blank" rel="noreferrer">
          Sources et licence de la Bible <ArrowUpRight size={15} />
        </a>
        <h2>Confidentialité et modération</h2>
        <p>
          Le journal est local et privé par défaut. La communauté est visible
          aux membres connectés. Les messages privés sont réservés à leurs
          participants ; ils ne sont pas chiffrés de bout en bout. Vous pouvez
          bloquer ou signaler depuis la messagerie. Aucun envoi n’est confirmé
          avant la réponse du serveur.
        </p>
        <h2>L’assistant IA</h2>
        <p>
          Le Conseiller nécessite Internet et un compte. Dix questions par jour
          UTC et par compte ; un essai envoyé au fournisseur compte dans ce
          quota, même si le fournisseur échoue. Les réponses peuvent contenir
          des erreurs : vérifiez les références dans la Bible. Chaque question
          est traitée indépendamment, l’historique affiché reste local.
        </p>
        <h2>Android</h2>
        <p>
          Cette version est une application web. Aucun APK n’est fourni à ce
          stade. La préparation et les limites Android sont documentées dans le
          projet.
        </p>
      </div>
    </>
  )
}
