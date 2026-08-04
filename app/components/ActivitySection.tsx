"use client";

import { StickyNote } from "lucide-react";
import { ACTIVITY_TYPES, ActivityType } from "@/lib/activityTypes";

interface ActivitySectionProps {
  tipo: ActivityType;
  selectedStatus: string;
  onOptionClick: (status: string) => void;
  detailValue: string;
  onDetailChange: (value: string) => void;
}

/**
 * ActivitySection - Componente reutilizável para cada tipo de atividade
 * 
 * Renderiza:
 * - Ícone + label + descrição
 * - Botões de opção
 * - Campo de detalhe opcional
 */
export default function ActivitySection({
  tipo,
  selectedStatus,
  onOptionClick,
  detailValue,
  onDetailChange,
}: ActivitySectionProps) {
  const config = ACTIVITY_TYPES[tipo];
  const IconComponent = config.icon;

  return (
    <div className="group rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5">
      {/* Header */}
      <div className="mb-5 flex items-start gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] ${config.bgColor} ${config.textColor}`}>
          <IconComponent className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            {config.label}
          </h3>
          <p className="text-sm text-slate-500">
            {tipo === "hidratacao"
              ? "Quanto bebeu hoje?"
              : tipo === "alimentacao"
              ? "Comeu? O que foi consumido?"
              : tipo === "medicacao"
              ? "Nomeie o medicamento administrado"
              : tipo === "atividade_fisica"
              ? "Qual atividade foi realizada?"
              : tipo === "higiene"
              ? "Qual tipo de higiene?"
              : tipo === "sono"
              ? "Como foi o sono/descanso?"
              : tipo === "cognitivo"
              ? "Como estava o estado mental?"
              : tipo === "incidente"
              ? "Descrição do problema/incidente"
              : tipo === "social"
              ? "Qual atividade social?"
              : tipo === "humor"
              ? "Como estava o humor?"
              : "Registre a atividade"}
          </p>
          {selectedStatus ? (
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Selecionado: {selectedStatus}
            </p>
          ) : (
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Nenhuma opção marcada ainda
            </p>
          )}
        </div>
      </div>

      {/* Options Grid */}
      <div className={`grid grid-cols-1 gap-2.5 ${tipo === "medicacao" ? "sm:grid-cols-1" : "sm:grid-cols-3"}`}>
        {config.options.map((option) => (
          <button
            key={option.value}
            onClick={() => onOptionClick(option.value)}
            className={`rounded-2xl border px-3 py-3 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 ${
              selectedStatus === option.value
                ? "border-emerald-400 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                : `border-transparent ${config.bgColor} ${config.textColor} ${config.hoverColor}`
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Detail Input */}
      <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors group-hover:bg-slate-50/50">
        <label className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          <StickyNote className="h-3.5 w-3.5" />
          Detalhe rápido
        </label>
        <input
          type="text"
          value={detailValue}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder={config.detailPlaceholder}
          className="w-full rounded-2xl border-2 border-slate-200/80 bg-white px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:shadow-md focus:shadow-blue-500/10"
        />
      </div>
    </div>
  );
}
