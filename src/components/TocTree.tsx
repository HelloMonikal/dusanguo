import { useEffect, useState } from 'react'
import type { TocNode } from '../lib/schema'

interface Props {
  toc: TocNode[]
  currentChapterId: string | null
  /** 通往当前章节的节点 id 路径，用于默认展开 */
  activePath: string[]
  onSelect: (chapterId: string) => void
}

function TocBranch({
  node,
  currentChapterId,
  activePath,
  onSelect,
}: {
  node: TocNode
} & Omit<Props, 'toc'>) {
  const onPath = activePath.includes(node.id)
  const [open, setOpen] = useState(onPath)

  useEffect(() => {
    if (onPath) setOpen(true)
  }, [onPath])

  if (node.chapterId) {
    const active = node.chapterId === currentChapterId
    return (
      <button
        type="button"
        className={`toc-leaf${active ? ' active' : ''}`}
        onClick={() => onSelect(node.chapterId!)}
      >
        {node.title}
      </button>
    )
  }

  return (
    <div className="toc-branch">
      <button
        type="button"
        className="toc-folder"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`toc-caret${open ? ' open' : ''}`}>▸</span>
        {node.title}
      </button>
      {open && node.children && (
        <div className="toc-children">
          {node.children.map((child) => (
            <TocBranch
              key={child.id}
              node={child}
              currentChapterId={currentChapterId}
              activePath={activePath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function TocTree({ toc, currentChapterId, activePath, onSelect }: Props) {
  return (
    <nav className="toc-tree">
      {toc.map((node) => (
        <TocBranch
          key={node.id}
          node={node}
          currentChapterId={currentChapterId}
          activePath={activePath}
          onSelect={onSelect}
        />
      ))}
    </nav>
  )
}
