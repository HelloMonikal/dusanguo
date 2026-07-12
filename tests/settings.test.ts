import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { DEFAULT_SETTINGS, useFavorites, useReaderSettings } from '../src/lib/settings'

beforeEach(() => {
  localStorage.clear()
})

describe('useReaderSettings', () => {
  it('默认设置', () => {
    const { result } = renderHook(() => useReaderSettings())
    expect(result.current[0]).toEqual(DEFAULT_SETTINGS)
  })

  it('修改后持久化到 localStorage 并可恢复', () => {
    const { result } = renderHook(() => useReaderSettings())
    act(() => result.current[1]({ ...DEFAULT_SETTINGS, script: 'simplified', fontSize: 22 }))

    const { result: fresh } = renderHook(() => useReaderSettings())
    expect(fresh.current[0].script).toBe('simplified')
    expect(fresh.current[0].fontSize).toBe(22)
  })

  it('localStorage 内容损坏时回退默认值', () => {
    localStorage.setItem('reader-settings', '{oops')
    const { result } = renderHook(() => useReaderSettings())
    expect(result.current[0]).toEqual(DEFAULT_SETTINGS)
  })
})

describe('useFavorites', () => {
  it('toggle 添加与移除收藏', () => {
    const { result } = renderHook(() => useFavorites())
    act(() => result.current.toggle('a-p001'))
    expect(result.current.ids).toEqual(['a-p001'])
    act(() => result.current.toggle('a-p001'))
    expect(result.current.ids).toEqual([])
  })
})
