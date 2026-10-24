import { getUser, admin } from '@netlify/identity'
import { getDatabase } from '@netlify/database'
import OpenAI from 'openai'
import { and, eq, or, desc } from 'drizzle-orm'
import { db } from '../../db/index.js'
import {
  posts,
  messages,
  blocks,
  reports,
  sanctions,
  moderation,
} from '../../db/schema.js'
import { z } from 'zod'
const input = z.object({
  action: z.enum([
    'community',
    'post',
    'messages',
    'send',
    'block',
    'unblock',
    'blocks',
    'report',
    'chat',
    'reports',
    'sanction',
    'unsanction',
    'deletePost',
    'deleteAccount',
  ]),
  body: z.string().trim().min(1).max(4000).optional(),
  target: z.string().min(1).max(200).optional(),
  parent: z.string().uuid().optional(),
})
const uuid = z.string().uuid()
function fail(message: string, status = 400): never {
  throw Response.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  )
}
export default async (req: Request) => {
  try {
    if (req.method !== 'POST')
      return new Response('Méthode non autorisée', { status: 405 })
    if (req.headers.get('origin') !== new URL(req.url).origin)
      fail('Origine non autorisée', 403)
    if (Number(req.headers.get('content-length')) > 12000)
      fail('Requête trop volumineuse', 413)
    const raw = await req.text()
    if (raw.length > 12000) fail('Requête trop volumineuse', 413)
    const data = input.parse(JSON.parse(raw))
    const user = await getUser()
    if (!user) fail('Connectez-vous pour utiliser ce service.', 401)
    const isAdmin = user.roles?.includes('admin') ?? false
    const sql = getDatabase().sql
    const requestMinute = 'requests:' + new Date().toISOString().slice(0, 16)
    const requestAllowed =
      await sql`INSERT INTO quotas (user_id,day,count) VALUES (${user.id},${requestMinute},1) ON CONFLICT (user_id,day) DO UPDATE SET count=quotas.count+1 WHERE quotas.count<120 RETURNING count`
    if (!requestAllowed.length)
      fail('Trop de requêtes. Réessayez dans une minute.', 429)
    const reply = (value: unknown) =>
      Response.json(value, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    if (data.action === 'reports') {
      if (!isAdmin) fail('Accès réservé à la modération', 403)
      return reply({
        reports: await db
          .select()
          .from(reports)
          .orderBy(desc(reports.createdAt))
          .limit(100),
        decisions: await db
          .select()
          .from(moderation)
          .orderBy(desc(moderation.createdAt))
          .limit(100),
      })
    }
    if (['sanction', 'unsanction', 'deletePost'].includes(data.action)) {
      if (!isAdmin) fail('Accès réservé à la modération', 403)
      if (!data.target || !data.body) fail('Cible et motif obligatoires')
      await db.transaction(async (tx) => {
        if (data.action === 'sanction')
          await tx
            .insert(sanctions)
            .values({ userId: uuid.parse(data.target), reason: data.body! })
            .onConflictDoUpdate({
              target: sanctions.userId,
              set: { reason: data.body! },
            })
        if (data.action === 'unsanction')
          await tx.delete(sanctions).where(eq(sanctions.userId, data.target!))
        if (data.action === 'deletePost')
          await tx.delete(posts).where(eq(posts.id, uuid.parse(data.target)))
        await tx
          .insert(moderation)
          .values({
            adminId: user.id,
            target: data.target!,
            decision: data.action + ': ' + data.body,
          })
      })
      return reply({ ok: true })
    }
    if (data.action === 'deleteAccount') {
      await db.transaction(async (tx) => {
        await tx
          .delete(messages)
          .where(
            or(eq(messages.sender, user.id), eq(messages.recipient, user.id)),
          )
        await tx.delete(posts).where(eq(posts.userId, user.id))
        await tx
          .delete(blocks)
          .where(or(eq(blocks.owner, user.id), eq(blocks.target, user.id)))
        await tx.delete(reports).where(eq(reports.userId, user.id))
      })
      await sql`DELETE FROM quotas WHERE user_id=${user.id}`
      await admin.deleteUser(user.id)
      return reply({ ok: true })
    }
    if (data.action === 'community')
      return reply(
        await db.select().from(posts).orderBy(desc(posts.createdAt)).limit(100),
      )
    if (data.action === 'blocks')
      return reply(
        await db
          .select({ target: blocks.target })
          .from(blocks)
          .where(eq(blocks.owner, user.id)),
      )
    if (data.action === 'messages') {
      const target = uuid.parse(data.target)
      return reply(
        await db
          .select()
          .from(messages)
          .where(
            or(
              and(eq(messages.sender, user.id), eq(messages.recipient, target)),
              and(eq(messages.sender, target), eq(messages.recipient, user.id)),
            ),
          )
          .orderBy(desc(messages.createdAt))
          .limit(100),
      )
    }
    const banned = await db
      .select()
      .from(sanctions)
      .where(eq(sanctions.userId, user.id))
    if (banned.length)
      fail(
        'Votre compte est suspendu pour les publications et les envois. Contactez la modération.',
        403,
      )
    const day = new Date().toISOString().slice(0, 10)
    if (data.action === 'chat') {
      if (!data.body) fail('Écrivez une question')
      const allowed =
        await sql`INSERT INTO quotas (user_id,day,count) VALUES (${user.id},${day},1) ON CONFLICT (user_id,day) DO UPDATE SET count=quotas.count+1 WHERE quotas.count<10 RETURNING count`
      if (!allowed.length)
        fail(
          'Vos 10 questions du jour ont été utilisées. Revenez demain (UTC).',
          429,
        )
      const response = await new OpenAI({
        timeout: 45000,
        maxRetries: 0,
      }).chat.completions.create({
        model: 'gpt-4.1-mini',
        max_tokens: 1200,
        messages: [
          {
            role: 'system',
            content:
              'Tu es Le Conseiller de Bible Chrétienne Moderne. Réponds en français, avec prudence et bienveillance. N’invente aucun verset. Distingue interprétation, prière proposée et citation. Donne des références sous la forme Jean 3:16, Psaumes 23:1, sans inventer de liens. Ne prétends pas consulter des sources en direct. Les textes affichés sont David Martin 1744. Pour une question médicale ou un danger immédiat conseille une aide humaine compétente. Aucune autorité divine revendiquée.',
          },
          { role: 'user', content: data.body },
        ],
      })
      return reply({
        answer: response.choices[0]?.message.content || 'Aucune réponse reçue.',
        used: allowed[0].count,
      })
    }
    const minute = 'rate:' + new Date().toISOString().slice(0, 16)
    const allowed =
      await sql`INSERT INTO quotas (user_id,day,count) VALUES (${user.id},${minute},1) ON CONFLICT (user_id,day) DO UPDATE SET count=quotas.count+1 WHERE quotas.count<10 RETURNING count`
    if (!allowed.length)
      fail('Trop de demandes. Réessayez dans une minute.', 429)
    if (data.action === 'block' || data.action === 'unblock') {
      const target = uuid.parse(data.target)
      if (target === user.id) fail('Choisissez un autre compte')
      if (data.action === 'block')
        await db
          .insert(blocks)
          .values({ owner: user.id, target })
          .onConflictDoNothing()
      else
        await db
          .delete(blocks)
          .where(and(eq(blocks.owner, user.id), eq(blocks.target, target)))
      return reply({ ok: true })
    }
    if (data.action === 'report') {
      if (!data.target || !data.body) fail('Cible et motif obligatoires')
      await db
        .insert(reports)
        .values({ userId: user.id, target: data.target, reason: data.body })
      return reply({ ok: true })
    }
    if (!data.body) fail('Le message est vide')
    if (/https?:|www\.|\b(?:t\.me|bit\.ly|wa\.me)\b/i.test(data.body))
      fail(
        'Les liens ne sont pas autorisés dans les publications et messages pour le moment.',
      )
    if (data.action === 'post') {
      if (data.parent) {
        const parent = await db
          .select()
          .from(posts)
          .where(eq(posts.id, data.parent))
        if (!parent.length) fail('Publication introuvable', 404)
      }
      const [post] = await db
        .insert(posts)
        .values({ userId: user.id, body: data.body, parentId: data.parent })
        .returning()
      return reply(post)
    }
    if (data.action === 'send') {
      const target = uuid.parse(data.target)
      if (target === user.id) fail('Choisissez un autre destinataire')
      const blocked = await db
        .select()
        .from(blocks)
        .where(
          or(
            and(eq(blocks.owner, user.id), eq(blocks.target, target)),
            and(eq(blocks.owner, target), eq(blocks.target, user.id)),
          ),
        )
      if (blocked.length)
        fail('Conversation indisponible : un blocage est actif.', 403)
      try {
        await admin.getUser(target)
      } catch {
        fail('Destinataire indisponible', 404)
      }
      const messageDay = 'messages:' + day
      const dailyAllowed =
        await sql`INSERT INTO quotas (user_id,day,count) VALUES (${user.id},${messageDay},1) ON CONFLICT (user_id,day) DO UPDATE SET count=quotas.count+1 WHERE quotas.count<100 RETURNING count`
      if (!dailyAllowed.length)
        fail('Limite quotidienne de messages atteinte', 429)
      const [message] = await db
        .insert(messages)
        .values({ sender: user.id, recipient: target, body: data.body })
        .returning()
      return reply(message)
    }
    fail('Action inconnue')
  } catch (e) {
    if (e instanceof Response) return e
    if (e instanceof z.ZodError || e instanceof SyntaxError)
      return Response.json(
        { error: 'Vérifiez les informations saisies.' },
        { status: 400 },
      )
    return Response.json(
      {
        error:
          'Le service est momentanément indisponible. Votre demande n’est pas confirmée.',
      },
      { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }
}
export const config = { path: '/api/service' }
