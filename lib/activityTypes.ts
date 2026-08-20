"use client";

import { useCallback } from "react";
import {
  Droplets,
  UtensilsCrossed,
  Pill,
  Activity,
  Smile,
  Heart,
  Brain,
  AlertTriangle,
  Users,
  Moon,
  Bath,
  LucideIcon,
} from "lucide-react";

export interface ActivityOption {
  label: string;
  value: string;
}

export interface ActivityTypeConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  hoverColor: string;
  isMultiSelect: boolean;
  options: ActivityOption[];
  detailPlaceholder: string;
}

/**
 * Tipos de atividades suportadas no Log de Rotina
 * Suporta seleção única (Single-select) ou seleção múltipla (Multi-select) com regra de exclusão para opções negativas.
 */
export const ACTIVITY_TYPES: Record<string, ActivityTypeConfig> = {
  hidratacao: {
    id: "hidratacao",
    label: "Hidratação",
    icon: Droplets,
    color: "sky",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    textColor: "text-sky-700",
    hoverColor: "hover:bg-sky-100",
    isMultiSelect: false,
    options: [
      { label: "Pouca", value: "Pouca" },
      { label: "Adequada", value: "Adequada" },
      { label: "Boa", value: "Boa" },
    ],
    detailPlaceholder: "Ex: 2 copos, água com gelatina, soro...",
  },
  alimentacao: {
    id: "alimentacao",
    label: "Alimentação",
    icon: UtensilsCrossed,
    color: "amber",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
    hoverColor: "hover:bg-amber-100",
    isMultiSelect: false,
    options: [
      { label: "Comeu Tudo", value: "Comeu Tudo" },
      { label: "Metade", value: "Metade" },
      { label: "Recusou", value: "Recusou" },
    ],
    detailPlaceholder: "Ex: arroz, feijão, frango, sopa, fruta...",
  },
  medicacao: {
    id: "medicacao",
    label: "Medicação",
    icon: Pill,
    color: "emerald",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    textColor: "text-emerald-700",
    hoverColor: "hover:bg-emerald-100",
    isMultiSelect: false,
    options: [
      { label: "Administrada", value: "Administrada" },
      { label: "Recusada", value: "Recusada" },
      { label: "Atrasada", value: "Atrasada" },
    ],
    detailPlaceholder: "Ex: Losartana 50mg, Dipirona, Metformina...",
  },
  atividade_fisica: {
    id: "atividade_fisica",
    label: "Atividade Física",
    icon: Activity,
    color: "purple",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
    hoverColor: "hover:bg-purple-100",
    isMultiSelect: true,
    options: [
      { label: "Caminhada", value: "Caminhada" },
      { label: "Fisioterapia", value: "Fisioterapia" },
      { label: "Exercícios de Força", value: "Exercícios de Força" },
      { label: "Yoga/Alongamento", value: "Yoga/Alongamento" },
      { label: "Não realizada", value: "Não realizada" },
    ],
    detailPlaceholder: "Ex: 20 min, parque, acompanhado, treino de marcha...",
  },
  higiene: {
    id: "higiene",
    label: "Higiene",
    icon: Bath,
    color: "blue",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    hoverColor: "hover:bg-blue-100",
    isMultiSelect: true,
    options: [
      { label: "Banho Completo", value: "Banho" },
      { label: "Higiene Bucal", value: "Higiene Bucal" },
      { label: "Troca de Fralda", value: "Troca de Fralda" },
      { label: "Corte de Unhas/Barba", value: "Corte de Unhas/Barba" },
      { label: "Não realizada", value: "Não realizada" },
    ],
    detailPlaceholder: "Ex: banho no leito/cadeira, sem resistência...",
  },
  sono: {
    id: "sono",
    label: "Sono/Descanso",
    icon: Moon,
    color: "indigo",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    textColor: "text-indigo-700",
    hoverColor: "hover:bg-indigo-100",
    isMultiSelect: false,
    options: [
      { label: "Noite Bem Dormida", value: "Noite Bem Dormida" },
      { label: "Insônia", value: "Insônia" },
      { label: "Soneca (Cochilo)", value: "Soneca" },
      { label: "Sono Agitado", value: "Sono Agitado" },
    ],
    detailPlaceholder: "Ex: 6 horas de sono, acordou 3x, sono calmo...",
  },
  cognitivo: {
    id: "cognitivo",
    label: "Estado Cognitivo",
    icon: Brain,
    color: "rose",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    textColor: "text-rose-700",
    hoverColor: "hover:bg-rose-100",
    isMultiSelect: true,
    options: [
      { label: "Lúcido/Alerta", value: "Lúcido" },
      { label: "Confuso/Desorientado", value: "Confuso" },
      { label: "Deprimido", value: "Deprimido" },
      { label: "Agressivo/Irritável", value: "Agressivo" },
      { label: "Apático", value: "Apático" },
    ],
    detailPlaceholder: "Ex: confusão temporal, não reconheceu o espaço...",
  },
  incidente: {
    id: "incidente",
    label: "Incidente/Problema",
    icon: AlertTriangle,
    color: "red",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
    hoverColor: "hover:bg-red-100",
    isMultiSelect: true,
    options: [
      { label: "Sem intercorrências", value: "Sem intercorrências" },
      { label: "Queda", value: "Queda" },
      { label: "Dor Aguda", value: "Dor" },
      { label: "Febre", value: "Febre" },
      { label: "Desidratação", value: "Desidratação" },
      { label: "Infecção Urinária", value: "Infecção Urinária" },
      { label: "Outro", value: "Outro" },
    ],
    detailPlaceholder: "Ex: turno tranquilo sem ocorrências ou febre 38°C às 14h...",
  },
  social: {
    id: "social",
    label: "Social/Familiar",
    icon: Users,
    color: "cyan",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    textColor: "text-cyan-700",
    hoverColor: "hover:bg-cyan-100",
    isMultiSelect: true,
    options: [
      { label: "Visita Familiar", value: "Visita Familiar" },
      { label: "Atividade de Lazer", value: "Atividade de Lazer" },
      { label: "Participação em Grupo", value: "Participação em Grupo" },
      { label: "Chamadas/Vídeo", value: "Chamadas/Vídeo" },
    ],
    detailPlaceholder: "Ex: neto visitou por 2h, jogaram dominó...",
  },
  humor: {
    id: "humor",
    label: "Humor/Bem-Estar",
    icon: Smile,
    color: "yellow",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    textColor: "text-yellow-700",
    hoverColor: "hover:bg-yellow-100",
    isMultiSelect: true,
    options: [
      { label: "Feliz/Animado", value: "Feliz" },
      { label: "Calmo/Normal", value: "Normal" },
      { label: "Tristonho", value: "Tristonho" },
      { label: "Ansioso", value: "Ansioso" },
    ],
    detailPlaceholder: "Ex: sorriu durante o café, demonstrou calma...",
  },
};

export type ActivityType = keyof typeof ACTIVITY_TYPES;

export interface ActivityLog {
  id: string;
  pacienteId: string;
  cuidadorId: string;
  instituicaoId: string;
  dataHora: any;
  tipo: ActivityType;
  status: string;
  resumo?: string;
  detalhe?: string;
  observacao?: string;
}

export function useActivityType(tipo: ActivityType) {
  return ACTIVITY_TYPES[tipo];
}

export function useAllActivityTypes() {
  return Object.values(ACTIVITY_TYPES);
}
