/**
 * BenthicIcon
 * Inline SVG of the Benthic Guardian brand mark.
 * Using inline SVG (not <img>) keeps it themeable and sharp at all sizes.
 */

interface BenthicIconProps {
  /** CSS size string or number (pixels). Defaults to 32. */
  size?: number | string;
  className?: string;
}

export default function BenthicIcon({ size = 32, className }: BenthicIconProps) {
  const s = typeof size === 'number' ? `${size}px` : size;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      width={s}
      height={s}
      className={className}
      aria-label="Benthic Guardian"
      role="img"
    >
      {/* Shield outline */}
      <path
        d="M24 4L6 11v13c0 10.5 7.5 18.7 18 21 10.5-2.3 18-10.5 18-21V11L24 4z"
        fill="none"
        stroke="var(--accent-cyan)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        opacity={0.5}
      />

      <clipPath id="bgShieldClip">
        <path d="M24 5.5L7 12v12c0 10 7 17.8 17 20 10-2.2 17-10 17-20V12L24 5.5z" />
      </clipPath>

      {/* Water fill */}
      <rect x="6" y="26" width="36" height="18" fill="var(--bg-primary)" clipPath="url(#bgShieldClip)" />

      {/* Wave 1 */}
      <path
        d="M6 27 Q12 23 18 27 Q24 31 30 27 Q36 23 42 27"
        fill="none"
        stroke="var(--accent-cyan)"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity={0.9}
      />
      {/* Wave 2 */}
      <path
        d="M6 31 Q12 27 18 31 Q24 35 30 31 Q36 27 42 31"
        fill="none"
        stroke="var(--accent-teal)"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity={0.65}
      />

      {/* Coral left */}
      <path
        d="M15 40 L15 33 Q14 30 11 29"
        fill="none"
        stroke="var(--accent-teal)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        clipPath="url(#bgShieldClip)"
      />
      <path
        d="M15 36 Q13 34 11 34"
        fill="none"
        stroke="var(--accent-teal)"
        strokeWidth="1.4"
        strokeLinecap="round"
        clipPath="url(#bgShieldClip)"
      />
      <circle cx="11" cy="29" r="1.4" fill="var(--accent-teal)" clipPath="url(#bgShieldClip)" />
      <circle cx="11" cy="34" r="1.1" fill="var(--accent-teal)" clipPath="url(#bgShieldClip)" />
      <circle cx="15" cy="33" r="1.1" fill="var(--accent-teal)" clipPath="url(#bgShieldClip)" />

      {/* Coral centre */}
      <path
        d="M24 42 L24 33"
        fill="none"
        stroke="var(--accent-cyan)"
        strokeWidth="1.8"
        strokeLinecap="round"
        clipPath="url(#bgShieldClip)"
      />
      <path
        d="M24 38 Q21.5 36 20 34"
        fill="none"
        stroke="var(--accent-cyan)"
        strokeWidth="1.4"
        strokeLinecap="round"
        clipPath="url(#bgShieldClip)"
      />
      <path
        d="M24 36 Q26.5 34 28 32"
        fill="none"
        stroke="var(--accent-cyan)"
        strokeWidth="1.4"
        strokeLinecap="round"
        clipPath="url(#bgShieldClip)"
      />
      <circle cx="24" cy="33" r="1.3" fill="var(--accent-cyan)" clipPath="url(#bgShieldClip)" />
      <circle cx="20" cy="34" r="1.1" fill="var(--accent-cyan)" clipPath="url(#bgShieldClip)" />
      <circle cx="28" cy="32" r="1.1" fill="var(--accent-cyan)" clipPath="url(#bgShieldClip)" />

      {/* Coral right */}
      <path
        d="M33 40 L33 33 Q34 30 37 29"
        fill="none"
        stroke="var(--accent-teal)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        clipPath="url(#bgShieldClip)"
      />
      <path
        d="M33 36 Q35 34 37 34"
        fill="none"
        stroke="var(--accent-teal)"
        strokeWidth="1.4"
        strokeLinecap="round"
        clipPath="url(#bgShieldClip)"
      />
      <circle cx="37" cy="29" r="1.4" fill="var(--accent-teal)" clipPath="url(#bgShieldClip)" />
      <circle cx="37" cy="34" r="1.1" fill="var(--accent-teal)" clipPath="url(#bgShieldClip)" />
      <circle cx="33" cy="33" r="1.1" fill="var(--accent-teal)" clipPath="url(#bgShieldClip)" />

      {/* Sensor ping (monitoring dot) */}
      <circle cx="24" cy="18" r="2.5" fill="var(--accent-cyan)" opacity={0.9} />
      <circle cx="24" cy="18" r="4.5" fill="none" stroke="var(--accent-cyan)" strokeWidth="1" opacity={0.35} />
      <circle cx="24" cy="18" r="7" fill="none" stroke="var(--accent-cyan)" strokeWidth="0.7" opacity={0.18} />
    </svg>
  );
}
