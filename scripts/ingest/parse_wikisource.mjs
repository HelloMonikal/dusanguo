/**
 * 维基文库 wikitext → 书籍数据包章节 JSON（导入管线雏形）
 *
 * 处理内容：
 * - 去掉 {{header}}、__FORCETOC__、<onlyinclude>、== 标题 ==、HTML 注释
 * - 括号感知全文扫描：深度 0 的换行为分段点；{{*|…}}（可跨行）为行内注释
 *   （裴注），记录其在正文中的字符锚点
 * - [[A|B]] → B，[[A]] → A，{{YL|显示|年份}} → 显示，其余模板丢弃
 * - 实体：按词典（sources/entities/<book>.json）在原文中自动匹配区间
 * - 翻译：从 sources/translations/<chapterId>.json（段序号 → 白话）合入
 *
 * 用法：node scripts/ingest/parse_wikisource.mjs [--draft]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')

/** 章节配置：range 为保留的段落区间 [start, end)，null 表示全部 */
const CHAPTERS = [
  {
    book: 'sanguozhi',
    chapterId: 'wei-01',
    title: '魏書一·武帝紀（節選）',
    source: 'sanguozhi01.txt',
    range: [0, 12],
  },
  {
    book: 'sanguozhi',
    chapterId: 'shu-05',
    title: '蜀書五·諸葛亮傳',
    source: 'sanguozhi35.txt',
    range: null,
  },
]

/** 清理链接与行内标记（模板已在扫描阶段处理） */
function cleanInline(text) {
  return text
    .replace(/\[\[[Cc]ategory:[^\]]*\]\]/g, '')
    .replace(/\[\[(?:[^\][|]*\|)?([^\][]*)\]\]/g, '$1')
    .replace(/<\/?(?:u|blockquote|onlyinclude|poem)>/g, '')
    .replace(/'''?/g, '')
    .replace(/^[　\s]+|[　\s]+$/g, '')
}

/** 从 text[open] 的 "{{" 起找到配对 "}}" 的结束位置（含），支持嵌套 */
function findTemplateEnd(text, open) {
  let depth = 0
  for (let i = open; i < text.length - 1; i++) {
    if (text[i] === '{' && text[i + 1] === '{') {
      depth++
      i++
    } else if (text[i] === '}' && text[i + 1] === '}') {
      depth--
      i++
      if (depth === 0) return i + 1
    }
  }
  return -1
}

/**
 * 全文扫描：深度 0 的换行分段；{{*|…}} 成为注释并锚定当前正文位置。
 * 返回 [{ original, annotations }]
 */
function parseDocument(raw) {
  const text = raw
    .replace(/^\{\{header[\s\S]*?\n\}\}\n/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^==.*==$/gm, '')
    .replace(/^__\w+__$/gm, '')

  const paragraphs = []
  let buf = '' // 当前段原文（未 cleanInline）
  let annotations = []

  const flush = () => {
    // 先记录注释锚点相对 cleanInline 的偏移：对锚点前缀分别清理后取长度
    const cleaned = cleanInline(buf)
    const mapped = annotations.map((a) => {
      const prefix = cleanInline(buf.slice(0, a.rawAt))
      const at = Math.min(prefix.length, cleaned.length)
      return { layer: a.layer, anchor: [at, at], text: a.text }
    })
    if (cleaned.length > 0) {
      paragraphs.push({ original: cleaned, annotations: mapped })
    } else if (mapped.length > 0 && paragraphs.length > 0) {
      // 独立成行的注释（如卷末袁子评）：挂到前一段末尾
      const prev = paragraphs[paragraphs.length - 1]
      const end = prev.original.length
      prev.annotations.push(
        ...mapped.map((a) => ({ ...a, anchor: [end, end] })),
      )
    }
    buf = ''
    annotations = []
  }

  let i = 0
  while (i < text.length) {
    if (text.startsWith('{{', i)) {
      const end = findTemplateEnd(text, i)
      if (end === -1) {
        i += 2
        continue
      }
      const body = text.slice(i + 2, end - 2)
      if (body.startsWith('*|')) {
        annotations.push({
          layer: 'peizhu',
          rawAt: buf.length,
          text: cleanInline(body.slice(2).replace(/\n[　\s]*/g, '')),
        })
      } else if (body.startsWith('YL|')) {
        buf += body.slice(3).split('|')[0]
      }
      // 其余模板（PD、Textquality 等）丢弃
      i = end
    } else if (text[i] === '\n') {
      flush()
      i++
    } else {
      buf += text[i]
      i++
    }
  }
  flush()
  return paragraphs
}

/** 实体词典自动标注：长词优先、不重叠 */
function markEntities(original, dict) {
  const found = []
  const sorted = [...dict].sort((a, b) => b.name.length - a.name.length)
  const taken = new Array(original.length).fill(false)
  for (const entry of sorted) {
    let from = 0
    while (true) {
      const at = original.indexOf(entry.name, from)
      if (at === -1) break
      const end = at + entry.name.length
      let overlap = false
      for (let i = at; i < end; i++) if (taken[i]) overlap = true
      if (!overlap) {
        for (let i = at; i < end; i++) taken[i] = true
        const { name, type, birth, death, note } = entry
        const entity = { type, span: [at, end], name }
        if (birth !== undefined) entity.birth = birth
        if (death !== undefined) entity.death = death
        if (note !== undefined) entity.note = note
        found.push(entity)
      }
      from = end
    }
  }
  return found.sort((a, b) => a.span[0] - b.span[0])
}

const draftMode = process.argv.includes('--draft')

for (const cfg of CHAPTERS) {
  const raw = readFileSync(path.join(ROOT, 'sources/wikisource', cfg.source), 'utf8')
  let parsed = parseDocument(raw)
  if (cfg.range) parsed = parsed.slice(cfg.range[0], cfg.range[1])

  const translationsPath = path.join(ROOT, 'sources/translations', `${cfg.chapterId}.json`)
  const translations = existsSync(translationsPath)
    ? JSON.parse(readFileSync(translationsPath, 'utf8'))
    : {}
  const dictPath = path.join(ROOT, 'sources/entities', `${cfg.book}.json`)
  const dict = existsSync(dictPath) ? JSON.parse(readFileSync(dictPath, 'utf8')) : []

  const paragraphs = parsed.map((entry, idx) => {
    const p = {
      id: `${cfg.chapterId}-p${String(idx + 1).padStart(3, '0')}`,
      original: entry.original,
      translation: translations[String(idx + 1)] ?? '',
    }
    if (entry.annotations.length) p.annotations = entry.annotations
    const entities = markEntities(entry.original, dict)
    if (entities.length) p.entities = entities
    return p
  })

  if (draftMode) {
    console.log(`\n===== ${cfg.chapterId} ${cfg.title}（${paragraphs.length} 段）=====`)
    for (const p of paragraphs) {
      console.log(`\n[${p.id}]（注 ${p.annotations?.length ?? 0} 条）`)
      console.log(p.original)
    }
    continue
  }

  const outDir = path.join(ROOT, 'public/data', cfg.book, 'chapters')
  mkdirSync(outDir, { recursive: true })
  const chapter = { id: cfg.chapterId, title: cfg.title, paragraphs }
  writeFileSync(
    path.join(outDir, `${cfg.chapterId}.json`),
    JSON.stringify(chapter, null, 1),
  )
  const missing = paragraphs.filter((p) => !p.translation).length
  console.log(
    `${cfg.chapterId}: ${paragraphs.length} 段，注释 ${paragraphs.reduce((n, p) => n + (p.annotations?.length ?? 0), 0)} 条，缺翻译 ${missing} 段`,
  )
}
