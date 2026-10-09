import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 通用确认弹窗（删除/导入/重新开始等破坏性操作） */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="modal-overlay modal-overlay--visible" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal confirm-modal">
        <h3>{title}</h3>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
