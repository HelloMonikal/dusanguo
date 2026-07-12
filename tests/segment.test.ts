import { describe, expect, it } from 'vitest'
import { segmentParagraph } from '../src/lib/segment'
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
