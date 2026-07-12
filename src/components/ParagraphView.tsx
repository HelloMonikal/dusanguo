import { useMemo, useState } from 'react'
import { formatLifespan, toSimplified } from '../lib/chinese'
import { segmentParagraph } from '../lib/segment'
import type { Annotation, Paragraph } from '../lib/schema'
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
}

export default function ParagraphView({
  paragraph,
  index,
  total,
  layerLabels,
  settings,
  favorite,
  onToggleFavorite,
}: Props) {
  const [openNote, setOpenNote] = useState<Annotation | null>(null)
  const [hovered, setHovered] = useState(false)

  const segments = useMemo(() => segmentParagraph(paragraph), [paragraph])
  const simplified = settings.script === 'simplified'
  const t = (text: string) => (simplified ? toSimplified(text) : text)

  const originalStyle = {
    fontSize: settings.fontSize,
    fontFamily: FONT_STACKS[settings.fontFamily],
  }

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
          {segments.map((seg, i) => {
            if (seg.kind === 'text') return <span key={i}>{t(seg.text)}</span>
            if (seg.kind === 'entity') {
              const { entity } = seg
              if (entity.type === 'person') {
                const lifespan = settings.showLifespan
                  ? formatLifespan(entity.birth, entity.death)
                  : null
                return (
                  <span key={i} className="entity-person" title={entity.note}>
                    {t(seg.text)}
                    {lifespan && <sub className="lifespan">{lifespan}</sub>}
                  </span>
                )
              }
              if (entity.type === 'place') {
                return (
                  <span key={i} className="entity-place" title={entity.note}>
                    {t(seg.text)}
                  </span>
                )
              }
              return (
                <span key={i} className="entity-other" title={entity.note}>
                  {t(seg.text)}
                </span>
              )
            }
            // 注释标记
            const label = layerLabels[seg.annotation.layer] ?? '注'
            const isOpen = openNote === seg.annotation
            return (
              <button
                key={i}
                type="button"
                className={`annotation-marker${isOpen ? ' open' : ''}`}
                onClick={() => setOpenNote(isOpen ? null : seg.annotation)}
              >
                〔{t(label)}〕
              </button>
            )
          })}

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
            {paragraph.translation}
          </div>
        )}
      </div>
    </section>
  )
}
