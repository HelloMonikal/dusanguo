import type { Annotation, Entity, Paragraph } from './schema'

/**
 * 段落原文渲染前的切分：
 * - 实体区间切成 entity 段（区间不重叠，重叠/越界的实体按数据错误跳过）
 * - 注释以零宽标记插入 anchor 结束位置；若落在实体内部，顺延到实体结束，
 *   保证实体文字始终连续渲染
 * - v2：有句级对齐（paragraph.sentences）时按句边界再切一刀，
 *   输出按句分组的结构供双侧联动高亮使用
 */
export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'entity'; text: string; entity: Entity }
  | { kind: 'annotation'; annotation: Annotation }

/** 一组属于同一句的片段；si = 句序号，-1 表示无句级对齐（整段一组） */
export interface SentenceGroup {
  si: number
  segments: Segment[]
}

function validEntities(original: string, entities: Entity[]): Entity[] {
  const sorted = entities
    .filter(
      (e) =>
        e.span[0] >= 0 && e.span[1] <= original.length && e.span[0] < e.span[1],
    )
    .sort((a, b) => a.span[0] - b.span[0])
  const result: Entity[] = []
  let lastEnd = 0
  for (const e of sorted) {
    if (e.span[0] < lastEnd) continue // 与前一实体重叠，跳过
    result.push(e)
    lastEnd = e.span[1]
  }
  return result
}

/** 内部：带起始位置的片段（annotation 为零宽，start=end=锚点） */
interface Positioned {
  seg: Segment
  start: number
}

function segmentWithPositions(
  paragraph: Paragraph,
  extraCuts: number[],
): Positioned[] {
  const { original } = paragraph
  const entities = validEntities(original, paragraph.entities ?? [])

  // 注释插入点：anchor 结束位置，越界钳制；落在实体内部则顺延到实体尾
  const markers = (paragraph.annotations ?? []).map((annotation) => {
    let at = Math.max(0, Math.min(annotation.anchor[1], original.length))
    for (const e of entities) {
      if (at > e.span[0] && at < e.span[1]) {
        at = e.span[1]
        break
      }
    }
    return { at, annotation }
  })
  markers.sort((a, b) => a.at - b.at)

  // 纯文本区间的切割点（句边界等），实体内部的切割点忽略（实体保持完整）
  const cuts = [...new Set(extraCuts)]
    .filter((c) => c > 0 && c < original.length)
    .filter((c) => !entities.some((e) => c > e.span[0] && c < e.span[1]))
    .sort((a, b) => a - b)

  const result: Positioned[] = []
  let cursor = 0
  let mi = 0
  let ci = 0

  const emitText = (from: number, to: number) => {
    let pos = from
    while (ci < cuts.length && cuts[ci] <= from) ci++
    while (pos < to) {
      // 本片文本的下一个断点：注释标记或切割点，取更近者
      const nextMarker = mi < markers.length && markers[mi].at <= to ? markers[mi].at : Infinity
      const nextCut = ci < cuts.length && cuts[ci] < to ? cuts[ci] : Infinity
      const next = Math.min(nextMarker, nextCut)
      if (next === Infinity) break
      if (next > pos) {
        result.push({ seg: { kind: 'text', text: original.slice(pos, next) }, start: pos })
        pos = next
      }
      if (nextMarker === next && mi < markers.length && markers[mi].at === next) {
        result.push({ seg: { kind: 'annotation', annotation: markers[mi].annotation }, start: next })
        mi++
      } else if (nextCut === next) {
        ci++
      }
    }
    // 冲刷落在 [pos, to] 的剩余标记（含 at === to）
    while (mi < markers.length && markers[mi].at <= to) {
      const m = markers[mi]
      if (m.at > pos) {
        result.push({ seg: { kind: 'text', text: original.slice(pos, m.at) }, start: pos })
        pos = m.at
      }
      result.push({ seg: { kind: 'annotation', annotation: m.annotation }, start: m.at })
      mi++
    }
    if (pos < to) {
      result.push({ seg: { kind: 'text', text: original.slice(pos, to) }, start: pos })
    }
  }

  for (const entity of entities) {
    const [start, end] = entity.span
    emitText(cursor, start) // from === to 时仅冲刷落在该点的注释标记
    result.push({ seg: { kind: 'entity', text: original.slice(start, end), entity }, start })
    cursor = end
  }
  emitText(cursor, original.length)

  return result
}

/** 兼容旧用法：扁平片段序列 */
export function segmentParagraph(paragraph: Paragraph): Segment[] {
  return segmentWithPositions(paragraph, []).map((p) => p.seg)
}

/**
 * 按句分组切分。无 sentences 数据时返回单组 si=-1（整段）。
 * 落在句间隙的片段归入前一句（si 取最近的已开始句）。
 */
export function segmentBySentence(paragraph: Paragraph): SentenceGroup[] {
  const sentences = paragraph.sentences
  if (!sentences?.length) {
    return [{ si: -1, segments: segmentParagraph(paragraph) }]
  }

  const cuts = sentences.flatMap((sp) => [sp.o[0], sp.o[1]])
  const positioned = segmentWithPositions(paragraph, cuts)

  const groups: SentenceGroup[] = []
  let current: SentenceGroup | null = null
  for (const { seg, start } of positioned) {
    let si = sentences.findIndex((sp) => start >= sp.o[0] && start < sp.o[1])
    if (si === -1) {
      // 间隙或段尾（如末尾零宽注释）：归入最近已开始的句
      si = current?.si ?? 0
    }
    if (!current || current.si !== si) {
      current = { si, segments: [] }
      groups.push(current)
    }
    current.segments.push(seg)
  }
  return groups
}

/**
 * 白话侧按 t 区间切分：返回 [{si, text}]，si=-1 为句间隙文字。
 */
export function splitTranslation(paragraph: Paragraph): { si: number; text: string }[] {
  const sentences = paragraph.sentences
  const { translation } = paragraph
  if (!sentences?.length) return [{ si: -1, text: translation }]

  const parts: { si: number; text: string }[] = []
  let cursor = 0
  for (const [i, sp] of sentences.entries()) {
    const [s, e] = sp.t
    if (s > cursor) parts.push({ si: -1, text: translation.slice(cursor, s) })
    parts.push({ si: i, text: translation.slice(s, e) })
    cursor = e
  }
  if (cursor < translation.length) parts.push({ si: -1, text: translation.slice(cursor) })
  return parts
}
