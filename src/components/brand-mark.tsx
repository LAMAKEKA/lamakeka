"use client";

import Image from "next/image";
import { initialsFromName } from "@/lib/tenant/brandTheme";

type Props = {
  logoUrl?: string | null;
  name: string;
  size?: number;
  className?: string;
  roundedClass?: string;
};

/** Logo del campo o iniciales si no hay imagen. */
export function BrandMark({
  logoUrl,
  name,
  size = 40,
  className = "",
  roundedClass = "rounded-xl",
}: Props) {
  const src = logoUrl?.trim() || "";
  const initials = initialsFromName(name);

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center shrink-0 font-bold text-white ${roundedClass} ${className}`}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(10, Math.round(size * 0.36)),
          backgroundColor: "var(--color-cuero)",
          fontFamily: "var(--font-playfair), Georgia, serif",
        }}
        aria-hidden
      >
        {initials}
      </div>
    );
  }

  // Paths locales del app → next/image; URLs Storage → unoptimized.
  const remote = /^https?:\/\//i.test(src);
  if (remote) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`object-cover shrink-0 ${roundedClass} ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`object-cover shrink-0 ${roundedClass} ${className}`}
    />
  );
}
