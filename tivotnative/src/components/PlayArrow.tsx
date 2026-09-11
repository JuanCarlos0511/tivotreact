import Svg, { Path } from 'react-native-svg'

interface PlayArrowProps {
  size?: number
  color?: string
}

/**
 * Custom play/arrow icon shaped as an isosceles triangle pointing right
 * with a convex curved back edge (left side).
 */
export function PlayArrow({ size = 16, color = 'currentColor' }: PlayArrowProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M6 3.5 C3.5 5.5 3.5 18.5 6 20.5 L20 12.5 Q20.3 12 20 11.5 Z" />
    </Svg>
  )
}
