import type { CSSProperties } from "react";
import type { DockSide, LauncherPosition, ThemeMode } from "../types";

const FONT_FAMILY = "\"IBM Plex Sans\", \"Segoe UI\", sans-serif";

const THEME = {
  dark: {
    bg: "rgba(7, 10, 14, 0.84)",
    text: "#e9eff8",
    muted: "#a8b5c7",
    border: "rgba(202, 219, 243, 0.22)",
    fieldBg: "rgba(255, 255, 255, 0.03)",
    panelBg: "rgba(5, 8, 12, 0.72)",
    secondaryBg: "rgba(255, 255, 255, 0.05)",
    secondaryBgAlt: "rgba(255, 255, 255, 0.03)",
    surfaceBg: "rgba(255, 255, 255, 0.02)",
    overlaySide: "linear-gradient(to left, rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0.08) 45%, transparent 72%)",
    overlayTop: "linear-gradient(to bottom, rgba(0, 0, 0, 0.34), rgba(0, 0, 0, 0.1) 45%, transparent 72%)",
    overlayBottom: "linear-gradient(to top, rgba(0, 0, 0, 0.34), rgba(0, 0, 0, 0.1) 45%, transparent 72%)",
    launcherText: "#f8fbff",
    launcherShadow: "0 10px 28px rgba(0, 0, 0, 0.35)"
  },
  light: {
    bg: "rgba(248, 250, 252, 0.96)",
    text: "#0f172a",
    muted: "#475569",
    border: "rgba(15, 23, 42, 0.18)",
    fieldBg: "rgba(15, 23, 42, 0.04)",
    panelBg: "rgba(241, 245, 249, 0.9)",
    secondaryBg: "rgba(15, 23, 42, 0.06)",
    secondaryBgAlt: "rgba(15, 23, 42, 0.06)",
    surfaceBg: "rgba(15, 23, 42, 0.03)",
    overlaySide: "linear-gradient(to left, rgba(15, 23, 42, 0.16), rgba(15, 23, 42, 0.06) 45%, transparent 72%)",
    overlayTop: "linear-gradient(to bottom, rgba(15, 23, 42, 0.16), rgba(15, 23, 42, 0.06) 45%, transparent 72%)",
    overlayBottom: "linear-gradient(to top, rgba(15, 23, 42, 0.16), rgba(15, 23, 42, 0.06) 45%, transparent 72%)",
    launcherText: "#ffffff",
    launcherShadow: "0 10px 24px rgba(15, 23, 42, 0.24)"
  }
} as const;

type ButtonVariant = "primary" | "secondary" | "danger";

export function getLauncherStyle(options: {
  position: LauncherPosition;
  borderRadius: string;
  zIndex: number;
  buttonColor: string;
  themeMode: ThemeMode;
}): CSSProperties {
  const { position, borderRadius, zIndex, buttonColor, themeMode } = options;
  const [vertical, horizontal] = position.split("-") as ["top" | "bottom", "left" | "right"];
  const theme = THEME[themeMode];

  return {
    position: "fixed",
    [vertical]: "24px",
    [horizontal]: "24px",
    color: theme.launcherText,
    backgroundColor: buttonColor,
    border: 0,
    borderRadius,
    padding: "12px 18px",
    font: `600 14px ${FONT_FAMILY}`,
    cursor: "pointer",
    boxShadow: theme.launcherShadow,
    zIndex
  };
}

export function getModalOverlayStyle(options: { dockSide: DockSide; themeMode: ThemeMode; zIndex: number }): CSSProperties {
  const { dockSide, themeMode, zIndex } = options;
  const theme = THEME[themeMode];

  const base: CSSProperties = {
    position: "fixed",
    inset: 0,
    display: "flex",
    pointerEvents: "none",
    zIndex,
    background: theme.overlaySide
  };

  if (dockSide === "left") {
    return { ...base, alignItems: "stretch", justifyContent: "flex-start" };
  }

  if (dockSide === "top") {
    return { ...base, alignItems: "flex-start", justifyContent: "stretch", background: theme.overlayTop };
  }

  if (dockSide === "bottom") {
    return { ...base, alignItems: "flex-end", justifyContent: "stretch", background: theme.overlayBottom };
  }

  return { ...base, alignItems: "stretch", justifyContent: "flex-end" };
}

