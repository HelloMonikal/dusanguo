import type { BookConfig, BookIndexEntry, Chapter, TocNode } from './schema'

const DATA_BASE: string = import.meta.env.VITE_DATA_BASE ?? '/data'

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${DATA_BASE}${path}`)
  if (!res.ok) throw new Error(`加载数据失败：${path}（HTTP ${res.status}）`)
  return res.json() as Promise<T>
}

export function loadBookIndex(): Promise<BookIndexEntry[]> {
  return fetchJson('/books.json')
}

export function loadBookConfig(bookId: string): Promise<BookConfig> {
  return fetchJson(`/${bookId}/book.json`)
}

export function loadToc(bookId: string): Promise<TocNode[]> {
  return fetchJson(`/${bookId}/toc.json`)
}

export function loadChapter(bookId: string, chapterId: string): Promise<Chapter> {
  return fetchJson(`/${bookId}/chapters/${chapterId}.json`)
}

/** 展平目录树中的叶子（章节）节点，按阅读顺序排列，用于 前/后 章节导航 */
export function flattenChapters(toc: TocNode[]): { chapterId: string; title: string }[] {
  const result: { chapterId: string; title: string }[] = []
  const walk = (nodes: TocNode[]) => {
    for (const node of nodes) {
      if (node.chapterId) result.push({ chapterId: node.chapterId, title: node.title })
      if (node.children) walk(node.children)
    }
  }
  walk(toc)
  return result
}

/** 在目录树中找到通往某章节的路径（用于面包屑与目录高亮展开） */
export function findTocPath(toc: TocNode[], chapterId: string): TocNode[] | null {
  for (const node of toc) {
    if (node.chapterId === chapterId) return [node]
    if (node.children) {
      const sub = findTocPath(node.children, chapterId)
      if (sub) return [node, ...sub]
    }
  }
  return null
}
