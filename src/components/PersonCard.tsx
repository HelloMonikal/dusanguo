import { formatLifespan } from '../lib/chinese'
import type { Person, PersonOccurrence } from '../lib/schema'

interface Props {
  person: Person
  occurrences: PersonOccurrence[]
  onNavigate: (chapterId: string, paragraphId: string) => void
  onClose: () => void
}

export default function PersonCard({ person, occurrences, onNavigate, onClose }: Props) {
  const lifespan = formatLifespan(person.birth, person.death)

  return (
    <>
      <div className="person-backdrop" onClick={onClose} />
      <div className="person-card" role="dialog" aria-label={`人物：${person.name}`}>
        <div className="person-head">
          <div>
            <span className="person-name">{person.name}</span>
            {person.zi && <span className="person-zi">字{person.zi}</span>}
            {lifespan && <span className="person-lifespan">{lifespan}</span>}
          </div>
          <button type="button" className="annotation-close" onClick={onClose}>
            ×
          </button>
        </div>
        {person.native && <div className="person-native">籍贯：{person.native}</div>}
        <p className="person-bio">{person.bio}</p>

        {occurrences.length > 0 && (
          <div className="person-occurrences">
            <div className="person-occ-title">本书中出现 {occurrences.length} 处</div>
            <ul>
              {occurrences.map((occ) => (
                <li key={occ.paragraphId}>
                  <button
                    type="button"
                    onClick={() => onNavigate(occ.chapterId, occ.paragraphId)}
                  >
                    <span className="occ-chapter">{occ.chapterTitle}</span>
                    <span className="occ-preview">{occ.preview}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}
