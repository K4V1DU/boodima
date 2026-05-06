import React, { createContext, useContext, useState, useCallback } from "react";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * Call inside any component that is a descendant of <ToastProvider>.
 * import { useToast } from "../Overlays/ToastMessages/ToastContext";
 *
 * Usage:
 *   const { toast } = useToast();
 *   toast("Something went wrong.");            // error (default)
 *   toast("Saved successfully!", "success");   // success
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ─── Internal container + items ───────────────────────────────────────────────
function ToastContainer({ toasts, dismiss }) {
  return (
    <div style={{
      position: "fixed",
      top: 20,
      right: 20,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      pointerEvents: "none",
    }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t, onDismiss }) {
  return (
    <div
      className={`app-toast app-toast--${t.type}`}
      style={{ pointerEvents: "all", animation: "appToastIn 0.3s ease" }}
    >
      <div className="app-toast-icon">
        {t.type === "error"   && <AlertCircle  size={16} />}
        {t.type === "success" && <CheckCircle2 size={16} />}
      </div>
      <span className="app-toast-msg">{t.message}</span>
      <button className="app-toast-close" onClick={() => onDismiss(t.id)}>
        <X size={13} />
      </button>
    </div>
  );
}
