import { useEffect, useState, type FormEvent } from 'react'
import {
  login,
  signup,
  logout,
  requestPasswordRecovery,
  updateUser,
  acceptInvite,
  type User,
} from '@netlify/identity'
import {
  Send,
  Sparkles,
  MessagesSquare,
  ShieldCheck,
  Plus,
  Trash2,
  UserRound,
  Flag,
  Ban,
  ArrowRight,
} from 'lucide-react'
import { PageHeading, Empty, type Navigate } from './bible-app'
import { readLocal, writeLocal } from '@/lib/local'
import { books } from '@/lib/books'
export async function api(action: string, extra: Record<string, unknown> = {}) {
  const r = await fetch('/api/service', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...extra }),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || 'Service indisponible')
  return d
}
export function Account({
  user,
  recover,
  invitation,
  onComplete,
}: {
  user: User | null
  recover: boolean
  invitation: string
  onComplete: () => void
}) {
  const [mode, setMode] = useState('login')
  const [status, setStatus] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') || '')
    const password = String(form.get('password') || '')
    setPending(true)
    setStatus('')
    try {
      if (invitation) {
        await acceptInvite(invitation, password)
        onComplete()
        setStatus('Invitation acceptée.')
      } else if (recover) {
        await updateUser({ password })
        onComplete()
        setStatus('Mot de passe mis à jour.')
      } else if (mode === 'recovery') {
        await requestPasswordRecovery(email)
        setStatus(
          'Si cette adresse est reconnue, un lien de récupération vous est envoyé.',
        )
      } else if (mode === 'signup') {
        const u = await signup(email, password, {
          full_name: String(form.get('name') || ''),
        })
        setStatus(
          u.confirmedAt
            ? 'Compte créé.'
            : 'Consultez votre e-mail pour confirmer votre inscription.',
        )
      } else {
        await login(email, password)
        setStatus('Vous êtes connecté.')
      }
    } catch {
      setStatus(
        'La demande a échoué. Vérifiez vos informations et la disponibilité du service.',
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="VOTRE ESPACE PERSONNEL"
        title={
          recover
            ? 'Choisir un nouveau mot de passe'
            : invitation
              ? 'Accepter votre invitation'
              : user
                ? 'Mon profil'
                : 'Bienvenue parmi nous'
        }
      />
      {user && !recover && !invitation ? (
        <section className="panel account-card">
          <UserRound size={32} />
          <h2>{user.name || 'Mon compte'}</h2>
          <p>{user.email}</p>
          <label>
            Mon identifiant de messagerie
            <input
              readOnly
              value={user.id}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <p className="quiet">
            Partagez cet identifiant uniquement avec les personnes avec qui vous
            souhaitez échanger. Vos rôles sont attribués côté serveur.
          </p>
          <div className="button-row">
            <button
              className="button"
              disabled={pending}
              onClick={async () => {
                try {
                  await logout()
                  setStatus('Déconnexion effectuée.')
                } catch {
                  setStatus('La déconnexion a échoué.')
                }
              }}
            >
              Se déconnecter
            </button>
            <button
              className="button danger"
              disabled={pending}
              onClick={async () => {
                if (
                  !confirm(
                    'Supprimer définitivement votre compte et vos messages serveur ? Les notes locales restent sur cet appareil.',
                  )
                )
                  return
                setPending(true)
                try {
                  await api('deleteAccount')
                  await logout()
                  setStatus('Compte supprimé.')
                } catch (e) {
                  setStatus(
                    e instanceof Error ? e.message : 'Suppression impossible.',
                  )
                } finally {
                  setPending(false)
                }
              }}
            >
              Supprimer mon compte
            </button>
          </div>
        </section>
      ) : (
        <form className="panel account-card" onSubmit={submit}>
          <div className="chips">
            {!recover &&
              !invitation &&
              [
                ['login', 'Connexion'],
                ['signup', 'Inscription'],
                ['recovery', 'Mot de passe oublié'],
              ].map(([id, t]) => (
                <button
                  type="button"
                  className={mode === id ? 'selected' : ''}
                  key={id}
                  onClick={() => {
                    setMode(id)
                    setStatus('')
                  }}
                >
                  {t}
                </button>
              ))}
          </div>
          <fieldset disabled={pending}>
            {!recover && !invitation && (
              <>
                {mode === 'signup' && (
                  <label>
                    Votre prénom
                    <input
                      name="name"
                      autoComplete="given-name"
                      required
                      maxLength={80}
                    />
                  </label>
                )}
                <label>
                  Adresse e-mail
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
              </>
            )}
            {(recover || invitation || mode !== 'recovery') && (
              <label>
                Mot de passe
                <input
                  name="password"
                  type="password"
                  minLength={10}
                  maxLength={128}
                  required
                  autoComplete={
                    mode === 'login' && !recover
                      ? 'current-password'
                      : 'new-password'
                  }
                />
              </label>
            )}
            <button className="button gold-button wide" type="submit">
              {pending
                ? 'Demande en cours…'
                : recover
                  ? 'Enregistrer le mot de passe'
                  : invitation
                    ? 'Accepter l’invitation'
                    : mode === 'signup'
                      ? 'Créer mon compte'
                      : mode === 'recovery'
                        ? 'Recevoir un lien'
                        : 'Se connecter'}
              <ArrowRight size={17} />
            </button>
          </fieldset>
          <p className="quiet">
            La connexion nécessite Internet. Ne partagez jamais votre mot de
            passe.
          </p>
        </form>
      )}
      {status && (
        <p className="notice" role="status">
          {status}
        </p>
      )}
    </>
  )
}
type Entry = {
  id: string
  body: string
  userId?: string
  sender?: string
  recipient?: string
  parentId?: string
  createdAt: string
}
type Chat = { role: 'user' | 'assistant'; text: string }
export function Online({
  page,
  user,
  nav,
}: {
  page: string
  user: User | null
  nav: Navigate
}) {
  const [items, setItems] = useState<Entry[]>([])
  const [chat, setChat] = useState<Chat[]>([])
  const [body, setBody] = useState('')
  const [target, setTarget] = useState('')
  const [peer, setPeer] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [parent, setParent] = useState('')
  const [historyReady, setHistoryReady] = useState(false)
  const [blocks, setBlocks] = useState<{ target: string }[]>([])
  const [reportId, setReportId] = useState('')
  const [reason, setReason] = useState('')
  const [reports, setReports] = useState<
    { id: string; target: string; reason: string }[]
  >([])
  const [decisions, setDecisions] = useState<
    { id: string; target: string; decision: string }[]
  >([])
  const title =
    page === 'ia'
      ? 'Le Conseiller'
      : page === 'messages'
        ? 'Messagerie privée'
        : page === 'createur'
          ? 'Espace créateur'
          : 'Ensemble dans la foi'
  useEffect(() => {
    setItems([])
    setError('')
    setBody('')
    setPeer('')
    setTarget('')
    setParent('')
    setChat([])
    setHistoryReady(false)
    if (page === 'ia' && user)
      readLocal<Chat[]>(`chat:${user.id}`, [])
        .then((v) => {
          setChat(v)
          setHistoryReady(true)
        })
        .catch(() => setError('L’historique local est inaccessible.'))
  }, [page, user?.id])
  useEffect(() => {
    if (
      !user ||
      !['communaute', 'messages', 'createur'].includes(page) ||
      (page === 'messages' && !peer)
    )
      return
    let active = true
    async function refresh() {
      try {
        if (page === 'createur') {
          const d = await api('reports')
          if (active) {
            setReports(d.reports)
            setDecisions(d.decisions)
          }
        } else {
          const d = await api(
            page === 'communaute' ? 'community' : 'messages',
            page === 'messages' ? { target: peer } : {},
          )
          if (active) {
            setItems(d)
            setError('')
          }
        }
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : 'Chargement impossible.')
      } finally {
        if (active) setLoading(false)
      }
    }
    setLoading(true)
    refresh()
    const id = setInterval(refresh, 15000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [page, user?.id, peer])
  if (!user)
    return (
      <>
        <PageHeading
          eyebrow={
            page === 'ia' ? 'ASSISTANT BIBLIQUE EN LIGNE' : 'UN ESPACE PROTÉGÉ'
          }
          title={title}
        />
        <div className="panel auth-gate">
          <ShieldCheck size={36} />
          <h2>Un compte pour échanger en confiance.</h2>
          <p>
            {page === 'ia'
              ? 'Posez jusqu’à 10 questions par jour au Conseiller. Les réponses sont générées par un véritable service IA en ligne.'
              : 'Connectez-vous pour accéder aux échanges. Aucune conversation fictive n’est affichée.'}
          </p>
          <button className="button gold-button" onClick={() => nav('profil')}>
            Me connecter <ArrowRight size={18} />
          </button>
        </div>
      </>
    )
  if (page === 'createur' && !user.roles?.includes('admin'))
    return (
      <>
        <PageHeading title={title} />
        <Empty text="Accès réservé au rôle administrateur attribué par le propriétaire dans Netlify Identity. Une adresse e-mail seule n’accorde aucun droit." />
      </>
    )
  async function saveChat(next: Chat[]) {
    setChat(next)
    try {
      await writeLocal(`chat:${user!.id}`, next)
    } catch {
      setError(
        'La réponse est affichée, mais son enregistrement local a échoué.',
      )
    }
  }
  async function send(e: FormEvent) {
    e.preventDefault()
    if (pending || !body.trim()) return
    setError('')
    setPending(true)
    const text = body.trim()
    try {
      if (page === 'ia') {
        const d = await api('chat', { body: text })
        await saveChat([
          ...chat,
          { role: 'user', text },
          { role: 'assistant', text: d.answer },
        ])
        setBody('')
      } else {
        const d = await api(page === 'messages' ? 'send' : 'post', {
          body: text,
          ...(page === 'messages'
            ? { target: peer }
            : parent
              ? { parent }
              : {}),
        })
        setItems((v) => [d, ...v])
        setBody('')
        setParent('')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi non confirmé.')
    } finally {
      setPending(false)
    }
  }
  async function report() {
    if (!reason.trim()) return
    try {
      await api('report', { target: reportId, body: reason })
      setReportId('')
      setReason('')
      setError('Signalement transmis à la modération.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signalement non confirmé.')
    }
  }
  return (
    <>
      <PageHeading
        eyebrow={
          page === 'ia'
            ? 'UN ÉCLAIRAGE POUR VOTRE FOI'
            : page === 'messages'
              ? 'ENTRE VOUS, EN TOUTE SIMPLICITÉ'
              : 'ÉCHANGER AVEC BIENVEILLANCE'
        }
        title={title}
      >
        {page === 'ia' && (
          <button
            className="button"
            disabled={!historyReady || pending}
            onClick={async () => {
              if (
                chat.length &&
                !confirm('Effacer cette conversation de cet appareil ?')
              )
                return
              await saveChat([])
            }}
          >
            <Plus size={17} /> Nouvelle conversation
          </button>
        )}
      </PageHeading>
      {page === 'ia' && (
        <div className="notice">
          <Sparkles size={19} />
          <span>
            Assistant IA en ligne · 10 questions par jour UTC et par compte.
            Vérifiez toujours les références. Chaque question est indépendante ;
            l’historique reste sur cet appareil.
          </span>
        </div>
      )}
      {page === 'communaute' && (
        <div className="notice">
          <ShieldCheck size={19} />
          <span>
            Partagez une intention avec respect. Aucun lien ni donnée
            personnelle sensible. Les publications sont visibles aux membres
            connectés. Les signalements sont examinés par les personnes
            habilitées.
          </span>
        </div>
      )}
      {page === 'messages' && (
        <>
          <form
            className="panel recipient-form"
            onSubmit={(e) => {
              e.preventDefault()
              setPeer(target)
              setItems([])
            }}
          >
            <label>
              Identifiant du destinataire
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Identifiant partagé par votre correspondant"
                required
                pattern="[0-9a-fA-F-]{36}"
              />
            </label>
            <button className="button" type="submit">
              <MessagesSquare size={18} /> Ouvrir la conversation
            </button>
          </form>
          <div className="button-row">
            <button
              className="text-button"
              onClick={async () => {
                try {
                  setBlocks(await api('blocks'))
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : 'Chargement impossible.',
                  )
                }
              }}
            >
              Gérer mes blocages
            </button>
            {peer && (
              <>
                <button
                  className="text-button"
                  onClick={async () => {
                    if (!confirm('Bloquer ce compte ?')) return
                    try {
                      await api('block', { target: peer })
                      setError('Compte bloqué.')
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : 'Blocage impossible.',
                      )
                    }
                  }}
                >
                  <Ban size={16} /> Bloquer
                </button>
                <button
                  className="text-button"
                  onClick={() => setReportId(`user:${peer}`)}
                >
                  <Flag size={16} /> Signaler
                </button>
              </>
            )}
          </div>
          {blocks.map((b) => (
            <div className="panel row" key={b.target}>
              <span>{b.target}</span>
              <button
                onClick={async () => {
                  try {
                    await api('unblock', { target: b.target })
                    setBlocks((v) => v.filter((x) => x.target !== b.target))
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : 'Déblocage impossible.',
                    )
                  }
                }}
              >
                Débloquer
              </button>
            </div>
          ))}
          <p className="quiet">
            Rafraîchissement toutes les 15 secondes. Pas de chiffrement de bout
            en bout ni notification push. Aucun message n’est mis en file
            d’attente hors ligne.
          </p>
        </>
      )}
      {error && (
        <div className="notice" role="status">
          {error}
        </div>
      )}
      {loading && (
        <div className="panel skeleton">Chargement des échanges…</div>
      )}
      {page === 'createur' ? (
        <div className="panel">
          <h2>Signalements</h2>
          {reports.length ? (
            reports.map((r) => (
              <article key={r.id}>
                <p>{r.target}</p>
                <p>{r.reason}</p>
              </article>
            ))
          ) : (
            <p>Aucun signalement reçu.</p>
          )}
          <h2>Décisions de modération</h2>
          {decisions.map((d) => (
            <p key={d.id}>
              {d.target} · {d.decision}
            </p>
          ))}
          <label>
            Identifiant du compte ou de la publication
            <input value={target} onChange={(e) => setTarget(e.target.value)} />
          </label>
          <label>
            Motif de la décision
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="button-row">
            {[
              ['sanction', 'Suspendre'],
              ['unsanction', 'Lever la suspension'],
              ['deletePost', 'Supprimer la publication'],
            ].map(([a, t]) => (
              <button
                className="button"
                key={a}
                onClick={async () => {
                  if (!confirm(`${t} ? Cette décision sera journalisée.`))
                    return
                  try {
                    await api(a, { target, body: reason })
                    setError('Décision enregistrée.')
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : 'Action non confirmée.',
                    )
                  }
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {page === 'ia' ? (
            <div className="conversation">
              <div className="advisor-intro">
                <span className="advisor-icon">
                  <Sparkles size={30} />
                </span>
                <h2>Éclairons ensemble votre lecture.</h2>
                <p>
                  Un verset, une prière, une question sur la foi.
                  <br />
                  Par quoi souhaitez-vous commencer ?
                </p>
                {!chat.length && (
                  <div className="chips">
                    {[
                      'Explique-moi Psaumes 23',
                      'Comment cultiver la gratitude ?',
                      'Aide-moi à préparer une prière',
                    ].map((t) => (
                      <button key={t} onClick={() => setBody(t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {chat.map((m, i) => (
                <article key={i} className={`chat-bubble ${m.role}`}>
                  <strong>
                    {m.role === 'user' ? 'Vous' : 'Le Conseiller · IA'}
                  </strong>
                  <ReferenceText text={m.text} />
                </article>
              ))}
              {pending && (
                <div className="chat-bubble skeleton" role="status">
                  Le Conseiller prépare sa réponse…
                </div>
              )}
            </div>
          ) : (
            <div className="conversation">
              {!items.length && !loading && (
                <Empty
                  text={
                    page === 'messages'
                      ? 'Ouvrez une conversation avec un identifiant partagé. Les messages confirmés apparaissent ici.'
                      : 'Aucune intention publiée. Vous pouvez ouvrir ce premier temps de prière.'
                  }
                />
              )}{' '}
              {items.map((item) => (
                <article
                  className={`chat-bubble ${item.sender === user.id ? 'user' : ''}`}
                  key={item.id}
                >
                  <div className="message-meta">
                    <strong>
                      {item.sender
                        ? item.sender === user.id
                          ? 'Vous'
                          : `Compte ${item.sender.slice(0, 8)}`
                        : `Membre ${item.userId?.slice(0, 8)}`}
                    </strong>
                    <time dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleString('fr-FR')}
                    </time>
                  </div>
                  {item.parentId && (
                    <small>En réponse à {item.parentId.slice(0, 8)}</small>
                  )}
                  <p>{item.body}</p>
                  <div className="button-row">
                    <span className="quiet">Confirmé par le serveur</span>
                    {page === 'communaute' && (
                      <button
                        className="text-button"
                        onClick={() => {
                          setParent(item.id)
                          document.getElementById('message-input')?.focus()
                        }}
                      >
                        Répondre
                      </button>
                    )}
                    <button
                      className="icon-button"
                      aria-label="Signaler ce message"
                      onClick={() =>
                        setReportId(
                          `${page === 'messages' ? 'message' : 'post'}:${item.id}`,
                        )
                      }
                    >
                      <Flag size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {(page !== 'messages' || peer) && (
            <form className="composer panel" onSubmit={send}>
              {parent && (
                <div>
                  Réponse à {parent.slice(0, 8)}{' '}
                  <button type="button" onClick={() => setParent('')}>
                    Annuler
                  </button>
                </div>
              )}
              <label htmlFor="message-input">
                {page === 'ia'
                  ? 'Votre question'
                  : page === 'messages'
                    ? 'Votre message privé'
                    : 'Votre intention de prière'}
              </label>
              <textarea
                id="message-input"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                maxLength={4000}
                rows={3}
                placeholder={
                  page === 'ia'
                    ? 'Écrivez au Conseiller…'
                    : 'Écrivez avec bienveillance…'
                }
              />
              <div className="row">
                <small>
                  {pending
                    ? 'Demande en cours · pas encore confirmée'
                    : 'Votre texte reste dans le champ si l’envoi échoue.'}
                </small>
                <button
                  className="button gold-button"
                  type="submit"
                  disabled={
                    pending || !body.trim() || (page === 'ia' && !historyReady)
                  }
                >
                  <Send size={18} />
                  {pending ? 'En cours…' : 'Envoyer'}
                </button>
              </div>
            </form>
          )}
          {page === 'ia' && chat.length > 0 && (
            <button
              className="text-button danger"
              disabled={pending}
              onClick={async () => {
                if (
                  confirm(
                    'Supprimer l’historique de cette conversation sur cet appareil ?',
                  )
                )
                  await saveChat([])
              }}
            >
              <Trash2 size={16} /> Supprimer l’historique
            </button>
          )}
        </>
      )}
      {reportId && (
        <section className="panel report-form" aria-label="Signalement">
          <h2>Signaler un contenu</h2>
          <label>
            Motif
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={2000}
              required
            />
          </label>
          <div className="button-row">
            <button className="button" onClick={report}>
              Transmettre le signalement
            </button>
            <button className="text-button" onClick={() => setReportId('')}>
              Annuler
            </button>
          </div>
        </section>
      )}
    </>
  )
}
function ReferenceText({ text }: { text: string }) {
  const names = books
    .map((b) => b.name)
    .sort((a, b) => b.length - a.length)
    .join('|')
  const regex = new RegExp(String.raw`((?:${names}) \d+:\d+(?:[–-]\d+)?)`, 'g')
  return (
    <p className="ai-answer">
      {text.split(regex).map((part, i) => {
        const m = part.match(/^(.+) (\d+):(\d+)/)
        const b = m ? books.find((v) => v.name === m[1]) : null
        if (m && b && Number(m[2]) <= b.chapters)
          return (
            <a
              key={i}
              href={`?page=bible&ref=${encodeURIComponent(part.replace(/[–-]\d+$/, ''))}`}
            >
              {part}
            </a>
          )
        return part
      })}
    </p>
  )
}
