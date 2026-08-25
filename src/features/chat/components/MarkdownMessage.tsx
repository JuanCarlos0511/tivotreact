import type { ReactNode } from 'react'

interface MarkdownMessageProps {
  text: string
}

type MarkdownSegment =
  | { kind: 'text'; content: string }
  | { kind: 'code'; content: string; language: string | null }

const splitMarkdownSegments = (text: string): MarkdownSegment[] => {
  const segments: MarkdownSegment[] = []
  const fencePattern = /```(\w+)?\n?([\s\S]*?)```/g
  let cursor = 0
  let match = fencePattern.exec(text)

  while (match) {
    if (match.index > cursor) {
      segments.push({ kind: 'text', content: text.slice(cursor, match.index) })
    }

    segments.push({
      kind: 'code',
      language: match[1] ?? null,
      content: match[2]?.trimEnd() ?? '',
    })

    cursor = match.index + match[0].length
    match = fencePattern.exec(text)
  }

  if (cursor < text.length) {
    segments.push({ kind: 'text', content: text.slice(cursor) })
  }

  return segments.length > 0 ? segments : [{ kind: 'text', content: text }]
}

const renderInlineMarkdown = (text: string): ReactNode[] =>
  text
    .split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((chunk, index) => {
      if (chunk.startsWith('`') && chunk.endsWith('`')) {
        return <code key={`${chunk}-${index}`}>{chunk.slice(1, -1)}</code>
      }

      if (chunk.startsWith('**') && chunk.endsWith('**')) {
        return <strong key={`${chunk}-${index}`}>{chunk.slice(2, -2)}</strong>
      }

      return <span key={`${chunk}-${index}`}>{renderKeywordText(chunk)}</span>
    })

const renderKeywordText = (text: string): ReactNode[] => {
  const keywordPattern =
    /\b(avanza|gira-izquierda|apagate|coge-zumbador|deja-zumbador|repetir|veces|inicio|fin|si|entonces|mientras|hacer|define-nueva-instruccion|frente-libre|junto-a-zumbador|orientado-al-norte|calle|calles|avenida|avenidas|zumbador|zumbadores|norte|sur|este|oeste|if|while)\b/gi
  const exactKeywordPattern =
    /^(avanza|gira-izquierda|apagate|coge-zumbador|deja-zumbador|repetir|veces|inicio|fin|si|entonces|mientras|hacer|define-nueva-instruccion|frente-libre|junto-a-zumbador|orientado-al-norte|calle|calles|avenida|avenidas|zumbador|zumbadores|norte|sur|este|oeste|if|while)$/i

  return text
    .split(keywordPattern)
    .filter((chunk) => chunk.length > 0)
    .map((chunk, index) =>
      exactKeywordPattern.test(chunk) ? (
        <span key={`${chunk}-${index}`} className="code-keyword">
          {chunk}
        </span>
      ) : (
        <span key={`${chunk}-${index}`}>{chunk}</span>
      ),
    )
}

export function MarkdownMessage({ text }: MarkdownMessageProps) {
  return (
    <>
      {splitMarkdownSegments(text).map((segment, segmentIndex) => {
        if (segment.kind === 'code') {
          return (
            <pre key={`code-${segmentIndex}`} className="markdown-code">
              <code>{segment.content}</code>
            </pre>
          )
        }

        return segment.content
          .split(/\n{2,}/)
          .filter((paragraph) => paragraph.trim().length > 0)
          .map((paragraph, paragraphIndex) => (
            <p key={`paragraph-${segmentIndex}-${paragraphIndex}`}>
              {renderInlineMarkdown(paragraph.trim())}
            </p>
          ))
      })}
    </>
  )
}
