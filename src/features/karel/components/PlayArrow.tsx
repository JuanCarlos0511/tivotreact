interface PlayArrowProps {
  size?: number;
  className?: string;
}

export function PlayArrow({ size = 16, className }: PlayArrowProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      className={className}
    >
      <path d="M6 3.5 C3.5 5.5 3.5 18.5 6 20.5 L20 12.5 Q20.3 12 20 11.5 Z" />
    </svg>
  );
}
