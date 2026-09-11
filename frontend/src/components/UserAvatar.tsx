type AvatarSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASSES: Record<
  AvatarSize,
  { ring: string; inner: string; text: string }
> = {
  xs: {
    ring: "p-0.5",
    inner: "w-6 h-6",
    text: "text-[10px]",
  },
  sm: {
    ring: "p-0.5",
    inner: "w-8 h-8",
    text: "text-xs font-semibold",
  },
  md: {
    ring: "p-0.5",
    inner: "w-10 h-10",
    text: "text-sm font-bold",
  },
  lg: {
    ring: "p-1",
    inner: "w-14 h-14",
    text: "text-lg font-bold",
  },
};

export function getNameInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const getNameInitial = getNameInitials;

interface UserAvatarProps {
  name: string;
  size?: AvatarSize;
  className?: string;
}

export default function UserAvatar({
  name,
  size = "sm",
  className = "",
}: UserAvatarProps) {
  const spec = SIZE_CLASSES[size];
  const initials = getNameInitials(name);

  return (
    <div
      className={`shrink-0 rounded-full bg-gradient-to-b from-neutral-800 to-black p-[1.5px] border border-amber-500/50 ring-1 ring-amber-400/20 shadow-[0_0_10px_rgba(245,158,11,0.18)] ${className}`}
      aria-hidden
    >
      <div
        className={`${spec.inner} rounded-full bg-gradient-to-b from-neutral-900 to-black border border-neutral-800 flex items-center justify-center`}
      >
        <span
          className={`bg-gradient-to-b from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent tracking-wider font-extrabold ${spec.text}`}
        >
          {initials}
        </span>
      </div>
    </div>
  );
}
