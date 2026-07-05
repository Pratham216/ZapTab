import { useEffect, useRef } from "react";

const SPARKLE_COUNT = 12;

export default function ClickSparkles() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const spawnSparkles = (event: MouseEvent) => {
      for (let i = 0; i < SPARKLE_COUNT; i++) {
        const sparkle = document.createElement("span");
        const angle = (Math.PI * 2 * i) / SPARKLE_COUNT + (Math.random() - 0.5) * 0.6;
        const distance = 20 + Math.random() * 36;
        const size = 2 + Math.random() * 3;

        sparkle.className = "click-sparkle";
        sparkle.style.left = `${event.clientX}px`;
        sparkle.style.top = `${event.clientY}px`;
        sparkle.style.width = `${size}px`;
        sparkle.style.height = `${size}px`;
        sparkle.style.setProperty("--tx", `${Math.cos(angle) * distance}px`);
        sparkle.style.setProperty("--ty", `${Math.sin(angle) * distance}px`);
        sparkle.style.setProperty("--delay", `${Math.random() * 0.06}s`);

        layer.appendChild(sparkle);
        sparkle.addEventListener("animationend", () => sparkle.remove(), { once: true });
      }
    };

    document.addEventListener("mousedown", spawnSparkles);
    return () => document.removeEventListener("mousedown", spawnSparkles);
  }, []);

  return (
    <div
      ref={layerRef}
      className="click-sparkles pointer-events-none fixed inset-0 z-9999 overflow-hidden"
      aria-hidden
    />
  );
}
