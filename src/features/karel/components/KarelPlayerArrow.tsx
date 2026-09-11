interface KarelPlayerArrowProps {
  size?: number
  hasError?: boolean
  className?: string
  direction?: 'NORTE' | 'ESTE' | 'SUR' | 'OESTE'
  beeperCount?: number | undefined
}

const DIRECTION_ANGLE = { NORTE: 0, ESTE: 90, SUR: 180, OESTE: 270 } as const

/**
 * Karel user navigation arrow with a prominent robot character design inside.
 */
export function KarelPlayerArrow({
  size = 38,
  hasError = false,
  className,
  direction = 'NORTE',
  beeperCount,
}: KarelPlayerArrowProps) {
  const arrowFill = hasError ? '#dc2626' : '#08734f'
  const arrowStroke = hasError ? '#991b1b' : '#10b981'
  const botColor = '#ffffff'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={{ display: 'block' }}
    >
      {/* Only the curved navigation marker rotates; the robot always faces the user. */}
      <g transform={`rotate(${DIRECTION_ANGLE[direction]} 16 16)`}>
        <path
          d="M16 .8C17.2 .8 18.3 2 19.1 3.6L31 27.7C31.9 29.5 30 31.3 28.3 30.4L16 24.2 3.7 30.4C2 31.3.1 29.5 1 27.7L12.9 3.6C13.7 2 14.8.8 16 .8Z"
          fill={arrowFill}
          stroke={arrowStroke}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Wing Accent Lines */}
        <line x1="5.8" y1="27.3" x2="10.7" y2="24.5" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1" strokeLinecap="round" />
        <line x1="26.2" y1="27.3" x2="21.3" y2="24.5" stroke="rgba(255, 255, 255, 0.35)" strokeWidth="1" strokeLinecap="round" />
      </g>

      {/* Bot Antenna */}
      <circle cx="16" cy="4.8" r="1.3" fill={botColor} />
      <line x1="16" y1="6.1" x2="16" y2="8.5" stroke={botColor} strokeWidth="1.5" strokeLinecap="round" />

      {/* Bot Ears */}
      <line x1="9.6" y1="12" x2="11.2" y2="12" stroke={botColor} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20.8" y1="12" x2="22.4" y2="12" stroke={botColor} strokeWidth="1.5" strokeLinecap="round" />

      {/* Bot Head */}
      <rect
        x="11.2"
        y="8.5"
        width="9.6"
        height="7.2"
        rx="2.2"
        fill="rgba(0, 0, 0, 0.28)"
        stroke={botColor}
        strokeWidth="1.3"
      />

      {/* Bot Eyes */}
      <circle cx="14" cy="11.8" r="1.15" fill={botColor} />
      <circle cx="18" cy="11.8" r="1.15" fill={botColor} />

      {/* Bot Smile */}
      <path
        d="M14.2 13.8 Q16 15.2 17.8 13.8"
        fill="none"
        stroke={botColor}
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* Bot Torso / Body */}
      <path
        d="M10 16.2 L22 16.2 L23.8 22.2 L16 20.2 L8.2 22.2 Z"
        fill="rgba(0, 0, 0, 0.2)"
        stroke={botColor}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />

      {/* Bot Torso Lights */}
      <circle cx="13.5" cy="18.8" r="0.9" fill={botColor} />
      <circle cx="18.5" cy="18.8" r="0.9" fill={botColor} />

      {/* A beeper in Karel's cell is shown held in front of the torso. */}
      {beeperCount !== undefined && (
        <g aria-hidden="true">
          <circle cx="16" cy="20.4" r="3.6" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
          <circle cx="14.8" cy="19.2" r="0.7" fill="rgba(255, 255, 255, 0.65)" />
          <text
            x="16"
            y="21.8"
            fill="#120a02"
            fontSize={beeperCount > 99 ? 3.1 : beeperCount > 9 ? 3.6 : 4.3}
            fontWeight="900"
            textAnchor="middle"
          >
            {beeperCount}
          </text>
        </g>
      )}

    </svg>
  )
}
