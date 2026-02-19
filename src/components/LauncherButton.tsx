
import { useBugReporter } from "../hooks";
import type { LauncherPosition, ThemeMode } from "../types";
import { getLauncherStyle } from "../styles/inline";

type LauncherButtonProps = {
  position?: LauncherPosition;
  text?: string;
  themeMode?: ThemeMode;
  buttonColor?: string;
};

export function LauncherButton({ position, text, themeMode = "dark", buttonColor }: LauncherButtonProps) {
  const {
    config,
    state: { isOpen },
    open
  } = useBugReporter();

  if (isOpen) {
    return null;
  }

  const resolvedPosition = position ?? config.theme.position ?? "bottom-right";
  const label = text ?? "Get Help";
  const resolvedButtonColor = buttonColor ?? config.theme.primaryColor;
  const launcherStyle = getLauncherStyle({
    position: resolvedPosition,
    borderRadius: config.theme.borderRadius,
    zIndex: config.theme.zIndex,
    buttonColor: resolvedButtonColor,
    themeMode
  });

  return (
    <button
      type="button"
      style={launcherStyle}
      onClick={open}
      aria-label="Open bug reporter"
    >
      {label}
    </button>
  );
}
