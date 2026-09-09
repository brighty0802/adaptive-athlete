import Link from "next/link";
import { Icon } from "./icon";

export function BottomNavigation() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <Link href="/" aria-current="page">
        <Icon name="today" />
        <span>Today</span>
      </Link>
      {(["History", "Progress", "More"] as const).map((label) => (
        <button type="button" disabled key={label} aria-label={`${label}, coming soon`}>
          <Icon name={label === "History" ? "history" : label === "Progress" ? "progress" : "more"} />
          <span>{label}</span>
          <small>Soon</small>
        </button>
      ))}
    </nav>
  );
}