export function getModalStyle(options: { dockSide: DockSide; themeMode: ThemeMode; buttonColor: string }): CSSProperties {
  const { dockSide, themeMode, buttonColor } = options;
  const theme = THEME[themeMode];

  const base: CSSProperties = {
    pointerEvents: "auto",
    width: "min(430px, 100vw)",
    height: "100vh",
    overflow: "auto",
    color: theme.text,
    background: theme.bg,
    fontFamily: FONT_FAMILY,
    backdropFilter: "blur(8px)",
    boxShadow: "-14px 0 40px rgba(0, 0, 0, 0.42)",
    borderLeft: "1px solid transparent",
    borderRight: "1px solid transparent",
    borderTop: "1px solid transparent",
    borderBottom: "1px solid transparent",
    ["--br-primary" as string]: buttonColor,
    ["--br-bg" as string]: theme.bg,
    ["--br-text" as string]: theme.text,
    ["--br-muted" as string]: theme.muted,
    ["--br-border" as string]: theme.border,
    ["--br-field-bg" as string]: theme.fieldBg,
    ["--br-panel-bg" as string]: theme.panelBg,
    ["--br-secondary-bg" as string]: theme.secondaryBg,
    ["--br-secondary-bg-alt" as string]: theme.secondaryBgAlt,
    ["--br-surface-bg" as string]: theme.surfaceBg,
    ["--br-danger" as string]: "#ef4444"
  } as CSSProperties;

  if (dockSide === "left") {
    return { ...base, borderRightColor: "var(--br-border)", boxShadow: "14px 0 40px rgba(0, 0, 0, 0.42)" };
  }

  if (dockSide === "top") {
    return {
      ...base,
      width: "100vw",
      maxHeight: "100vh",
      height: "min(460px, 100vh)",
      borderBottomColor: "var(--br-border)",
      boxShadow: "0 14px 40px rgba(0, 0, 0, 0.42)"
    };
  }

  if (dockSide === "bottom") {
    return {
      ...base,
      width: "100vw",
      maxHeight: "100vh",
      height: "min(460px, 100vh)",
      borderTopColor: "var(--br-border)",
      boxShadow: "0 -14px 40px rgba(0, 0, 0, 0.42)"
    };
  }

  return { ...base, borderLeftColor: "var(--br-border)" };
}

