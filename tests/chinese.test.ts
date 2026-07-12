import { describe, expect, it } from 'vitest'
import { formatLifespan, formatYear, toSimplified } from '../src/lib/chinese'

describe('toSimplified', () => {
  it('繁体转简体', () => {
    expect(toSimplified('諸葛亮與關羽鎮荊州')).toBe('诸葛亮与关羽镇荆州')
  })

  it('已是简体的文本保持不变', () => {
    expect(toSimplified('三国志')).toBe('三国志')
  })
})

describe('formatYear / formatLifespan', () => {
  it('公元前用负数表示', () => {
    expect(formatYear(-196)).toBe('前196')
    expect(formatYear(220)).toBe('220')
  })

  it('生卒齐全', () => {
    expect(formatLifespan(181, 234)).toBe('181-234')
  })

  it('缺生年用问号', () => {
    expect(formatLifespan(undefined, 192)).toBe('?-192')
  })

  it('全缺返回 null', () => {
    expect(formatLifespan(undefined, undefined)).toBeNull()
  })
})
