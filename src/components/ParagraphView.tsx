import { useMemo, useState } from 'react'
import { formatLifespan, toSimplified } from '../lib/chinese'
import { segmentBySentence, splitTranslation } from '../lib/segment'
import type { Segment } from '../lib/segment'
import type { Annotation, Entity, Paragraph } from '../lib/schema'
import type { ReaderSettings } from '../lib/settings'
import { FONT_STACKS } from '../lib/settings'

interface Props {
  paragraph: Paragraph
  index: number
  total: number
  /** 注释层 id → 行内标记文字（如 peizhu → 裴注） */
  layerLabels: Record<string, string>
  settings: ReaderSettings
  favorite: boolean
  onToggleFavorite: (id: string) => void
  /** 点击带 refId 的人名（人物卡片入口）；未提供时人名不可点击 */
  onPersonClick?: (refId: string) => void
}

export default function ParagraphView({
  paragraph,
  index,
  total,
  layerLabels,
  settings,
  favorite,
  onToggleFavorite,
  onPersonClick,
}: Props) {
  const [openNote, setOpenNote] = useState<Annotation | null>(null)
  const [hovered, setHovered] = useState(false)
  const [hoverSi, setHoverSi] = useState<number | null>(null)

  const groups = useMemo(() => segmentBySentence(paragraph), [paragraph])
  const translationParts = useMemo(() => splitTranslation(paragraph), [paragraph])
  const simplified = settings.script === 'simplified'
  const t = (text: string) => (simplified ? toSimplified(text) : text)

  const originalStyle = {
    fontSize: settings.fontSize,
    fontFamily: FONT_STACKS[settings.fontFamily],
  }

  const renderEntity = (entity: Entity, text: string, key: number) => {
    if (entity.type === 'person') {
      const lifespan = settings.showLifespan
        ? formatLifespan(entity.birth, entity.death)
        : null
      const clickable = entity.refId !== undefined && onPersonClick !== undefined
      const body = (
        <>
          {t(text)}
          {lifespan && <sub className="lifespan">{lifespan}</sub>}
        </>
      )
      if (clickable) {
        return (
          <button
            key={key}
            type="button"
            className="entity-person clickable"
            title={entity.note ?? '查看人物'}
            onClick={() => onPersonClick(entity.refId!)}
          >
            {body}
          </button>
        )
      }
      return (
        <span key={key} className="entity-person" title={entity.note}>
          {body}
        </span>
      )
    }
    if (entity.type === 'place') {
      return (
        <span key={key} className="entity-place" title={entity.note}>
          {t(text)}
        </span>
      )
    }
    return (
      <span key={key} className="entity-other" title={entity.note}>
        {t(text)}
      </span>
    )
  }

  const renderSegment = (seg: Segment, key: number) => {
    if (seg.kind === 'text') return <span key={key}>{t(seg.text)}</span>
    if (seg.kind === 'entity') return renderEntity(seg.entity, seg.text, key)
    const label = layerLabels[seg.annotation.layer] ?? '注'
    const isOpen = openNote === seg.annotation
    return (
      <button
        key={key}
        type="button"
        className={`annotation-marker${isOpen ? ' open' : ''}`}
        onClick={() => setOpenNote(isOpen ? null : seg.annotation)}
      >
        〔{t(label)}〕
      </button>
    )
  }

  const hasAlignment = groups.length > 0 && groups[0].si !== -1

  return (
    <section className={`paragraph${hovered ? ' hovered' : ''}`} id={paragraph.id}>
      <div className="paragraph-toolbar">
        <button
          type="button"
          className={`star${favorite ? ' on' : ''}`}
          title={favorite ? '取消收藏' : '收藏本段'}
          onClick={() => onToggleFavorite(paragraph.id)}
        >
          {favorite ? '★' : '☆'}
        </button>
        <span className="paragraph-counter">
          {index + 1} / {total}
        </span>
      </div>

      <div className={`paragraph-body${settings.showTranslation ? '' : ' original-only'}`}>
        <div
          className="original"
          lang={simplified ? 'zh-Hans' : 'zh-Hant'}
          style={originalStyle}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {groups.map((group, gi) =>
            group.si === -1 ? (
              group.segments.map((seg, i) => renderSegment(seg, gi * 1000 + i))
            ) : (
              <span
                key={gi}
                className={`sentence${hoverSi === group.si ? ' s-hover' : ''}`}
                data-si={group.si}
                onMouseEnter={() => setHoverSi(group.si)}
                onMouseLeave={() => setHoverSi(null)}
              >
                {group.segments.map((seg, i) => renderSegment(seg, i))}
              </span>
            ),
          )}

          {openNote && (
            <div className="annotation-note">
              <div className="annotation-note-head">
                <span>〔{t(layerLabels[openNote.layer] ?? '注')}〕</span>
                <button type="button" className="annotation-close" onClick={() => setOpenNote(null)}>
                  ×
                </button>
              </div>
              <p className="annotation-text" lang={simplified ? 'zh-Hans' : 'zh-Hant'}>
                {t(openNote.text)}
              </p>
              {openNote.translation && (
                <p className="annotation-translation">{openNote.translation}</p>
              )}
            </div>
          )}
        </div>

        {settings.showTranslation && (
          <div
            className="translation"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {hasAlignment
              ? translationParts.map((part, i) =>
                  part.si === -1 ? (
                    <span key={i}>{part.text}</span>
                  ) : (
                    <span
                      key={i}
                      className={`sentence${hoverSi === part.si ? ' s-hover' : ''}`}
                      data-si={part.si}
                      onMouseEnter={() => setHoverSi(part.si)}
                      onMouseLeave={() => setHoverSi(null)}
                    >
                      {part.text}
                    </span>
                  ),
                )
              : paragraph.translation}
          </div>
        )}
      </div>
    </section>
  )
}
