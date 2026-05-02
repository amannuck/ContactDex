/** Abstract white mark for dark UI — no text. */
export default function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-white ${className ?? ""}`}
      aria-hidden
    >
      <circle
        cx="24"
        cy="24"
        r="18"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.22"
      />
      <circle
        cx="24"
        cy="24"
        r="12"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.4"
      />
      <path
        d="M24 8v32M8 24h32"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.18"
      />
      <path
        d="M14 14l20 20M34 14L14 34"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.14"
      />
      <circle cx="24" cy="11" r="3" fill="currentColor" opacity="0.95" />
      <circle cx="36" cy="27" r="2.5" fill="currentColor" opacity="0.75" />
      <circle cx="14" cy="30" r="2" fill="currentColor" opacity="0.55" />
    </svg>
  );
}
