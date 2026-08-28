import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const VARIANT_STYLE = {
  danger:  { iconBg: 'bg-red-500',     icon: AlertTriangle, confirmBg: 'bg-red-500 hover:bg-red-600' },
  warning: { iconBg: 'bg-amber-500',   icon: AlertTriangle, confirmBg: 'bg-amber-500 hover:bg-amber-600' },
  success: { iconBg: 'bg-emerald-500', icon: CheckCircle2,  confirmBg: 'bg-emerald-600 hover:bg-emerald-700' },
  info:    { iconBg: 'bg-[#0369A1]',   icon: Info,          confirmBg: 'bg-[#0F2A4A] hover:bg-[#0A1E36]' },
};

/**
 * Generic confirm/alert modal — reused across the app instead of
 * browser alert()/confirm(). Pass `children` for extra form fields
 * (e.g. a required date input) above the action buttons.
 *
 * Props:
 *  - title, message: text content
 *  - variant: 'danger' | 'warning' | 'success' | 'info' (default 'info')
 *  - confirmLabel, cancelLabel: button text
 *  - onConfirm, onClose: handlers
 *  - confirmDisabled: disable the confirm button (e.g. required field empty)
 *  - loading: shows "..." on confirm button and disables both buttons
 *  - hideCancel: for pure alerts with only one button
 */
const ConfirmDialog = ({
  title, message, children,
  variant = 'info',
  confirmLabel = 'Confirmer', cancelLabel = 'Annuler',
  onConfirm, onClose,
  confirmDisabled = false, loading = false, hideCancel = false,
}) => {
  const { iconBg, icon: Icon, confirmBg } = VARIANT_STYLE[variant] ?? VARIANT_STYLE.info;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !loading && onClose?.()}>
      <div onClick={ev => ev.stopPropagation()} className="bg-white rounded-md shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[#F1F5F9]">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
              <Icon size={15} className="text-white" />
            </div>
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          </div>
          {!loading && (
            <button onClick={onClose} className="text-slate-300 hover:text-slate-600 flex-shrink-0"><X size={16} /></button>
          )}
        </div>

        <div className="px-5 py-4 space-y-3">
          {message && <p className="text-xs text-slate-500">{message}</p>}
          {children}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#F1F5F9]">
          {!hideCancel && (
            <button onClick={onClose} disabled={loading} className="text-xs px-3 py-1.5 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40">
              {cancelLabel}
            </button>
          )}
          <button onClick={onConfirm} disabled={confirmDisabled || loading}
            className={`text-xs px-3 py-1.5 rounded-md text-white disabled:opacity-40 font-medium transition ${confirmBg}`}>
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;