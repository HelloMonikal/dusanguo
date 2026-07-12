/**
 * 书籍数据包校验（schema v1，规范见 docs/schema.md）
 * 检查项：结构完整性、段落 id 唯一、实体 span 越界/重叠、
 * 注释锚点越界、注释层引用存在、toc 章节引用存在、缺失翻译
 * 用法：node scripts/validate.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const DATA = path.join(ROOT, 'public/data')

let errors = 0
let warnings = 0
const err = (msg) => {
  errors++
  console.error(`  ✗ ${msg}`)
}
const warn = (msg) => {
  warnings++
  console.warn(`  ! ${msg}`)
}

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

const books = readJson(path.join(DATA, 'books.json'))
if (!Array.isArray(books) || books.length === 0) {
  err('books.json 应为非空数组')
}

for (const entry of books) {
  console.log(`\n校验书籍：${entry.id}`)
  const bookDir = path.join(DATA, entry.id)
  for (const key of ['id', 'title', 'author', 'dynasty']) {
    if (typeof entry[key] !== 'string' || !entry[key]) err(`books.json[${entry.id}].${key} 缺失`)
  }

  const config = readJson(path.join(bookDir, 'book.json'))
  if (config.schemaVersion !== 1) err(`book.json schemaVersion 应为 1，实际 ${config.schemaVersion}`)
  if (config.id !== entry.id) err(`book.json.id (${config.id}) 与书目索引 (${entry.id}) 不一致`)
  const layerIds = new Set((config.annotationLayers ?? []).map((l) => l.id))

  const toc = readJson(path.join(bookDir, 'toc.json'))
  const tocChapterIds = []
  const tocNodeIds = new Set()
  const walk = (nodes) => {
    for (const node of nodes) {
      if (!node.id) err(`toc 节点缺 id（title=${node.title}）`)
      if (tocNodeIds.has(node.id)) err(`toc 节点 id 重复：${node.id}`)
      tocNodeIds.add(node.id)
      if (node.chapterId) tocChapterIds.push(node.chapterId)
      if (node.children) walk(node.children)
    }
  }
  walk(toc)

  const chapterFiles = existsSync(path.join(bookDir, 'chapters'))
    ? readdirSync(path.join(bookDir, 'chapters')).filter((f) => f.endsWith('.json'))
    : []
  const chapterIds = new Set(chapterFiles.map((f) => f.replace(/\.json$/, '')))

  for (const cid of tocChapterIds) {
    if (!chapterIds.has(cid)) err(`toc 引用的章节不存在：${cid}`)
  }
  for (const cid of chapterIds) {
    if (!tocChapterIds.includes(cid)) warn(`章节未在 toc 中引用：${cid}`)
  }

  const seenParagraphIds = new Set()
  for (const file of chapterFiles) {
    const chapter = readJson(path.join(bookDir, 'chapters', file))
    const cid = file.replace(/\.json$/, '')
    if (chapter.id !== cid) err(`${file}: chapter.id (${chapter.id}) 与文件名不一致`)
    if (!chapter.title) err(`${file}: 缺 title`)
    if (!Array.isArray(chapter.paragraphs) || chapter.paragraphs.length === 0) {
      err(`${file}: paragraphs 应为非空数组`)
      continue
    }
    let missingTranslation = 0
    for (const p of chapter.paragraphs) {
      const where = `${file}#${p.id}`
      if (!p.id) err(`${file}: 存在缺 id 的段落`)
      if (seenParagraphIds.has(p.id)) err(`段落 id 重复：${p.id}`)
      seenParagraphIds.add(p.id)
      if (typeof p.original !== 'string' || p.original.length === 0) err(`${where}: original 为空`)
      if (!p.translation) missingTranslation++

      const len = p.original.length
      const spans = []
      for (const e of p.entities ?? []) {
        const [s, t] = e.span
        if (!(s >= 0 && t <= len && s < t)) err(`${where}: 实体 ${e.name} span [${s},${t}) 越界（原文长 ${len}）`)
        else if (p.original.slice(s, t) !== e.name) err(`${where}: 实体 span 文字与 name 不符（${e.name}）`)
        spans.push([s, t, e.name])
      }
      spans.sort((a, b) => a[0] - b[0])
      for (let i = 1; i < spans.length; i++) {
        if (spans[i][0] < spans[i - 1][1]) err(`${where}: 实体重叠 ${spans[i - 1][2]} / ${spans[i][2]}`)
      }

      for (const a of p.annotations ?? []) {
        const [s, t] = a.anchor
        if (!(s >= 0 && t <= len && s <= t)) err(`${where}: 注释锚点 [${s},${t}] 越界（原文长 ${len}）`)
        if (!layerIds.has(a.layer)) err(`${where}: 注释层未在 book.json 声明：${a.layer}`)
        if (!a.text) err(`${where}: 注释缺 text`)
      }
    }
    if (missingTranslation > 0) warn(`${file}: ${missingTranslation} 段缺白话翻译`)
    console.log(`  ${file}: ${chapter.paragraphs.length} 段 ✓`)
  }
}

console.log(`\n校验完成：${errors} 个错误，${warnings} 个警告`)
if (errors > 0) process.exit(1)
