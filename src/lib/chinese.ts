import * as OpenCC from 'opencc-js'

/** 繁转简（原文底本为繁体，简体视图实时转换） */
let converter: ((text: string) => string) | null = null

export function toSimplified(text: string): string {
  if (!converter) converter = OpenCC.Converter({ from: 't', to: 'cn' })
  return converter(text)
}

/** 生卒年展示：负数为公元前，如 -155 → 前155 */
export function formatYear(year: number): string {
  return year < 0 ? `前${-year}` : String(year)
}

export function formatLifespan(birth?: number, death?: number): string | null {
  if (birth === undefined && death === undefined) return null
  const b = birth === undefined ? '?' : formatYear(birth)
  const d = death === undefined ? '?' : formatYear(death)
  return `${b}-${d}`
}
