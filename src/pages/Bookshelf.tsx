import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadBookIndex } from '../lib/data'
import type { BookIndexEntry } from '../lib/schema'

export default function Bookshelf() {
  const [books, setBooks] = useState<BookIndexEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBookIndex().then(setBooks, (e: Error) => setError(e.message))
  }, [])

  return (
    <div className="bookshelf">
      <header className="bookshelf-header">
        <h1>书阁</h1>
        <p>古籍对照阅读</p>
      </header>
      {error && <p className="error">{error}</p>}
      {!books && !error && <p className="loading">加载中…</p>}
      <div className="book-grid">
        {books?.map((book) => (
          <Link key={book.id} to={`/book/${book.id}`} className="book-card">
            <div className="book-card-title">{book.title}</div>
            <div className="book-card-meta">
              {book.dynasty}·{book.author}
            </div>
            {book.blurb && <div className="book-card-blurb">{book.blurb}</div>}
          </Link>
        ))}
      </div>
    </div>
  )
}
