
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../hooks";
import type { DockSide, ThemeMode } from "../types";
import { getModalOverlayStyle, getModalStyle } from "../styles/inline";

type ModalProps = {
  isOpen: boolean;
  dockSide: DockSide;
  themeMode: ThemeMode;
  buttonColor: string;
  title: string;
  zIndex: number;
  onRequestClose: () => void;
  children: ReactNode;
};

export function Modal({ isOpen, dockSide, themeMode, buttonColor, title, zIndex, onRequestClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(isOpen, dialogRef);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onRequestClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onRequestClose]);

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const overlayStyle = getModalOverlayStyle({ dockSide, themeMode, zIndex });
  const modalStyle = getModalStyle({ dockSide, themeMode, buttonColor });

  return createPortal(
    <div style={overlayStyle}>
      <div ref={dialogRef} style={modalStyle} role="dialog" aria-modal="true" aria-label={title}>
        {children}
      </div>
    </div>,
    document.body
  );
}
