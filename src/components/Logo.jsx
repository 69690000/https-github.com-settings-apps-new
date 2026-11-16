export default function Logo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="10.5" r="6.5" fill="var(--accent)" opacity="0.92" />
      <circle cx="10" cy="20.5" r="6.5" fill="var(--accent)" opacity="0.78" />
      <circle cx="22" cy="20.5" r="6.5" fill="var(--accent)" opacity="0.66" />
      <circle cx="16" cy="17.5" r="3.4" fill="var(--bg)" />
    </svg>
  );
}
