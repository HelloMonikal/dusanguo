import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PersonCard from '../src/components/PersonCard'
import type { Person, PersonOccurrence } from '../src/lib/schema'

const person: Person = {
  id: 'zhugeliang',
  name: '諸葛亮',
  zi: '孔明',
  birth: 181,
  death: 234,
  native: '琅邪陽都',
  bio: '三国时期蜀汉丞相。',
}

const occurrences: PersonOccurrence[] = [
  {
    chapterId: 'shu-35',
    chapterTitle: '蜀書五·諸葛亮傳',
    paragraphId: 'shu-35-p001',
    preview: '諸葛亮字孔明…',
  },
]

describe('PersonCard', () => {
  it('渲染姓名/字/生卒/籍贯/生平', () => {
    render(
      <PersonCard person={person} occurrences={occurrences} onNavigate={() => {}} onClose={() => {}} />,
    )
    expect(screen.getByText('諸葛亮')).toBeInTheDocument()
    expect(screen.getByText('字孔明')).toBeInTheDocument()
    expect(screen.getByText('181-234')).toBeInTheDocument()
    expect(screen.getByText('籍贯：琅邪陽都')).toBeInTheDocument()
    expect(screen.getByText('三国时期蜀汉丞相。')).toBeInTheDocument()
  })

  it('出现位置列表可点击跳转', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(
      <PersonCard person={person} occurrences={occurrences} onNavigate={onNavigate} onClose={() => {}} />,
    )
    expect(screen.getByText('本书中出现 1 处')).toBeInTheDocument()
    await user.click(screen.getByText('諸葛亮字孔明…'))
    expect(onNavigate).toHaveBeenCalledWith('shu-35', 'shu-35-p001')
  })

  it('点击遮罩或关闭按钮触发 onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { container } = render(
      <PersonCard person={person} occurrences={[]} onNavigate={() => {}} onClose={onClose} />,
    )
    await user.click(screen.getByRole('button', { name: '×' }))
    await user.click(container.querySelector('.person-backdrop')!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('无出现位置时不渲染列表', () => {
    render(<PersonCard person={person} occurrences={[]} onNavigate={() => {}} onClose={() => {}} />)
    expect(screen.queryByText(/本书中出现/)).not.toBeInTheDocument()
  })
})
