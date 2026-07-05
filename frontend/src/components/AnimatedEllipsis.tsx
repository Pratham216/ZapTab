import { useEffect, useState } from "react";

const DOT_PATTERN = [".", "..", "...", "....", "...", "..", "."] as const;

export default function AnimatedEllipsis({
  intervalMs = 350,
  className = "",
}: {
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % DOT_PATTERN.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return (
    <span
      className={`inline-block min-w-[2.5ch] text-left ${className}`.trim()}
      aria-hidden
    >
      {DOT_PATTERN[index]}
    </span>
  );
}
