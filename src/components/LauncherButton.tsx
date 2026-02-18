
import { useBugReporter } from "../hooks";

export function LauncherButton() {
  const {
    config,
    state: { isOpen, draft, assets },
    open
  } = useBugReporter();

  if (isOpen) {
    return null;
  }

  const positionClass = config.theme.position === "bottom-left" ? "is-left" : "is-right";
  const hasActiveDraft = Boolean(draft.title || draft.description || assets.length);

  return (
    <button
      type="button"
      className={`br-launcher ${positionClass}`}
      style={{
        backgroundColor: config.theme.primaryColor,
        borderRadius: config.theme.borderRadius,
        zIndex: config.theme.zIndex
      }}
      onClick={open}
      aria-label="Open bug reporter"
    >
      {hasActiveDraft ? "Resume report" : "Get Help"}
    </button>
  );
}
