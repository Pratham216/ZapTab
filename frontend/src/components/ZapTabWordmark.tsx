type WordmarkSize = "sm" | "md" | "lg" | "xl" | "hero";

const sizeClasses: Record<WordmarkSize, string> = {
  sm: "zaptab-wordmark--sm",
  md: "zaptab-wordmark--md",
  lg: "zaptab-wordmark--lg",
  xl: "zaptab-wordmark--xl",
  hero: "zaptab-wordmark--hero",
};

interface ZapTabWordmarkProps {
  size?: WordmarkSize;
  className?: string;
  as?: "span" | "h1" | "p";
}

export default function ZapTabWordmark({
  size = "lg",
  className = "",
  as: Tag = "span",
}: ZapTabWordmarkProps) {
  return (
    <Tag
      className={`zaptab-wordmark ${sizeClasses[size]} ${className}`.trim()}
      aria-label="ZapTab"
    >
      <span className="zaptab-wordmark-zap">Zap</span>
      <span className="zaptab-wordmark-tab">Tab</span>
    </Tag>
  );
}
