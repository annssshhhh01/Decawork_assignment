/**
 * ConfirmationModal.jsx
 *
 * Shown when the backend returns { status: "confirmation_required" }.
 * Backdrop click or Cancel dismisses; Confirm re-sends with confirm=true.
 *
 * Props:
 *   task      – original task string
 *   onConfirm – callback() → parent resends with confirm:true
 *   onCancel  – callback() → closes modal
 */

export default function ConfirmationModal({ task, onConfirm, onCancel }) {
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      {/* Panel — stop propagation so clicking inside doesn't close */}
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
              className="w-5 h-5 text-amber-400">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd"/>
            </svg>
          </div>
          <h2 id="modal-title" className="text-base font-semibold text-gray-100">
            Confirm action
          </h2>
        </div>

        {/* Body */}
        <p className="text-sm text-gray-400 leading-relaxed mb-2">
          This action may affect system data. Do you want to proceed?
        </p>
        {task && (
          <p className="text-xs text-gray-500 bg-gray-800 rounded-lg px-3 py-2 font-mono break-all mb-6">
            {task}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
