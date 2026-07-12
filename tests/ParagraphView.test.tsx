import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ParagraphView from '../src/components/ParagraphView'
import { DEFAULT_SETTINGS } from '../src/lib/settings'
import type { Paragraph } from '../src/lib/schema'

const paragraph: Paragraph = {
  id: 'fx-p001',
  original: '諸葛亮字孔明，琅邪陽都人也。',
  translation: '诸葛亮字孔明，是琅邪郡阳都县人。',
  entities: [
    { type: 'person', span: [0, 3], name: '諸葛亮', birth: 181, death: 234 },
    { type: 'place', span: [7, 9], name: '琅邪' },
  ],
  annotations: [{ layer: 'peizhu', anchor: [6, 6], text: '裴注測試文', translation: '裴注白话' }],
}

const renderView = (over: Partial<Parameters<typeof ParagraphView>[0]> = {}) =>
  render(
    <ParagraphView
      paragraph={paragraph}
      index={0}
      total={3}
      layerLabels={{ peizhu: '裴注' }}
      settings={DEFAULT_SETTINGS}
      favorite={false}
      onToggleFavorite={() => {}}
      {...over}
    />,
  )

describe('ParagraphView', () => {
  it('渲染原文、白话与段落计数', () => {
    renderView()
    // 注释标记锚定在「明」后，会把「字孔明，」切开
    expect(screen.getByText('字孔明')).toBeInTheDocument()
    expect(screen.getByText('诸葛亮字孔明，是琅邪郡阳都县人。')).toBeInTheDocument()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('人名实体显示生卒年，关闭开关后隐藏', () => {
    const { rerender } = renderView()
    expect(screen.getByText('181-234')).toBeInTheDocument()

    rerender(
      <ParagraphView
        paragraph={paragraph}
        index={0}
        total={3}
        layerLabels={{ peizhu: '裴注' }}
        settings={{ ...DEFAULT_SETTINGS, showLifespan: false }}
        favorite={false}
        onToggleFavorite={() => {}}
      />,
    )
    expect(screen.queryByText('181-234')).not.toBeInTheDocument()
  })

  it('点击注释标记展开注文，再点关闭', async () => {
    const user = userEvent.setup()
    renderView()
    expect(screen.queryByText('裴注測試文')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '〔裴注〕' }))
    expect(screen.getByText('裴注測試文')).toBeInTheDocument()
    expect(screen.getByText('裴注白话')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '×' }))
    expect(screen.queryByText('裴注測試文')).not.toBeInTheDocument()
  })

  it('简体模式下原文与注文转为简体', async () => {
    const user = userEvent.setup()
    renderView({ settings: { ...DEFAULT_SETTINGS, script: 'simplified' } })
    expect(screen.getByText('诸葛亮')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '〔裴注〕' }))
    expect(screen.getByText('裴注测试文')).toBeInTheDocument()
  })

  it('仅原文模式不渲染白话', () => {
    renderView({ settings: { ...DEFAULT_SETTINGS, showTranslation: false } })
    expect(screen.queryByText('诸葛亮字孔明，是琅邪郡阳都县人。')).not.toBeInTheDocument()
  })

  it('星标点击回调段落 id', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    renderView({ onToggleFavorite: onToggle })
    await user.click(screen.getByTitle('收藏本段'))
    expect(onToggle).toHaveBeenCalledWith('fx-p001')
  })
})
