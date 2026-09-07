import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface GameHelpDialogProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// Native dialog supplies focus containment, Escape handling and focus restoration.
export function GameHelpDialog({ isOpen, title, onClose, children }: GameHelpDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && !dialog?.open) dialog?.showModal();
    if (!isOpen && dialog?.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="game-help-dialog"
      aria-labelledby="game-help-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      <header className="game-help-header">
        <h2 id="game-help-title">{title}</h2>
        <button type="button" aria-label="Cerrar ayuda" onClick={onClose} autoFocus>
          <X size={20} />
        </button>
      </header>
      <div className="game-help-content">{children}</div>
    </dialog>
  );
}
