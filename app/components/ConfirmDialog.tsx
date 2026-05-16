"use client";

import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type DialogVariant = "danger" | "success" | "warning" | "info";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  variant?: DialogVariant;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  children?: React.ReactNode;
}

const variantConfig = {
  danger: {
    icon: AlertTriangle,
    buttonClass: "bg-red-600 hover:bg-red-700 active:scale-95",
    headerClass: "text-red-900",
    descClass: "text-red-700/70",
  },
  success: {
    icon: CheckCircle2,
    buttonClass: "bg-emerald-600 hover:bg-emerald-700 active:scale-95",
    headerClass: "text-emerald-900",
    descClass: "text-emerald-700/70",
  },
  warning: {
    icon: AlertCircle,
    buttonClass: "bg-amber-600 hover:bg-amber-700 active:scale-95",
    headerClass: "text-amber-900",
    descClass: "text-amber-700/70",
  },
  info: {
    icon: Info,
    buttonClass: "bg-blue-600 hover:bg-blue-700 active:scale-95",
    headerClass: "text-blue-900",
    descClass: "text-blue-700/70",
  },
};

/**
 * ConfirmDialog - Componente reutilizável de diálogo de confirmação
 * 
 * Uso:
 * ```tsx
 * const [open, setOpen] = useState(false);
 * 
 * <ConfirmDialog
 *   isOpen={open}
 *   title="Deletar paciente?"
 *   description="Esta ação não pode ser desfeita."
 *   variant="danger"
 *   confirmText="Deletar"
 *   onConfirm={async () => {
 *     await deletePaciente();
 *   }}
 *   onCancel={() => setOpen(false)}
 * />
 * ```
 */
export default function ConfirmDialog({
  isOpen,
  title,
  description,
  variant = "info",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isLoading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  // Fechar ao pressionar ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      console.error("Erro ao confirmar:", error);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-300 rounded-[2rem] bg-white shadow-2xl shadow-black/20">
          {/* Header */}
          <div className="relative border-b border-slate-100 px-6 py-6">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                variant === "danger"
                  ? "bg-red-100 text-red-600"
                  : variant === "success"
                  ? "bg-emerald-100 text-emerald-600"
                  : variant === "warning"
                  ? "bg-amber-100 text-amber-600"
                  : "bg-blue-100 text-blue-600"
              }`}>
                <IconComponent className="h-6 w-6" />
              </div>
              <div>
                <h2 className={`text-lg font-black tracking-tight ${config.headerClass}`}>
                  {title}
                </h2>
                {description && (
                  <p className={`mt-1 text-sm ${config.descClass}`}>
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          {children && (
            <div className="px-6 py-4 border-b border-slate-100">
              {children}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 p-6">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 rounded-xl px-4 py-3 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex-1 rounded-xl px-4 py-3 font-bold text-white transition-all disabled:opacity-50 ${config.buttonClass}`}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Processando...
                </span>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
