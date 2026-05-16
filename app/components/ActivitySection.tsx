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
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${config.bgColor} ${config.textColor}`}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
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
      <div className={`grid grid-cols-1 gap-2 ${tipo === "medicacao" ? "sm:grid-cols-1" : "sm:grid-cols-3"}`}>
        {config.options.map((option) => (
          <button
            key={option.value}
            onClick={() => onOptionClick(option.value)}
            className={`rounded-2xl border px-3 py-3 text-sm font-bold transition-all ${
              selectedStatus === option.value
                ? "border-emerald-300 bg-emerald-500 text-white shadow-lg shadow-emerald-100"
                : `border-2 border-transparent ${config.bgColor} ${config.textColor} ${config.hoverColor}`
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Detail Input */}
      <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
        <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
          <StickyNote className="h-3.5 w-3.5" />
          Detalhe rápido
        </label>
        <input
          type="text"
          value={detailValue}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder={config.detailPlaceholder}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500"
        />
      </div>
    </div>
  );
}
