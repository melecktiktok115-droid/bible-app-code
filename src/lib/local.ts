import { openDB } from 'idb'
export type Book = { name: string; chapters: string[][] }
export type Saved = {
  ref: string
  text: string
  color?: string
  book: number
  chapter: number
  verse: number
}
export type Reading = { book: number; chapter: number }
const database = () =>
  openDB('meleck-bible', 1, {
    upgrade(db) {
      db.createObjectStore('personal')
      db.createObjectStore('downloads')
    },
  })
export async function readLocal<T>(key: string, fallback: T): Promise<T> {
  const db = await database()
  return (await db.get('personal', key)) ?? fallback
}
export async function writeLocal(key: string, value: unknown) {
  const db = await database()
  await db.put('personal', value, key)
}
export async function loadBible(): Promise<Book[]> {
  try {
    const db = await database()
    const local = await db.get('downloads', 'bible')
    if (local) return local
  } catch {
    // Reading online remains possible when the browser refuses local storage.
  }
  const r = await fetch('/data/bible.json')
  if (!r.ok)
    throw new Error(
      'Le texte biblique est indisponible. Téléchargez-le lorsque vous êtes en ligne.',
    )
  return r.json()
}
export async function downloadBible(progress: (n: number) => void) {
  const r = await fetch('/data/bible.json')
  if (!r.ok || !r.body) throw new Error('Téléchargement indisponible')
  const total = Number(r.headers.get('content-length')) || 5000000
  const reader = r.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.length
    progress(Math.min(95, Math.round((size / total) * 100)))
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }
  const bible = JSON.parse(new TextDecoder().decode(bytes))
  if (!Array.isArray(bible) || bible.length !== 66)
    throw new Error('Téléchargement incomplet')
  const db = await database()
  await db.put('downloads', bible, 'bible')
  await db.put('personal', size, 'bibleBytes')
  progress(100)
  try {
    await navigator.storage?.persist?.()
  } catch {
    /* The text is already saved; persistence is best effort. */
  }
  return size
}
export async function removeBible() {
  const db = await database()
  await db.delete('downloads', 'bible')
  await db.delete('personal', 'bibleBytes')
}
