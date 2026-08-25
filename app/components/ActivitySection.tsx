"use client";

import { useMemo, useState } from "react";
import { StickyNote, Check, Clock, Sparkles, CheckCircle2, Loader2, Save } from "lucide-react";
import { ACTIVITY_TYPES, ActivityType } from "@/lib/activityTypes";

interface SavedRecordInfo {
  status: string;
  detalhe?: string;
  horaFormatada?: string;
}

interface ActivitySectionProps {
  tipo: ActivityType;
  selectedStatus: string; // Pode ser string simples (ex: "Comeu Tudo") ou valores separados por vírgula
  onOptionClick: (newStatus: string) => void;
  detailValue: string;
  onDetailChange: (value: string) => void;
  savedInfo?: SavedRecordInfo | null;
  onSaveSingle?: () => Promise<void> | void;
  savingSingle?: boolean;
}

/**
 * ActivitySection - Componente intuitivo de Registro de Atividade de Rotina
 * • Seleção rápida com chips tácteis
 * • Sugestões contextuais de 1 toque (ex: "Pão e café com leite", "No chuveiro com auxílio")
 * • Botão de salvamento direto item a item (ex: salvar só o café da manhã)
 * • Indicador de status salvo no dia
 */
export default function ActivitySection({
  tipo,
  selectedStatus,
  onOptionClick,
  detailValue,
  onDetailChange,
  savedInfo,
  onSaveSingle,
  savingSingle = false,
}: ActivitySectionProps) {
  const config = ACTIVITY_TYPES[tipo] || ACTIVITY_TYPES.cafe_manha || ACTIVITY_TYPES.alimentacao;
  const IconComponent = config.icon;
  const isMultiSelect = Boolean(config.isMultiSelect);

  // Parse das opções atualmente selecionadas
  const selectedList = useMemo(() => {
    if (!selectedStatus || typeof selectedStatus !== "string") return [];
    return selectedStatus
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [selectedStatus]);

  // Handler inteligente de clique em cada opção
  const handleToggleOption = (value: string) => {
    const isExclusiveOption =
      value === "Sem intercorrências" ||
      value === "Não realizada" ||
      value === "Recusou" ||
      value === "Nenhum" ||
      value === "Nenhuma" ||
      value === "Não administrada";

    if (!isMultiSelect) {
      if (selectedList.length === 1 && selectedList[0] === value) {
        onOptionClick("");
      } else {
        onOptionClick(value);
      }
      return;
    }

    if (isExclusiveOption) {
      if (selectedList.includes(value)) {
        onOptionClick("");
      } else {
        onOptionClick(value);
      }
      return;
    }

    let currentFiltered = selectedList.filter(
      (v) =>
        v !== "Sem intercorrências" &&
        v !== "Não realizada" &&
        v !== "Recusou" &&
        v !== "Nenhum" &&
        v !== "Nenhuma" &&
        v !== "Não administrada"
    );

    if (currentFiltered.includes(value)) {
      currentFiltered = currentFiltered.filter((v) => v !== value);
    } else {
      currentFiltered.push(value);
    }

    onOptionClick(currentFiltered.join(", "));
  };

  const handleApplySuggestion = (sugestao: string) => {
    if (!detailValue) {
      onDetailChange(sugestao);
    } else if (!detailValue.includes(sugestao)) {
      onDetailChange(`${detailValue}, ${sugestao}`);
    }
  };

  return (
    <div
      className={`group rounded-3xl md:rounded-[2rem] border p-4 md:p-5 transition-all duration-300 ${
        savedInfo
          ? "border-emerald-200/90 bg-emerald-50/20 shadow-xs"
          : selectedList.length > 0
          ? "border-blue-300 bg-blue-50/10 shadow-md shadow-blue-500/5 ring-2 ring-blue-500/10"
          : "border-slate-200/90 bg-white hover:border-blue-200 hover:shadow-lg shadow-xs"
      }`}
    >
      {/* Header do Card */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 md:gap-3.5 min-w-0">
          <div
            className={`flex h-11 w-11 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-2xl transition-colors ${config.bgColor} ${config.textColor}`}
          >
            <IconComponent className="h-5 w-5 md:h-6 md:w-6" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm md:text-base font-black text-slate-900 tracking-tight">
                {config.label}
              </h3>
              {config.horarioSugerido && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                  <Clock className="h-3 w-3 text-slate-400" />
                  {config.horarioSugerido}
                </span>
              )}
              {isMultiSelect && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  Multi-seleção
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {config.sublabel || "Registre o status correspondente"}
            </p>
          </div>
        </div>

        {/* Badge se já salvo hoje */}
        {savedInfo && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold text-emerald-800 shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Salvo Hoje
          </span>
        )}
      </div>

      {/* Grid de Opções Rápidas (Chips) */}
      <div className="flex flex-wrap gap-2">
        {config.options.map((option) => {
          const isSelected = selectedList.includes(option.value);
          const isSemIntercorrencia = option.value === "Sem intercorrências";
          const isNegative =
            option.value === "Não realizada" ||
            option.value === "Recusou" ||
            option.value === "Nenhum" ||
            option.value === "Nenhuma";

          const activeStyle = isSemIntercorrencia
            ? "border-emerald-500 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 font-black scale-[1.01]"
            : isNegative
            ? "border-amber-400 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20 font-black scale-[1.01]"
            : "border-blue-600 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20 font-black scale-[1.01]";

          const inactiveStyle = `border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100 hover:border-slate-300 font-bold`;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleToggleOption(option.value)}
              className={`flex items-center gap-2 rounded-xl md:rounded-2xl border px-3.5 py-2.5 text-xs md:text-sm transition-all duration-200 cursor-pointer touch-manipulation select-none ${
                isSelected ? activeStyle : inactiveStyle
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                  isSelected
                    ? "border-white bg-white text-blue-700 shadow-xs scale-105"
                    : "border-current opacity-30"
                }`}
              >
                {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
              </span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      {/* Campo de Detalhes / "O que comeu?" / Sugestões rápidas */}
      <div className="mt-3.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 md:p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-500">
            <StickyNote className="h-3.5 w-3.5 text-slate-400" />
            {config.detailLabel || "O que foi consumido / Observação"}
          </label>
        </div>

        <input
          type="text"
          value={detailValue}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder={config.detailPlaceholder}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs md:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        {/* Tags de Sugestão Rápida em 1 Toque */}
        {config.sugestoesRapidas && config.sugestoesRapidas.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 mr-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Sugestões:
            </span>
            {config.sugestoesRapidas.map((sugestao) => (
              <button
                key={sugestao}
                type="button"
                onClick={() => handleApplySuggestion(sugestao)}
                className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all shadow-2xs"
              >
                + {sugestao}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Botão Opcional de Salvamento Rápido Individual */}
      {onSaveSingle && (
        <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <p className="text-[11px] font-medium text-slate-400 truncate">
            {savedInfo ? `Gravado hoje: ${savedInfo.status}` : "Pode salvar agora ou concluir o turno"}
          </p>

          <button
            type="button"
            onClick={onSaveSingle}
            disabled={savingSingle || selectedList.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-blue-600 disabled:opacity-30 disabled:hover:bg-slate-900 text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            {savingSingle ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Salvar {config.label.split(" ")[0]}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

