import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import Bookshelf from './pages/Bookshelf'
import Reader from './pages/Reader'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Bookshelf />} />
        <Route path="/book/:bookId" element={<Reader />} />
        <Route path="/book/:bookId/:chapterId" element={<Reader />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)
