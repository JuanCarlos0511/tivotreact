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

const stripInlineFormatting = (text: string): string =>
  text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')

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
              {stripInlineFormatting(paragraph.trim())}
            </p>
          ))
      })}
    </>
  )
}
