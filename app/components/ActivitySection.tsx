"use client";

import { useMemo } from "react";
import { StickyNote, Check, Circle, AlertCircle } from "lucide-react";
import { ACTIVITY_TYPES, ActivityType } from "@/lib/activityTypes";

interface ActivitySectionProps {
  tipo: ActivityType;
  selectedStatus: string; // Pode ser string simples (ex: "Comeu Tudo") ou valores separados por vírgula (ex: "Caminhada, Fisioterapia")
  onOptionClick: (newStatus: string) => void;
  detailValue: string;
  onDetailChange: (value: string) => void;
}

/**
 * ActivitySection - Componente refatorado de Registro de Atividade com suporte a:
 * • Seleção múltipla (Multi-select) para categorias cumulativas
 * • Seleção única (Single-select) para categorias exclusivas
 * • Regra de exclusividade para opções negativas ("Não realizada", "Recusou")
 * • Layout anti-corte de texto e feedback visual de estado instantâneo
 */
export default function ActivitySection({
  tipo,
  selectedStatus,
  onOptionClick,
  detailValue,
  onDetailChange,
}: ActivitySectionProps) {
  const config = ACTIVITY_TYPES[tipo] || ACTIVITY_TYPES.atividade_fisica;
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
      // Single-select: alterna a seleção ou escolhe novo valor
      if (selectedList.length === 1 && selectedList[0] === value) {
        onOptionClick("");
      } else {
        onOptionClick(value);
      }
      return;
    }

    // Multi-select logic:
    if (isExclusiveOption) {
      // Se clicou na opção neutra/exclusiva, limpa todas as outras e marca apenas ela
      if (selectedList.includes(value)) {
        onOptionClick("");
      } else {
        onOptionClick(value);
      }
      return;
    }

    // Se é uma opção positiva de incidente/atividade: remove qualquer opção exclusiva/neutra prévia
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

  // Status visual no cabeçalho do Card
  const renderStatusLegend = () => {
    if (selectedList.length === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
          Nenhuma opção marcada ainda
        </span>
      );
    }

    if (selectedList.length === 1) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100/80 px-2.5 py-0.5 text-xs font-bold text-blue-700">
          <Check className="h-3.5 w-3.5 stroke-[3]" />
          {selectedList[0]}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100/90 px-2.5 py-0.5 text-xs font-bold text-purple-800">
        <Check className="h-3.5 w-3.5 stroke-[3]" />
        {selectedList.length} selecionadas ({selectedList.join(", ")})
      </span>
    );
  };

  return (
    <div className="group rounded-2xl md:rounded-[2rem] border border-slate-200/90 bg-white p-3.5 md:p-5 shadow-sm shadow-slate-200/40 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-900/5">
      {/* Header do Card */}
      <div className="mb-3.5 md:mb-5 flex items-start gap-3 md:gap-4">
        <div
          className={`flex h-10 w-10 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-xl md:rounded-[1.25rem] transition-colors ${config.bgColor} ${config.textColor}`}
        >
          <IconComponent className="h-5 w-5 md:h-6 md:w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              {config.label}
            </h3>
            {isMultiSelect && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                Seleção Múltipla
              </span>
            )}
          </div>

          <p className="text-xs md:text-sm text-slate-600 mt-0.5">
            {tipo === "hidratacao"
              ? "Quanto foi ingerido neste turno?"
              : tipo === "alimentacao"
              ? "Qual foi o nível de aceitação da refeição?"
              : tipo === "medicacao"
              ? "Confirmação da administração dos fármacos"
              : tipo === "atividade_fisica"
              ? "Marque todas as atividades físicas realizadas"
              : tipo === "higiene"
              ? "Marque todos os cuidados de higiene prestados"
              : tipo === "sono"
              ? "Como se comportou o sono e descanso?"
              : tipo === "cognitivo"
              ? "Marque as características mentais observadas"
              : tipo === "incidente"
              ? "Registre quaisquer intercorrências ou queixas"
              : tipo === "social"
              ? "Interações e atividades sociais realizadas"
              : tipo === "humor"
              ? "Estado emocional e humor observados"
              : "Registre os itens do turno"}
          </p>

          <div className="mt-2">{renderStatusLegend()}</div>
        </div>
      </div>

      {/* Grid Flex de Chips sem Corte de Texto */}
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
            ? "border-emerald-500 bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
            : isNegative
            ? "border-amber-400 bg-amber-500 text-white shadow-md shadow-amber-500/20"
            : "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/25";

          const inactiveStyle = `border-slate-200/80 ${config.bgColor} ${config.textColor} ${config.hoverColor} hover:border-slate-300`;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleToggleOption(option.value)}
              className={`flex items-center gap-2 rounded-xl md:rounded-2xl border px-3.5 md:px-4 py-3 text-xs md:text-sm font-bold transition-all duration-150 touch-manipulation select-none cursor-pointer active:scale-[0.97] min-h-[44px] ${
                isSelected ? activeStyle : inactiveStyle
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all pointer-events-none ${
                  isSelected
                    ? "border-white bg-white text-blue-700"
                    : "border-current opacity-40"
                }`}
              >
                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
              </span>
              <span className="whitespace-normal text-left pointer-events-none">{option.label}</span>
            </button>
          );
        })}
      </div>

      {/* Campo de Detalhe Rápido */}
      <div className="mt-3.5 md:mt-5 rounded-xl md:rounded-2xl border border-slate-100 bg-slate-50/80 p-3 md:p-4 transition-colors group-hover:bg-slate-50">
        <label className="mb-2.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          <StickyNote className="h-3.5 w-3.5 text-slate-400" />
          Observação / Detalhe Rápido
        </label>
        <input
          type="text"
          value={detailValue}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder={config.detailPlaceholder}
          className="w-full rounded-xl md:rounded-2xl border-2 border-slate-200/80 bg-white px-3 md:px-4 py-2.5 md:py-3 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:shadow-md focus:shadow-blue-500/10"
        />
      </div>
    </div>
  );
}
