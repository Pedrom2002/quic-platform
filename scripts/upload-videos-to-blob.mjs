import { put } from '@vercel/blob'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import 'dotenv/config'

const PUBLIC_DIR = join(process.cwd(), 'public')

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN missing')

  const files = (await readdir(PUBLIC_DIR)).filter(f => f.endsWith('.mp4'))
  const uploaded = []
  for (const file of files) {
    const buf = await readFile(join(PUBLIC_DIR, file))
    const blob = await put(file, buf, {
      access: 'public',
      contentType: 'video/mp4',
      token,
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    console.log(`${file} -> ${blob.url}`)
    uploaded.push({ file, url: blob.url })
  }
  console.log('\n--- AVAILABLE_VIDEOS ---')
  uploaded.forEach((u, i) => {
    const id = u.file.replace(/\.mp4$/, '').replace(/[^a-z0-9]/gi, '-')
    console.log(`  { id: '${id}', label: 'Vídeo ${i + 1}', url: '${u.url}' },`)
  })
}

main().catch(e => { console.error(e); process.exit(1) })
