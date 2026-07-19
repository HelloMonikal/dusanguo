/**
 * 维基文库 wikitext → 书籍数据包章节 JSON（导入管线雏形）
 *
 * 处理内容：
 * - 去掉 {{header}}、__FORCETOC__、<onlyinclude>、== 标题 ==、HTML 注释
 * - 括号感知全文扫描：深度 0 的换行为分段点；{{*|…}}（可跨行）为行内注释
 *   （裴注），记录其在正文中的字符锚点
 * - [[A|B]] → B，[[A]] → A，{{YL|显示|年份}} → 显示，其余模板丢弃
 * - 实体：按词典（sources/entities/<book>.json）在原文中自动匹配区间；
 *   词典项带 id 时输出 refId，并抽取本名条目（带 bio）生成 persons.json
 * - 翻译：从 sources/translations/<chapterId>.json（段序号 → 白话）合入；
 *   无该文件时由对齐句对的 t 拼接派生段级译文（单一事实源，见 D-009）
 * - 句级对齐（v2）：从 sources/alignments/<chapterId>.json（段序号 → [{o,t}] 句子
 *   字符串对）按顺序子串定位换算为区间，校验拼接完整性，失败即报错
 * - 裴注白话：从 sources/annotations/<chapterId>.json（段序号 → 按注序的白话数组）
 *   合入 Annotation.translation
 * - 章节清单来自 sources/chapters.config.json（enabled 控制是否解析/进 toc）；
 *   toc.json 按配置 tocGroup 自动生成
 * - 扫描全部章节生成 person-index.json（人物出现位置）
 *
 * 用法：node scripts/ingest/parse_wikisource.mjs [--draft [chapterId]]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')

/** 章节配置（sources/chapters.config.json）：range 为保留的段落区间 [start, end) */
const ALL_CHAPTERS = JSON.parse(
  readFileSync(path.join(ROOT, 'sources/chapters.config.json'), 'utf8'),
)

