import { Icon } from "./icon";

export function BottomNavigation({ onToday, isToday }: { onToday: () => void; isToday: boolean }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <button type="button" onClick={onToday} aria-current={isToday ? "page" : undefined}>
        <Icon name="today" />
        <span>Today</span>
      </button>
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
