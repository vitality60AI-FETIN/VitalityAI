"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { processarFoto } from "../../lib/uploadFoto";

interface FotoUploadProps {
  /** URL atual da foto (para exibir preview — pode ser data URL base64 ou URL externa) */
  currentUrl?: string;
  /** Callback chamado com o data URL base64 da foto após processamento */
  onUpload: (dataUrl: string) => void;
  /** Tamanho do avatar em pixels (default: 96) */
  size?: number;
  /** Label exibida abaixo do avatar */
  label?: string;
  /** Nome para exibir a inicial como fallback */
  fallbackName?: string;
}

export default function FotoUpload({
  currentUrl,
  onUpload,
  size = 96,
  label = "Adicionar Foto",
  fallbackName,
}: FotoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setProcessing(true);

    try {
      const dataUrl = await processarFoto(file);
      setPreviewUrl(dataUrl);
      onUpload(dataUrl);
    } catch (err: any) {
      console.error("Erro ao processar foto:", err);
      setError(err.message || "Erro ao processar foto.");
    } finally {
      setProcessing(false);
      // Limpar input para permitir reupload do mesmo arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setError(null);
    onUpload("");
  };

  const handleClick = () => {
    if (!processing) {
      fileInputRef.current?.click();
    }
  };

  const fallbackInitial = fallbackName?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar Container */}
      <div className="relative group">
        <button
          type="button"
          onClick={handleClick}
          disabled={processing}
          className="relative overflow-hidden rounded-full border-4 border-white shadow-xl shadow-slate-200/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-200/50 hover:-translate-y-1 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait"
          style={{ width: size, height: size }}
          aria-label="Selecionar foto de perfil"
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Foto de perfil"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
              {fallbackName ? (
                <span
                  className="font-black text-slate-500"
                  style={{ fontSize: size * 0.35 }}
                >
                  {fallbackInitial}
                </span>
              ) : (
                <Camera className="text-slate-400" style={{ width: size * 0.3, height: size * 0.3 }} />
              )}
            </div>
          )}

          {/* Overlay de processamento */}
          {processing ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-300 opacity-0 group-hover:opacity-100">
              <Camera className="h-6 w-6 text-white drop-shadow-lg" />
            </div>
          )}
        </button>

        {/* Botão remover foto */}
        {previewUrl && !processing && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-200 transition-all hover:bg-red-600 hover:scale-110 active:scale-95"
            aria-label="Remover foto"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Label */}
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
        {processing ? "Processando..." : label}
      </p>

      {/* Mensagem de erro */}
      {error && (
        <p className="text-xs text-red-500 font-medium text-center max-w-[200px]">
          ⚠️ {error}
        </p>
      )}

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
