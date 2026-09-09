type IconName = "dumbbell" | "arrow" | "clock" | "check" | "today" | "history" | "progress" | "more" | "brand";

const paths: Record<IconName, React.ReactNode> = {
  dumbbell: <><path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12" /><path d="M8 6v12M16 6v12" /></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  today: <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></>,
  history: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4m8-4v4M4 11h16m-12 4h2m4 0h2" /></>,
  progress: <><path d="M4 4v16h16M7 15l4-5 4 2 5-7" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  brand: <><path d="m3 20 9-16 9 16h-5l-4-7-4 7Z" /><path d="m8 16 8 4" /></>,
};

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