/** 清理链接与行内标记（模板已在扫描阶段处理） */
function cleanInline(text) {
  return text
    .replace(/\[\[[Cc]ategory:[^\]]*\]\]/g, '')
    .replace(/\[\[(?:[^\][|]*\|)?([^\][]*)\]\]/g, '$1')
    .replace(/-\{([^}]*)\}-/g, '$1') // 维基繁简转换标记 -{乾}- → 乾
    .replace(/<\/?(?:u|blockquote|onlyinclude|poem)>/g, '')
    .replace(/'''?/g, '')
    .replace(/^:+/, '') // 维基缩进标记
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
 * 把 {{quote|…}} 模板展开为独立段落（内容原样保留，含嵌套 {{*|}} 裴注）。
 * 用于劝进表、诏策等成篇引文。
 */
function unwrapQuoteTemplates(text) {
  let result = ''
  let i = 0
  while (i < text.length) {
    if (text.startsWith('{{quote|', i)) {
      const end = findTemplateEnd(text, i)
      if (end === -1) break
      const inner = text.slice(i + '{{quote|'.length, end - 2)
      result += '\n' + unwrapQuoteTemplates(inner) + '\n'
      i = end
    } else {
      result += text[i]
      i++
    }
  }
  return result
}

/**
 * 全文扫描：深度 0 的换行分段；{{*|…}} 成为注释并锚定当前正文位置。
 * 返回 [{ original, annotations }]
 */
function parseDocument(raw) {
  const text = unwrapQuoteTemplates(
    raw
      .replace(/^\{\{header[\s\S]*?\n\}\}\n/, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/^==.*==[ \t　]*$/gm, '')
      .replace(/^__\w+__$/gm, ''),
  )

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

/**
 * 句级对齐：句子字符串对 → 字符区间。
 * 每句必须在游标处（允许先跳过空白）与文本精确匹配，保证无错位。
 */
function alignSentences(text, parts, where, label) {
  const spans = []
  let cursor = 0
  for (const [i, part] of parts.entries()) {
    while (cursor < text.length && /\s/.test(text[cursor])) cursor++
    if (!text.startsWith(part, cursor)) {
      throw new Error(
        `${where} ${label} 第 ${i + 1} 句定位失败：\n  期望「${part.slice(0, 40)}…」\n  实际「${text.slice(cursor, cursor + 40)}…」`,
      )
    }
    spans.push([cursor, cursor + part.length])
    cursor += part.length
  }
  while (cursor < text.length && /\s/.test(text[cursor])) cursor++
  if (cursor !== text.length) {
    throw new Error(
      `${where} ${label} 句对未覆盖全文，剩余「${text.slice(cursor, cursor + 40)}…」`,
    )
  }
  return spans
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
        const { name, type, birth, death, note, id } = entry
        const entity = { type, span: [at, end], name }
        if (birth !== undefined) entity.birth = birth
        if (death !== undefined) entity.death = death
        if (note !== undefined) entity.note = note
        if (id !== undefined) entity.refId = id
        found.push(entity)
      }
      from = end
    }
  }
  return found.sort((a, b) => a.span[0] - b.span[0])
}

const argv = process.argv.slice(2)
const draftMode = argv.includes('--draft')
const draftTarget = argv[argv.indexOf('--draft') + 1]?.startsWith?.('--')
  ? undefined
  : argv[argv.indexOf('--draft') + 1]

// 正常模式只处理 enabled 章节；draft 模式可指定任意章节出工作单
const CHAPTERS = draftMode
  ? ALL_CHAPTERS.filter((c) => (draftTarget ? c.chapterId === draftTarget : c.enabled))
  : ALL_CHAPTERS.filter((c) => c.enabled)

if (draftMode && draftTarget && CHAPTERS.length === 0) {
  throw new Error(`chapters.config.json 中没有章节「${draftTarget}」`)
}

/** book id → 已生成章节列表，用于 person-index / persons 输出 */
const bookChapters = new Map()
const bookDicts = new Map()

for (const cfg of CHAPTERS) {
  const sourcePath = path.join(ROOT, 'sources/wikisource', `${cfg.chapterId}.txt`)
  if (!existsSync(sourcePath)) {
    throw new Error(`缺原文 ${sourcePath}，先运行 fetch_wikisource.mjs ${cfg.chapterId}`)
  }
  const raw = readFileSync(sourcePath, 'utf8')
  let parsed = parseDocument(raw)
  if (cfg.range) parsed = parsed.slice(cfg.range[0], cfg.range[1])

  const readSource = (dir) => {
    const p = path.join(ROOT, 'sources', dir, `${cfg.chapterId}.json`)
    return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {}
  }
  const translations = readSource('translations')
  const alignments = readSource('alignments')
  const annotationTranslations = readSource('annotations')
  const dictPath = path.join(ROOT, 'sources/entities', `${cfg.book}.json`)
  const dict = existsSync(dictPath) ? JSON.parse(readFileSync(dictPath, 'utf8')) : []
  bookDicts.set(cfg.book, dict)

  let missingAlignment = 0
  let missingAnnTr = 0
  const paragraphs = parsed.map((entry, idx) => {
    const key = String(idx + 1)
    const pairs = alignments[key]
    const p = {
      id: `${cfg.chapterId}-p${String(idx + 1).padStart(3, '0')}`,
      original: entry.original,
      // 段级译文优先取 translations，缺省时由对齐句对派生（D-009）
      translation: translations[key] ?? (pairs?.length ? pairs.map((s) => s.t).join('') : ''),
    }
    if (entry.annotations.length) {
      const annTr = annotationTranslations[key] ?? []
      p.annotations = entry.annotations.map((a, i) => {
        if (annTr[i]) return { ...a, translation: annTr[i] }
        missingAnnTr++
        return a
      })
    }
    const entities = markEntities(entry.original, dict)
    if (entities.length) p.entities = entities

    if (pairs?.length) {
      const oSpans = alignSentences(p.original, pairs.map((s) => s.o), p.id, '原文')
      const tSpans = alignSentences(p.translation, pairs.map((s) => s.t), p.id, '白话')
      p.sentences = oSpans.map((o, i) => ({ o, t: tSpans[i] }))
    } else {
      missingAlignment++
    }
    return p
  })

  if (draftMode) {
    console.log(`\n===== ${cfg.chapterId} ${cfg.title}（${paragraphs.length} 段）=====`)
    for (const p of paragraphs) {
      const gaps = []
      if (!p.translation) gaps.push('缺翻译')
      if (!p.sentences) gaps.push('缺对齐')
      const annMissing = (p.annotations ?? []).filter((a) => !a.translation).length
      if (annMissing) gaps.push(`裴注缺白话 ${annMissing} 条`)
      console.log(`\n[${p.id}]（注 ${p.annotations?.length ?? 0} 条${gaps.length ? '，' + gaps.join('，') : ''}）`)
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
  if (!bookChapters.has(cfg.book)) bookChapters.set(cfg.book, [])
  bookChapters.get(cfg.book).push(chapter)

  const missing = paragraphs.filter((p) => !p.translation).length
  console.log(
    `${cfg.chapterId}: ${paragraphs.length} 段，注释 ${paragraphs.reduce((n, p) => n + (p.annotations?.length ?? 0), 0)} 条（缺白话 ${missingAnnTr}），缺翻译 ${missing} 段，缺对齐 ${missingAlignment} 段`,
  )
}

// ---------- toc.json（按配置自动生成，仅 enabled 章节；扁平列表 + group 分部） ----------

if (!draftMode) {
  for (const book of bookChapters.keys()) {
    const nodes = ALL_CHAPTERS.filter((cfg) => cfg.book === book && cfg.enabled).map(
      (cfg) => ({
        id: `${cfg.chapterId}-node`,
        // 有分部时条目去掉「部名-」前缀，由 group 承担分部信息（UI 渲染为 tab）
        title:
          cfg.tocGroup && cfg.tocTitle.startsWith(`${cfg.tocGroup}-`)
            ? cfg.tocTitle.slice(cfg.tocGroup.length + 1)
            : cfg.tocTitle,
        chapterId: cfg.chapterId,
        ...(cfg.tocGroup ? { group: cfg.tocGroup } : {}),
      }),
    )
    writeFileSync(
      path.join(ROOT, 'public/data', book, 'toc.json'),
      JSON.stringify(nodes, null, 1),
    )
  }

  // updates.json：书籍更新日志（sources/updates.json 按书分组）
  const updatesPath = path.join(ROOT, 'sources/updates.json')
  if (existsSync(updatesPath)) {
    const updates = JSON.parse(readFileSync(updatesPath, 'utf8'))
    for (const book of bookChapters.keys()) {
      if (updates[book]) {
        writeFileSync(
          path.join(ROOT, 'public/data', book, 'updates.json'),
          JSON.stringify(updates[book], null, 1),
        )
      }
    }
  }
}

// ---------- persons.json 与 person-index.json ----------

for (const [book, chapters] of bookChapters) {
  const dict = bookDicts.get(book) ?? []

  // 人物库：按 id 分组，本名条目（带 bio）为准
  const byId = new Map()
  for (const entry of dict) {
    if (!entry.id) continue
    if (!byId.has(entry.id)) byId.set(entry.id, [])
    byId.get(entry.id).push(entry)
  }
  const persons = []
  for (const [id, entries] of byId) {
    const canonical = entries.filter((e) => e.bio)
    if (canonical.length !== 1) {
      throw new Error(`人物 id「${id}」应恰好有一条带 bio 的本名条目，实际 ${canonical.length} 条`)
    }
    const { name, zi, birth, death, native, bio } = canonical[0]
    const person = { id, name }
    if (zi !== undefined) person.zi = zi
    if (birth !== undefined) person.birth = birth
    if (death !== undefined) person.death = death
    if (native !== undefined) person.native = native
    person.bio = bio
    persons.push(person)
  }
  writeFileSync(
    path.join(ROOT, 'public/data', book, 'persons.json'),
    JSON.stringify(persons, null, 1),
  )

  // 出现位置索引：每人每段最多一条
  const index = {}
  for (const chapter of chapters) {
    for (const p of chapter.paragraphs) {
      const seen = new Set()
      for (const e of p.entities ?? []) {
        if (!e.refId || seen.has(e.refId)) continue
        seen.add(e.refId)
        if (!index[e.refId]) index[e.refId] = []
        index[e.refId].push({
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          paragraphId: p.id,
          preview: p.original.slice(0, 28) + (p.original.length > 28 ? '…' : ''),
        })
      }
    }
  }
  writeFileSync(
    path.join(ROOT, 'public/data', book, 'person-index.json'),
    JSON.stringify(index, null, 1),
  )
  console.log(`${book}: 人物 ${persons.length} 人，索引 ${Object.keys(index).length} 人`)
}
