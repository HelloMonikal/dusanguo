import { describe, expect, it } from 'vitest'
import { segmentBySentence, segmentParagraph, splitTranslation } from '../src/lib/segment'
import type { Paragraph } from '../src/lib/schema'

const base = (over: Partial<Paragraph>): Paragraph => ({
  id: 't-p001',
  original: '諸葛亮字孔明，琅邪陽都人也。',
  translation: '',
  ...over,
})

const joinText = (segs: ReturnType<typeof segmentParagraph>) =>
  segs.map((s) => (s.kind === 'annotation' ? '' : s.text)).join('')

describe('segmentParagraph', () => {
  it('无标注时返回整段文本', () => {
    const segs = segmentParagraph(base({}))
    expect(segs).toEqual([{ kind: 'text', text: '諸葛亮字孔明，琅邪陽都人也。' }])
  })

  it('实体切分保持文本完整且顺序正确', () => {
    const p = base({
      entities: [
        { type: 'person', span: [0, 3], name: '諸葛亮', birth: 181, death: 234 },
        { type: 'place', span: [7, 9], name: '琅邪' },
      ],
    })
    const segs = segmentParagraph(p)
    expect(joinText(segs)).toBe(p.original)
    expect(segs[0]).toMatchObject({ kind: 'entity', text: '諸葛亮' })
    expect(segs[1]).toMatchObject({ kind: 'text', text: '字孔明，' })
    expect(segs[2]).toMatchObject({ kind: 'entity', text: '琅邪' })
  })

  it('注释标记插入锚点位置', () => {
    const p = base({
      annotations: [{ layer: 'peizhu', anchor: [6, 6], text: '注文' }],
    })
    const segs = segmentParagraph(p)
    expect(segs.map((s) => s.kind)).toEqual(['text', 'annotation', 'text'])
    expect(segs[0]).toMatchObject({ text: '諸葛亮字孔明' })
  })

  it('段首实体前的注释与段尾注释都能渲染', () => {
    const p = base({
      entities: [{ type: 'person', span: [0, 3], name: '諸葛亮' }],
      annotations: [
        { layer: 'peizhu', anchor: [0, 0], text: '段首注' },
        { layer: 'peizhu', anchor: [14, 14], text: '段尾注' },
      ],
    })
    const kinds = segmentParagraph(p).map((s) => s.kind)
    expect(kinds[0]).toBe('annotation')
    expect(kinds[kinds.length - 1]).toBe('annotation')
  })

  it('锚点落在实体内部时顺延到实体结束，实体保持连续', () => {
    const p = base({
      entities: [{ type: 'person', span: [0, 3], name: '諸葛亮' }],
      annotations: [{ layer: 'peizhu', anchor: [1, 1], text: '注' }],
    })
    const segs = segmentParagraph(p)
    expect(segs[0]).toMatchObject({ kind: 'entity', text: '諸葛亮' })
    expect(segs[1].kind).toBe('annotation')
  })

  it('越界与重叠实体按数据错误跳过，不破坏文本', () => {
    const p = base({
      entities: [
        { type: 'person', span: [0, 3], name: '諸葛亮' },
        { type: 'person', span: [2, 5], name: '亮字孔' }, // 与上一个重叠
        { type: 'place', span: [10, 99], name: '越界' },
      ],
    })
    const segs = segmentParagraph(p)
    expect(joinText(segs)).toBe(p.original)
    expect(segs.filter((s) => s.kind === 'entity')).toHaveLength(1)
  })

  it('注释锚点越界时钳制到文本范围内', () => {
    const p = base({
      annotations: [{ layer: 'peizhu', anchor: [99, 99], text: '注' }],
    })
    const segs = segmentParagraph(p)
    expect(segs[segs.length - 1].kind).toBe('annotation')
    expect(joinText(segs)).toBe(p.original)
  })
})

describe('segmentBySentence', () => {
  // 原文「諸葛亮字孔明，琅邪陽都人也。」共 14 字：句1 [0,7)，句2 [7,14)
  const aligned = (over: Partial<Paragraph> = {}): Paragraph =>
    base({
      translation: '诸葛亮字孔明，是琅邪郡阳都县人。',
      sentences: [
        { o: [0, 7], t: [0, 7] },
        { o: [7, 14], t: [7, 16] },
      ],
      ...over,
    })

  it('无对齐数据时返回单组 si=-1', () => {
    const groups = segmentBySentence(base({}))
    expect(groups).toHaveLength(1)
    expect(groups[0].si).toBe(-1)
  })

  it('按句边界分组且文本完整', () => {
    const groups = segmentBySentence(aligned())
    expect(groups.map((g) => g.si)).toEqual([0, 1])
    const text = groups
      .flatMap((g) => g.segments)
      .map((s) => (s.kind === 'annotation' ? '' : s.text))
      .join('')
    expect(text).toBe('諸葛亮字孔明，琅邪陽都人也。')
  })

  it('实体嵌套在句内，不被句边界拆开', () => {
    const groups = segmentBySentence(
      aligned({
        entities: [{ type: 'person', span: [0, 3], name: '諸葛亮' }],
      }),
    )
    expect(groups[0].segments[0]).toMatchObject({ kind: 'entity', text: '諸葛亮' })
    expect(groups[0].si).toBe(0)
  })

  it('段尾零宽注释归入最后一句', () => {
    const groups = segmentBySentence(
      aligned({
        annotations: [{ layer: 'peizhu', anchor: [14, 14], text: '注' }],
      }),
    )
    const last = groups[groups.length - 1]
    expect(last.si).toBe(1)
    expect(last.segments.some((s) => s.kind === 'annotation')).toBe(true)
  })
})

describe('splitTranslation', () => {
  it('无对齐数据时整段返回 si=-1', () => {
    const parts = splitTranslation(base({ translation: '整段白话。' }))
    expect(parts).toEqual([{ si: -1, text: '整段白话。' }])
  })

  it('按 t 区间切分并保留间隙', () => {
    const p = base({
      translation: '甲句。 乙句。',
      sentences: [
        { o: [0, 7], t: [0, 3] },
        { o: [7, 14], t: [4, 7] },
      ],
    })
    const parts = splitTranslation(p)
    expect(parts).toEqual([
      { si: 0, text: '甲句。' },
      { si: -1, text: ' ' },
      { si: 1, text: '乙句。' },
    ])
    expect(parts.map((x) => x.text).join('')).toBe(p.translation)
  })
})
