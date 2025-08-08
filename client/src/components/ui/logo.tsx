export default function Logo({ className = "text-accent" }: { className?: string }) {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className={className} role="img" aria-label="atomtools.ai logo">
      <circle cx="16" cy="16" r="3" fill="currentColor"/>
      <path 
        d="M16 8a8 8 0 0 1 8 8 8 8 0 0 1-8 8 8 8 0 0 1-8-8 8 8 0 0 1 8-8z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        fill="none" 
        opacity="0.6"
      />
      <path 
        d="M8 16h16M16 8v16" 
        stroke="currentColor" 
        strokeWidth="1" 
        opacity="0.4"
      />
    </svg>
  );
}
