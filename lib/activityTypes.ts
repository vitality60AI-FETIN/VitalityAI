"use client";

import { useCallback, useState } from "react";
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
} from "lucide-react";

/**
 * Tipos de atividades suportadas no Log de Rotina
 * Cada tipo tem ícone, cores, e opções específicas
 */
export const ACTIVITY_TYPES = {
  hidratacao: {
    id: "hidratacao",
    label: "Hidratação",
    icon: Droplets,
    color: "sky",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    textColor: "text-sky-700",
    hoverColor: "hover:bg-sky-100",
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
    options: [
      { label: "Caminhada", value: "Caminhada" },
      { label: "Fisioterapia", value: "Fisioterapia" },
      { label: "Exercícios", value: "Exercícios" },
      { label: "Yoga/Alongamento", value: "Yoga/Alongamento" },
      { label: "Não realizada", value: "Não realizada" },
    ],
    detailPlaceholder: "Ex: 20 min, parque, acompanhado, dificuldade na mobilidade...",
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
    options: [
      { label: "Banho", value: "Banho" },
      { label: "Higiene Bucal", value: "Higiene Bucal" },
      { label: "Troca de Fralda", value: "Troca de Fralda" },
      { label: "Higiene Geral", value: "Higiene Geral" },
    ],
    detailPlaceholder: "Ex: banho quente, sem resistência, dificuldade no pé esquerdo...",
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
    options: [
      { label: "Noite Bem Dormida", value: "Noite Bem Dormida" },
      { label: "Insônia", value: "Insônia" },
      { label: "Soneca (Cochilo)", value: "Soneca" },
      { label: "Sono Agitado", value: "Sono Agitado" },
    ],
    detailPlaceholder: "Ex: 6 horas de sono, acordou 3x, sonho agitado...",
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
    options: [
      { label: "Lúcido/Alerta", value: "Lúcido" },
      { label: "Confuso/Desorientado", value: "Confuso" },
      { label: "Deprimido", value: "Deprimido" },
      { label: "Agressivo/Irritável", value: "Agressivo" },
      { label: "Apático", value: "Apático" },
    ],
    detailPlaceholder: "Ex: confusão quanto ao dia, não reconheceu familiar, choroso...",
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
    options: [
      { label: "Queda", value: "Queda" },
      { label: "Dor", value: "Dor" },
      { label: "Febre", value: "Febre" },
      { label: "Desidratação", value: "Desidratação" },
      { label: "Infecção Urinária", value: "Infecção Urinária" },
      { label: "Outro", value: "Outro" },
    ],
    detailPlaceholder: "Ex: queda na cozinha, dor no ombro, febre 38.5°C, sem assistência...",
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
    options: [
      { label: "Visita Familiar", value: "Visita Familiar" },
      { label: "Atividade de Lazer", value: "Atividade de Lazer" },
      { label: "Participação em Grupo", value: "Participação em Grupo" },
      { label: "Chamadas/Vídeo", value: "Chamadas/Vídeo" },
    ],
    detailPlaceholder: "Ex: neto visitou por 2h, jogaram dominó, feliz e animado...",
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
    options: [
      { label: "Feliz/Animado", value: "Feliz" },
      { label: "Normal", value: "Normal" },
      { label: "Tristonho", value: "Tristonho" },
      { label: "Ansioso", value: "Ansioso" },
    ],
    detailPlaceholder: "Ex: demonstrou interesse, sorriu, conversou bastante...",
  },
} as const;

export type ActivityType = keyof typeof ACTIVITY_TYPES;

export interface ActivityLog {
  id: string;
  pacienteId: string;
  cuidadorId: string;
  instituicaoId: string;
  dataHora: any; // Firebase Timestamp
  tipo: ActivityType;
  status: string;
  resumo?: string;
  detalhe?: string;
  observacao?: string;
}

/**
 * Hook para pegar configuração de um tipo de atividade
 */
export function useActivityType(tipo: ActivityType) {
  return ACTIVITY_TYPES[tipo];
}

/**
 * Hook para pegar todas os tipos de atividades
 */
export function useAllActivityTypes() {
  return Object.values(ACTIVITY_TYPES);
}

/**
 * Função para obter a cor da classe Tailwind para um tipo
 */
export function getActivityColorClass(tipo: ActivityType, variant: "bg" | "border" | "text" | "hover" = "bg") {
  const config = ACTIVITY_TYPES[tipo];
  if (variant === "bg") return config.bgColor;
  if (variant === "border") return config.borderColor;
  if (variant === "text") return config.textColor;
  if (variant === "hover") return config.hoverColor;
  return config.bgColor;
}

/**
 * Hook para filtrar por tipo
 */
export function useFilterByActivityType(logs: ActivityLog[], tipo?: ActivityType) {
  return useCallback(
    (filtroTipo?: ActivityType) => {
      const tipoFinal = filtroTipo || tipo;
      if (!tipoFinal) return logs;
      return logs.filter((log) => log.tipo === tipoFinal);
    },
    [logs, tipo]
  );
}
