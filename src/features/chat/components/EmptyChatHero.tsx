import { Bot, Bug, GitBranch, Repeat2 } from 'lucide-react'
import type { StarterTopicIcon } from '@shared/types'
import { TIVOT_STARTER_TOPICS } from '@shared/catalog'

interface EmptyChatHeroProps {
  onSelectStarterTopic: (prompt: string, problemId?: string) => Promise<void>
}

const starterIconMap: Record<StarterTopicIcon, typeof Bot> = {
  robot: Bot,
  repeat: Repeat2,
  decision: GitBranch,
  bug: Bug,
}

export function EmptyChatHero({ onSelectStarterTopic }: EmptyChatHeroProps) {
  return (
    <section className="empty-chat-hero" aria-labelledby="empty-chat-title">
      <p className="empty-chat-kicker">Tivot</p>
      <h1 id="empty-chat-title">Hola, que vamos a programar hoy?</h1>
      <p className="empty-chat-subtitle">
        Elige una mision y armamos instrucciones sencillas, como si guiaras a un robot paso a paso.
      </p>
      <div className="starter-topic-grid" aria-label="Misiones rapidas">
        {TIVOT_STARTER_TOPICS.map((topic) => {
          const Icon = starterIconMap[topic.icon]

          return (
            <button
              key={topic.id}
              className="starter-topic-card"
              type="button"
              onClick={() => void onSelectStarterTopic(topic.prompt, topic.problemId)}
            >
              <span className="starter-topic-icon" aria-hidden="true">
                <Icon size={20} />
              </span>
              <span className="starter-topic-copy">
                <strong>{topic.title}</strong>
                <small>{topic.description}</small>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
