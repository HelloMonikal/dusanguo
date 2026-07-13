/**
 * 按 sources/chapters.config.json 从维基文库抓取原始 wikitext
 * 到 sources/wikisource/<chapterId>.txt。已存在则跳过（--force 重抓）。
 * 用法：node scripts/ingest/fetch_wikisource.mjs [chapterId...] [--force]
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const OUT_DIR = path.join(ROOT, 'sources/wikisource')

const args = process.argv.slice(2)
const force = args.includes('--force')
const only = args.filter((a) => !a.startsWith('--'))

const chapters = JSON.parse(
  readFileSync(path.join(ROOT, 'sources/chapters.config.json'), 'utf8'),
)

mkdirSync(OUT_DIR, { recursive: true })

for (const cfg of chapters) {
  if (only.length && !only.includes(cfg.chapterId)) continue
  const dest = path.join(OUT_DIR, `${cfg.chapterId}.txt`)
  if (!force && existsSync(dest)) {
    console.log(`跳过 ${cfg.chapterId}（已存在）`)
    continue
  }
  const url = `https://zh.wikisource.org/wiki/${encodeURIComponent(cfg.wikisourcePage)}?action=raw`
  console.log(`抓取 ${cfg.chapterId} ← ${cfg.wikisourcePage}`)
  execFileSync('curl', ['-sfL', '--noproxy', '*', url, '-o', dest], { stdio: 'inherit' })
  const size = statSync(dest).size
  if (size < 1000) throw new Error(`${cfg.chapterId} 抓取结果异常（仅 ${size} 字节）`)
  console.log(`  ✓ ${(size / 1024).toFixed(0)} KB`)
}
