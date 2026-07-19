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
  // 顶层节点都带 group 时按分部（魏書/蜀書/吳書…）渲染 tab
  const groups = toc.every((node) => node.group)
    ? [...new Set(toc.map((node) => node.group!))]
    : []
  const tabbed = groups.length > 1
  const currentGroup = currentChapterId
    ? toc.find((node) => node.chapterId === currentChapterId)?.group
    : undefined
  const [activeGroup, setActiveGroup] = useState(currentGroup ?? groups[0])

  // 切换章节（含跨部前后翻页）时跟随其所在部
  useEffect(() => {
    if (currentGroup) setActiveGroup(currentGroup)
  }, [currentGroup])

  const visible = tabbed
    ? toc.filter((node) => node.group === (activeGroup ?? groups[0]))
    : toc

  return (
    <nav className="toc-tree">
      {tabbed && (
        <div className="toc-tabs" role="tablist">
          {groups.map((group) => (
            <button
              key={group}
              type="button"
              role="tab"
              aria-selected={group === (activeGroup ?? groups[0])}
              className={`toc-tab${group === (activeGroup ?? groups[0]) ? ' active' : ''}`}
              onClick={() => setActiveGroup(group)}
            >
              {group}
            </button>
          ))}
        </div>
      )}
      {visible.map((node) => (
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
