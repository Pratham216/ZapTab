type AvatarSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASSES: Record<
  AvatarSize,
  { ring: string; inner: string; text: string }
> = {
  xs: {
    ring: "p-px border",
    inner: "w-6 h-6",
    text: "text-[10px]",
  },
  sm: {
    ring: "p-0.5 border-2",
    inner: "w-8 h-8",
    text: "text-sm",
  },
  md: {
    ring: "p-0.5 border-2",
    inner: "w-11 h-11",
    text: "text-lg",
  },
  lg: {
    ring: "p-[3px] border-2",
    inner: "w-[72px] h-[72px]",
    text: "text-2xl",
  },
};

export function getNameInitial(name: string): string {
  return (name.trim().charAt(0) || "?").toUpperCase();
}

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
  const initial = getNameInitial(name);

  return (
    <div
      className={`shrink-0 rounded-full border-amber-500 ${spec.ring} ${className}`}
      aria-hidden
    >
      <div
        className={`${spec.inner} rounded-full bg-amber-500/15 flex items-center justify-center`}
      >
        <span className={`text-amber-400 font-bold ${spec.text}`}>
          {initial}
        </span>
      </div>
    </div>
  );
}
