import type { Annotation, Entity, Paragraph } from './schema'

/**
 * 段落原文渲染前的切分：
 * - 实体区间切成 entity 段（区间不重叠，重叠/越界的实体按数据错误跳过）
 * - 注释以零宽标记插入 anchor 结束位置；若落在实体内部，顺延到实体结束，
 *   保证实体文字始终连续渲染
 */
export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'entity'; text: string; entity: Entity }
  | { kind: 'annotation'; annotation: Annotation }

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

export function segmentParagraph(paragraph: Paragraph): Segment[] {
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

  const segments: Segment[] = []
  let cursor = 0
  let mi = 0

  const emitText = (from: number, to: number) => {
    // 在纯文本区间内，于注释插入点处断开
    let pos = from
    while (mi < markers.length && markers[mi].at <= to) {
      const m = markers[mi]
      if (m.at > pos) segments.push({ kind: 'text', text: original.slice(pos, m.at) })
      segments.push({ kind: 'annotation', annotation: m.annotation })
      pos = Math.max(pos, m.at)
      mi++
    }
    if (pos < to) segments.push({ kind: 'text', text: original.slice(pos, to) })
  }

  for (const entity of entities) {
    const [start, end] = entity.span
    emitText(cursor, start) // from === to 时仅冲刷落在该点的注释标记
    segments.push({ kind: 'entity', text: original.slice(start, end), entity })
    cursor = end
  }
  emitText(cursor, original.length)

  return segments
}
