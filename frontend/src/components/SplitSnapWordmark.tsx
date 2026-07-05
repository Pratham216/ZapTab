type WordmarkSize = "sm" | "md" | "lg" | "xl" | "hero";

const sizeClasses: Record<WordmarkSize, string> = {
  sm: "split-wordmark--sm",
  md: "split-wordmark--md",
  lg: "split-wordmark--lg",
  xl: "split-wordmark--xl",
  hero: "split-wordmark--hero",
};

interface SplitSnapWordmarkProps {
  size?: WordmarkSize;
  className?: string;
  as?: "span" | "h1" | "p";
}

export default function SplitSnapWordmark({
  size = "lg",
  className = "",
  as: Tag = "span",
}: SplitSnapWordmarkProps) {
  return (
    <Tag
      className={`split-wordmark ${sizeClasses[size]} ${className}`.trim()}
      aria-label="SplitSnap"
    >
      <span className="split-wordmark-split">Split</span>
      <span className="split-wordmark-snap">Snap</span>
    </Tag>
  );
}
