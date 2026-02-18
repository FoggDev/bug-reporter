
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../hooks";
import type { DockSide } from "../types";

type ModalProps = {
  isOpen: boolean;
  dockSide: DockSide;
  title: string;
  zIndex: number;
  onRequestClose: () => void;
  children: ReactNode;
};

export function Modal({ isOpen, dockSide, title, zIndex, onRequestClose, children }: ModalProps) {
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

  return createPortal(
    <div className={`br-modal-overlay is-${dockSide}`} style={{ zIndex }}>
      <div ref={dialogRef} className={`br-modal is-${dockSide}`} role="dialog" aria-modal="true" aria-label={title}>
        {children}
      </div>
    </div>,
    document.body
  );
}