export const inlineStyles = {
  modalHeader: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    borderBottom: "1px solid var(--br-border)",
    background: "var(--br-panel-bg)"
  } as CSSProperties,
  modalHeaderActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  } as CSSProperties,
  dockControls: {
    display: "flex",
    gap: "6px"
  } as CSSProperties,
  iconButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--br-border)",
    borderRadius: "8px",
    background: "var(--br-secondary-bg-alt)",
    color: "var(--br-text)",
    width: "30px",
    height: "30px",
    padding: 0,
    cursor: "pointer"
  } as CSSProperties,
  iconSvg: {
    width: "14px",
    height: "14px",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round"
  } as CSSProperties,
  step: {
    padding: "16px"
  } as CSSProperties,
  h2: {
    margin: "0 0 8px"
  } as CSSProperties,
  h3: {
    margin: "0"
  } as CSSProperties,
  p: {
    margin: "0 0 16px",
    color: "var(--br-muted)"
  } as CSSProperties,
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "14px",
    fontSize: "13px",
    fontWeight: 600
  } as CSSProperties,
  input: {
    border: "1px solid var(--br-border)",
    borderRadius: "10px",
    font: `400 14px ${FONT_FAMILY}`,
    color: "var(--br-text)",
    background: "var(--br-field-bg)",
    padding: "10px"
  } as CSSProperties,
  actions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "16px"
  } as CSSProperties,
  captureRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "10px"
  } as CSSProperties,
  captureItem: {
    flex: "1 1 190px"
  } as CSSProperties,
  captureButton: {
    width: "100%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  } as CSSProperties,
  captureIcon: {
    width: "14px",
    height: "14px",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinejoin: "round"
  } as CSSProperties,
  captureDone: {
    fontSize: "11px",
    color: "var(--br-text)",
    opacity: 0.7
  } as CSSProperties,
  captureNote: {
    margin: "10px 0 0",
    color: "var(--br-muted)",
    fontSize: "13px"
  } as CSSProperties,
  dropZone: {
    marginTop: "10px",
    border: "1px dashed var(--br-border)",
    borderRadius: "10px",
    padding: "12px",
    textAlign: "center",
    background: "var(--br-surface-bg)",
    color: "var(--br-muted)",
    fontSize: "13px",
    cursor: "pointer"
  } as CSSProperties,
  dropZoneActive: {
    borderColor: "var(--br-primary)",
    background: "var(--br-secondary-bg)"
  } as CSSProperties,
  hiddenFileInput: {
    display: "none"
  } as CSSProperties,
  previewWrapper: {
    display: "grid",
    gap: "12px",
    marginTop: "14px",
    justifyItems: "center"
  } as CSSProperties,
  preview: {
    width: "100%",
    maxHeight: "240px",
    borderRadius: "10px",
    border: "1px solid var(--br-border)",
    objectFit: "contain",
    background: "var(--br-surface-bg)"
  } as CSSProperties,
  error: {
    color: "#fca5a5",
    fontSize: "14px",
    marginTop: "10px"
  } as CSSProperties,
  summary: {
    border: "1px solid var(--br-border)",
    borderRadius: "10px",
    padding: "12px",
    marginTop: "12px",
    background: "var(--br-surface-bg)"
  } as CSSProperties,
  assets: {
    display: "grid",
    gap: "12px",
    marginTop: "14px",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))"
  } as CSSProperties,
  assetCard: {
    border: "1px solid var(--br-border)",
    borderRadius: "10px",
    padding: "10px",
    background: "var(--br-surface-bg)"
  } as CSSProperties,
  assetType: {
    fontSize: "12px",
    textTransform: "uppercase",
    color: "var(--br-muted)"
  } as CSSProperties,
  uploadProgress: {
    marginTop: "12px",
    fontSize: "14px"
  } as CSSProperties,
  progressTrack: {
    height: "8px",
    borderRadius: "999px",
    background: "rgba(148, 163, 184, 0.25)",
    overflow: "hidden",
    marginTop: "6px"
  } as CSSProperties,
  progressFill: {
    height: "100%",
    background: "var(--br-primary)"
  } as CSSProperties,
  annotation: {
    border: "1px solid var(--br-border)",
    borderRadius: "10px",
    padding: "10px",
    background: "var(--br-surface-bg)"
  } as CSSProperties,
  annotationTools: {
    display: "flex",
    gap: "8px",
    marginBottom: "10px",
    flexWrap: "wrap"
  } as CSSProperties,
  annotationCanvas: {
    width: "auto",
    maxWidth: "100%",
    height: "auto",
    maxHeight: "min(48vh, 360px)",
    display: "block",
    margin: "0 auto",
    border: "1px solid var(--br-border)",
    borderRadius: "8px"
  } as CSSProperties
};

export function getButtonStyle(variant: ButtonVariant, options?: { disabled?: boolean; active?: boolean; fullWidth?: boolean }): CSSProperties {
  const disabled = options?.disabled ?? false;
  const active = options?.active ?? false;
  const fullWidth = options?.fullWidth ?? false;

  const base: CSSProperties = {
    border: "1px solid transparent",
    borderRadius: "10px",
    padding: "8px 12px",
    cursor: disabled ? "not-allowed" : "pointer",
    font: `600 13px ${FONT_FAMILY}`,
    opacity: disabled ? 0.6 : 1,
    width: fullWidth ? "100%" : undefined
  };

  if (variant === "primary") {
    return { ...base, background: "var(--br-primary)", color: "#fff" };
  }

  if (variant === "danger") {
    return { ...base, background: "var(--br-danger)", color: "#fff" };
  }

  return {
    ...base,
    background: active ? "var(--br-primary)" : "var(--br-secondary-bg)",
    borderColor: active ? "var(--br-primary)" : "var(--br-border)",
    color: active ? "#fff" : "var(--br-text)"
  };
}

export function getDockButtonStyle(isActive: boolean): CSSProperties {
  if (!isActive) {
    return inlineStyles.iconButton;
  }

  return {
    ...inlineStyles.iconButton,
    borderColor: "var(--br-primary)",
    color: "#fff",
    background: "var(--br-primary)",
    boxShadow: "0 0 0 1px rgba(255, 255, 255, 0.35) inset"
  };
}
