import { useCallback, useState } from 'react'

/** 阅读设置（localStorage 持久化） */
export interface ReaderSettings {
  /** 原文简/繁显示 */
  script: 'traditional' | 'simplified'
  /** 是否显示白话翻译 */
  showTranslation: boolean
  /** 原文字号（px） */
  fontSize: number
  /** 原文字体 */
  fontFamily: 'song' | 'kai' | 'hei'
  /** 人名是否显示生卒年 */
  showLifespan: boolean
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  script: 'traditional',
  showTranslation: true,
  fontSize: 18,
  fontFamily: 'song',
  showLifespan: true,
}

export const FONT_STACKS: Record<ReaderSettings['fontFamily'], string> = {
  song: '"Songti SC", "Noto Serif SC", SimSun, serif',
  kai: '"Kaiti SC", KaiTi, "Noto Serif SC", serif',
  hei: '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif',
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed = JSON.parse(raw)
    // 仅普通对象与默认值合并（补新增字段）；数组等其他类型原样返回
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      typeof fallback === 'object' &&
      fallback !== null &&
      !Array.isArray(fallback)
    ) {
      return { ...fallback, ...parsed }
    }
    return parsed as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 隐私模式等场景下写入失败，忽略即可
  }
}

export function useStoredState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readJson(key, fallback))
  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = next instanceof Function ? next(prev) : next
        writeJson(key, resolved)
        return resolved
      })
    },
    [key],
  )
  return [value, update] as const
}

export function useReaderSettings() {
  return useStoredState<ReaderSettings>('reader-settings', DEFAULT_SETTINGS)
}

/** 段落星标收藏（本地） */
export function useFavorites() {
  const [ids, setIds] = useStoredState<string[]>('favorites', [])
  const toggle = useCallback(
    (paragraphId: string) => {
      setIds((prev) =>
        prev.includes(paragraphId)
          ? prev.filter((id) => id !== paragraphId)
          : [...prev, paragraphId],
      )
    },
    [setIds],
  )
  return { ids, toggle }
}

/** 每本书的阅读进度（最后打开的章节） */
export function useReadingProgress(bookId: string) {
  return useStoredState<string | null>(`progress-${bookId}`, null)
}
