import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsPanel from '../src/components/SettingsPanel'
import { DEFAULT_SETTINGS } from '../src/lib/settings'

describe('SettingsPanel', () => {
  it('切换简体触发 onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SettingsPanel settings={DEFAULT_SETTINGS} onChange={onChange} onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: '简体' }))
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, script: 'simplified' })
  })

  it('切换仅原文触发 onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SettingsPanel settings={DEFAULT_SETTINGS} onChange={onChange} onClose={() => {}} />)

    await user.click(screen.getByRole('button', { name: '仅原文' }))
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, showTranslation: false })
  })

  it('当前生效项高亮', () => {
    render(
      <SettingsPanel
        settings={{ ...DEFAULT_SETTINGS, fontFamily: 'kai' }}
        onChange={() => {}}
        onClose={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: '楷体' })).toHaveClass('on')
    expect(screen.getByRole('button', { name: '宋体' })).not.toHaveClass('on')
  })

  it('关闭按钮触发 onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<SettingsPanel settings={DEFAULT_SETTINGS} onChange={() => {}} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: '×' }))
    expect(onClose).toHaveBeenCalled()
  })
})
