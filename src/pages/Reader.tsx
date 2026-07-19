import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import SettingsPanel from '../components/SettingsPanel'
import TocTree from '../components/TocTree'
import ParagraphView from '../components/ParagraphView'
import PersonCard from '../components/PersonCard'
import {
  findTocPath,
  flattenChapters,
  loadBookConfig,
  loadChapter,
  loadPersonIndex,
  loadPersons,
  loadToc,
  loadUpdates,
} from '../lib/data'
import type {
  BookConfig,
  BookUpdate,
  Chapter,
  Person,
  PersonIndex,
  TocNode,
} from '../lib/schema'
import { useFavorites, useReaderSettings, useReadingProgress } from '../lib/settings'

export default function Reader() {
  const { bookId = '', chapterId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [config, setConfig] = useState<BookConfig | null>(null)
  const [toc, setToc] = useState<TocNode[] | null>(null)
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [persons, setPersons] = useState<Person[]>([])
  const [personIndex, setPersonIndex] = useState<PersonIndex>({})
  const [updates, setUpdates] = useState<BookUpdate[]>([])
  const [openPersonId, setOpenPersonId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tocOpen, setTocOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const [settings, setSettings] = useReaderSettings()
  const { ids: favorites, toggle: toggleFavorite } = useFavorites()
  const [progress, setProgress] = useReadingProgress(bookId)

  // 载入书配置与目录（人物库缺失时静默降级为空）
  useEffect(() => {
    setConfig(null)
    setToc(null)
    Promise.all([loadBookConfig(bookId), loadToc(bookId)]).then(
      ([cfg, tocData]) => {
        setConfig(cfg)
        setToc(tocData)
      },
      (e: Error) => setError(e.message),
    )
    loadPersons(bookId).then(setPersons)
    loadPersonIndex(bookId).then(setPersonIndex)
    loadUpdates(bookId).then(setUpdates)
  }, [bookId])

  const chapters = useMemo(() => (toc ? flattenChapters(toc) : []), [toc])

  // 无章节参数时，跳到上次阅读位置或第一章
  useEffect(() => {
    if (!chapterId && chapters.length > 0) {
      const target =
        progress && chapters.some((c) => c.chapterId === progress)
          ? progress
          : chapters[0].chapterId
      navigate(`/book/${bookId}/${target}`, { replace: true })
    }
  }, [chapterId, chapters, progress, bookId, navigate])

  // 载入章节并记录进度
  useEffect(() => {
    if (!chapterId) return
    setChapter(null)
    loadChapter(bookId, chapterId).then(
      (data) => {
        setChapter(data)
        setProgress(chapterId)
      },
      (e: Error) => setError(e.message),
    )
  }, [bookId, chapterId, setProgress])

  // 章节渲染后：有 hash 则滚动定位到目标段落，否则回到顶部
  useEffect(() => {
    if (!chapter) return
    const targetId = location.hash.slice(1)
    if (!targetId) {
      window.scrollTo(0, 0)
      return
    }
    requestAnimationFrame(() => {
      const el = document.getElementById(targetId)
      if (!el) return
      el.scrollIntoView({ block: 'start' })
      el.classList.add('flash')
      setTimeout(() => el.classList.remove('flash'), 1800)
    })
  }, [chapter, location.hash])

  const tocPath = useMemo(
    () => (toc && chapterId ? (findTocPath(toc, chapterId) ?? []) : []),
    [toc, chapterId],
  )
  const layerLabels = useMemo(
    () =>
      Object.fromEntries(
        (config?.annotationLayers ?? []).map((layer) => [layer.id, layer.label]),
      ),
    [config],
  )

  const personsById = useMemo(
    () => new Map(persons.map((person) => [person.id, person])),
    [persons],
  )
  const openPerson = openPersonId ? personsById.get(openPersonId) : undefined

  const chapterIndex = chapters.findIndex((c) => c.chapterId === chapterId)
  const prev = chapterIndex > 0 ? chapters[chapterIndex - 1] : null
  const next =
    chapterIndex >= 0 && chapterIndex < chapters.length - 1
      ? chapters[chapterIndex + 1]
      : null

  if (error) {
    return (
      <div className="reader-error">
        <p className="error">{error}</p>
        <Link to="/">返回书阁</Link>
      </div>
    )
  }

  return (
    <div className="reader">
      <header className="reader-header">
        <button
          type="button"
          className="icon-btn"
          title="目录"
          onClick={() => setTocOpen((v) => !v)}
        >
          ☰
        </button>
        <nav className="breadcrumb">
          <Link to="/">书阁</Link>
          <span className="sep">/</span>
          <span>{config?.title ?? '…'}</span>
          {tocPath.map((node) => (
            <span key={node.id}>
              <span className="sep">/</span>
              <span>{node.title}</span>
            </span>
          ))}
        </nav>
        <button
          type="button"
          className="icon-btn"
          title="阅读设置"
          onClick={() => setSettingsOpen((v) => !v)}
        >
          ⚙
        </button>
      </header>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {openPerson && (
        <PersonCard
          person={openPerson}
          occurrences={personIndex[openPerson.id] ?? []}
          onNavigate={(targetChapter, paragraphId) => {
            setOpenPersonId(null)
            navigate(`/book/${bookId}/${targetChapter}#${paragraphId}`)
          }}
          onClose={() => setOpenPersonId(null)}
        />
      )}

      <div className="reader-layout">
        {tocOpen && toc && (
          <aside className="reader-sidebar">
            <div className="book-byline">
              {config && `${config.dynasty}·${config.author}`}
            </div>
            <TocTree
              toc={toc}
              currentChapterId={chapterId ?? null}
              activePath={tocPath.map((node) => node.id)}
              onSelect={(id) => navigate(`/book/${bookId}/${id}`)}
            />
            {updates.length > 0 && (
              <details className="updates-log">
                <summary>更新日志</summary>
                <ul>
                  {updates.map((u, i) => (
                    <li key={i}>
                      <span className="updates-date">{u.date}</span>
                      <span className="updates-note">{u.note}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </aside>
        )}

        <main className="reader-main">
          {!chapter && <p className="loading">加载中…</p>}
          {chapter && (
            <>
              <h2 className="chapter-title">{chapter.title}</h2>
              {chapter.paragraphs.map((paragraph, i) => (
                <ParagraphView
                  key={paragraph.id}
                  paragraph={paragraph}
                  index={i}
                  total={chapter.paragraphs.length}
                  layerLabels={layerLabels}
                  settings={settings}
                  favorite={favorites.includes(paragraph.id)}
                  onToggleFavorite={toggleFavorite}
                  onPersonClick={(refId) => {
                    if (personsById.has(refId)) setOpenPersonId(refId)
                  }}
                />
              ))}
              <nav className="chapter-nav">
                {prev ? (
                  <Link to={`/book/${bookId}/${prev.chapterId}`}>‹ {prev.title}</Link>
                ) : (
                  <span />
                )}
                {next ? (
                  <Link to={`/book/${bookId}/${next.chapterId}`}>{next.title} ›</Link>
                ) : (
                  <span />
                )}
              </nav>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
