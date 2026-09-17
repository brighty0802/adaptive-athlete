import { Icon } from "./icon";

export function BottomNavigation({ onToday, isToday, onHistory, isHistory }: { onToday: () => void; isToday: boolean; onHistory: () => void; isHistory: boolean }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <button type="button" onClick={onToday} aria-current={isToday ? "page" : undefined}>
        <Icon name="today" />
        <span>Today</span>
      </button>
      <button type="button" onClick={onHistory} aria-current={isHistory ? "page" : undefined}><Icon name="history" /><span>History</span></button>
      {(["Progress", "More"] as const).map((label) => (
        <button type="button" disabled key={label} aria-label={`${label}, coming soon`}>
          <Icon name={label === "Progress" ? "progress" : "more"} />
          <span>{label}</span>
          <small>Soon</small>
        </button>
      ))}
    </nav>
  );
}
