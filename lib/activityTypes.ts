"use client";

import {
  Droplets,
  UtensilsCrossed,
  Pill,
  Activity,
  Smile,
  Brain,
  AlertTriangle,
  Users,
  Moon,
  Bath,
  Coffee,
  Sun,
  Sunset,
  ClipboardList,
  LucideIcon,
} from "lucide-react";

export type RoutinePeriod = "manha" | "tarde" | "noite" | "geral";

export interface PeriodConfig {
  id: RoutinePeriod;
  label: string;
  sublabel: string;
  horario: string;
  icon: LucideIcon;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderAccent: string;
}

export const PERIODOS_ROTINA: Record<RoutinePeriod, PeriodConfig> = {
  manha: {
    id: "manha",
    label: "Manhã",
    sublabel: "Despertar, café, medicação e cuidados matinais",
    horario: "06:00 - 12:00",
    icon: Sun,
    color: "amber",
    badgeBg: "bg-amber-50 border-amber-200",
    badgeText: "text-amber-800",
    borderAccent: "border-amber-400",
  },
  tarde: {
    id: "tarde",
    label: "Tarde",
    sublabel: "Almoço, atividades físicas, lanche e convivência",
    horario: "12:00 - 18:00",
    icon: Sunset,
    color: "sky",
    badgeBg: "bg-sky-50 border-sky-200",
    badgeText: "text-sky-800",
    borderAccent: "border-sky-400",
  },
  noite: {
    id: "noite",
    label: "Noite",
    sublabel: "Jantar, medicação noturna, higiene e repouso",
    horario: "18:00 - 23:00",
    icon: Moon,
    color: "indigo",
    badgeBg: "bg-indigo-50 border-indigo-200",
    badgeText: "text-indigo-800",
    borderAccent: "border-indigo-400",
  },
  geral: {
    id: "geral",
    label: "Geral / Alertas",
    sublabel: "Humor, cognição, intercorrências e observações",
    horario: "A qualquer momento",
    icon: ClipboardList,
    color: "rose",
    badgeBg: "bg-rose-50 border-rose-200",
    badgeText: "text-rose-800",
    borderAccent: "border-rose-400",
  },
};

export interface ActivityOption {
  label: string;
  value: string;
}

export interface ActivityTypeConfig {
  id: string;
  label: string;
  sublabel?: string;
  periodo: RoutinePeriod;
  horarioSugerido?: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  hoverColor: string;
  isMultiSelect: boolean;
  options: ActivityOption[];
  detailPlaceholder: string;
  detailLabel?: string;
  sugestoesRapidas?: string[];
}

/**
 * Catálogo Completo de Atividades de Rotina Assistencial
 * Organizado cronologicamente por períodos do dia.
 */
export const ACTIVITY_TYPES: Record<string, ActivityTypeConfig> = {
  // ==========================================
  // ☀️ PERÍODO DA MANHÃ (06h - 12h)
  // ==========================================
  cafe_manha: {
    id: "cafe_manha",
    label: "Café da Manhã",
    sublabel: "Aceitação e o que foi consumido no desjejum",
    periodo: "manha",
    horarioSugerido: "08:00",
    icon: Coffee,
    color: "amber",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
    hoverColor: "hover:bg-amber-100",
    isMultiSelect: false,
    options: [
      { label: "Comeu Tudo", value: "Comeu Tudo" },
      { label: "Metade", value: "Metade" },
      { label: "Pouco / Recusou", value: "Recusou" },
    ],
    detailLabel: "O que comeu?",
    detailPlaceholder: "Ex: Pão com queijo, café com leite, banana, torrada...",
    sugestoesRapidas: ["Pão e café com leite", "Fruta e aveia", "Torrada e chá", "Mingau"],
  },
  banho_higiene: {
    id: "banho_higiene",
    label: "Banho & Higiene Matinal",
    sublabel: "Banho, higiene bucal e troca de roupas",
    periodo: "manha",
    horarioSugerido: "09:00",
    icon: Bath,
    color: "blue",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    hoverColor: "hover:bg-blue-100",
    isMultiSelect: true,
    options: [
      { label: "Banho Completo", value: "Banho Completo" },
      { label: "Higiene Bucal", value: "Higiene Bucal" },
      { label: "Troca de Roupa", value: "Troca de Roupa" },
      { label: "Troca de Fralda", value: "Troca de Fralda" },
      { label: "Não realizada / Recusou", value: "Não realizada" },
    ],
    detailLabel: "Detalhes do banho/higiene",
    detailPlaceholder: "Ex: Banho no chuveiro com auxílio, pele íntegra, cooperativo...",
    sugestoesRapidas: ["No chuveiro (tranquilo)", "No leito", "Com auxílio total", "Sem resistência"],
  },
  medicacao_manha: {
    id: "medicacao_manha",
    label: "Medicação da Manhã",
    sublabel: "Administração dos fármacos do início do dia",
    periodo: "manha",
    horarioSugerido: "08:30",
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
    detailLabel: "Fármacos administrados",
    detailPlaceholder: "Ex: Losartana 50mg, Levotiroxina, Omeprazol...",
    sugestoesRapidas: ["Medicamentos prescritos matinais", "Em jejum", "Com água sem engasgo"],
  },
  hidratacao_manha: {
    id: "hidratacao_manha",
    label: "Hidratação Matinal",
    sublabel: "Água, sucos e ingestão de líquidos matinal",
    periodo: "manha",
    horarioSugerido: "10:00",
    icon: Droplets,
    color: "sky",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    textColor: "text-sky-700",
    hoverColor: "hover:bg-sky-100",
    isMultiSelect: false,
    options: [
      { label: "Boa (> 500ml)", value: "Boa" },
      { label: "Adequada (250ml)", value: "Adequada" },
      { label: "Pouca (< 200ml)", value: "Pouca" },
    ],
    detailLabel: "Líquidos ingeridos",
    detailPlaceholder: "Ex: 2 copos de água, água de coco, suco de laranja...",
    sugestoesRapidas: ["2 copos de água", "Água de coco", "Suco natural"],
  },

  // ==========================================
  // 🌤️ PERÍODO DA TARDE (12h - 18h)
  // ==========================================
  almoco: {
    id: "almoco",
    label: "Almoço",
    sublabel: "Aceitação e cardápio da principal refeição",
    periodo: "tarde",
    horarioSugerido: "12:00",
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
      { label: "Pouco / Recusou", value: "Recusou" },
    ],
    detailLabel: "O que almoçou?",
    detailPlaceholder: "Ex: Arroz, feijão, frango desfiado, purê de batata, legumes...",
    sugestoesRapidas: ["Dieta pastosa completa", "Refeição normal completa", "Aceitou sobremesa"],
  },
  medicacao_tarde: {
    id: "medicacao_tarde",
    label: "Medicação da Tarde",
    sublabel: "Administração dos fármacos do pós-almoço e vespertinos",
    periodo: "tarde",
    horarioSugerido: "14:00",
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
    detailLabel: "Fármacos administrados",
    detailPlaceholder: "Ex: Analgésico prescrito, suplemento vitamínico, colírio...",
    sugestoesRapidas: ["Prescrição pós-almoço", "Suplemento", "Colírios"],
  },
  atividade_fisica: {
    id: "atividade_fisica",
    label: "Atividade Física & Fisio",
    sublabel: "Exercícios, treino de marcha, alongamentos e reabilitação",
    periodo: "tarde",
    horarioSugerido: "15:00",
    icon: Activity,
    color: "purple",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
    hoverColor: "hover:bg-purple-100",
    isMultiSelect: true,
    options: [
      { label: "Caminhada / Marcha", value: "Caminhada" },
      { label: "Fisioterapia", value: "Fisioterapia" },
      { label: "Alongamento", value: "Alongamento" },
      { label: "Exercícios Leves", value: "Exercícios Leves" },
      { label: "Não realizada", value: "Não realizada" },
    ],
    detailLabel: "Observações da atividade",
    detailPlaceholder: "Ex: 20 min de caminhada no pátio com andador, boa disposição...",
    sugestoesRapidas: ["20 min no jardim", "Sessão de fisioterapia motora", "Exercícios respiratórios"],
  },
  lanche_tarde: {
    id: "lanche_tarde",
    label: "Lanche da Tarde & Hidratação",
    sublabel: "Colação vespertina e ingestão hídrica",
    periodo: "tarde",
    horarioSugerido: "16:00",
    icon: Coffee,
    color: "amber",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
    hoverColor: "hover:bg-amber-100",
    isMultiSelect: false,
    options: [
      { label: "Comeu Tudo", value: "Comeu Tudo" },
      { label: "Metade", value: "Metade" },
      { label: "Pouco / Recusou", value: "Recusou" },
    ],
    detailLabel: "O que lanchou?",
    detailPlaceholder: "Ex: Iogurte com bolo, biscoito com chá, suco de uva...",
    sugestoesRapidas: ["Iogurte e fruta", "Chá com biscoito", "Vitamina de frutas"],
  },
  social: {
    id: "social",
    label: "Convivência & Lazer",
    sublabel: "Interações com colegas, visitas de familiares e oficinas",
    periodo: "tarde",
    horarioSugerido: "16:30",
    icon: Users,
    color: "cyan",
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    textColor: "text-cyan-700",
    hoverColor: "hover:bg-cyan-100",
    isMultiSelect: true,
    options: [
      { label: "Visita Familiar", value: "Visita Familiar" },
      { label: "Atividade em Grupo", value: "Atividade em Grupo" },
      { label: "Jogos / Música", value: "Jogos / Música" },
      { label: "Vídeo-chamada", value: "Vídeo-chamada" },
      { label: "Sem interação", value: "Sem interação" },
    ],
    detailLabel: "Detalhes do lazer/social",
    detailPlaceholder: "Ex: Recebeu visita da filha por 1h, participou do bingo...",
    sugestoesRapidas: ["Visita de familiares", "Bingo/jogos de mesa", "Música e conversa na sala"],
  },

  // ==========================================
  // 🌙 PERÍODO DA NOITE (18h - 23h)
  // ==========================================
  jantar: {
    id: "jantar",
    label: "Jantar / Ceia",
    sublabel: "Refeição noturna e ceia antes de dormir",
    periodo: "noite",
    horarioSugerido: "18:30",
    icon: UtensilsCrossed,
    color: "indigo",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    textColor: "text-indigo-700",
    hoverColor: "hover:bg-indigo-100",
    isMultiSelect: false,
    options: [
      { label: "Comeu Tudo", value: "Comeu Tudo" },
      { label: "Metade", value: "Metade" },
      { label: "Sopa / Dieta Leve", value: "Sopa" },
      { label: "Recusou", value: "Recusou" },
    ],
    detailLabel: "O que jantou?",
    detailPlaceholder: "Ex: Sopa de legumes com frango, torrada, ceia com mingau...",
    sugestoesRapidas: ["Sopa de legumes", "Jantar completo", "Mingau de aveia na ceia"],
  },
  medicacao_noite: {
    id: "medicacao_noite",
    label: "Medicação Noturna",
    sublabel: "Administração dos fármacos da noite e para dormir",
    periodo: "noite",
    horarioSugerido: "20:00",
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
    detailLabel: "Fármacos administrados",
    detailPlaceholder: "Ex: Indutor do sono, anti-hipertensivo noturno...",
    sugestoesRapidas: ["Remédios da noite administrados", "Medicação para dormir"],
  },
  higiene_noturna: {
    id: "higiene_noturna",
    label: "Higiene & Preparo Noturno",
    sublabel: "Troca de fralda/roupa, higiene bucal e preparo para o sono",
    periodo: "noite",
    horarioSugerido: "20:30",
    icon: Bath,
    color: "blue",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    hoverColor: "hover:bg-blue-100",
    isMultiSelect: true,
    options: [
      { label: "Troca de Fralda Noturna", value: "Troca de Fralda" },
      { label: "Higiene Bucal", value: "Higiene Bucal" },
      { label: "Troca de Roupa / Pijama", value: "Troca de Roupa" },
      { label: "Não realizada", value: "Não realizada" },
    ],
    detailLabel: "Observações noturnas",
    detailPlaceholder: "Ex: Posicionado confortavelmente no leito, grades elevadas...",
    sugestoesRapidas: ["Troca noturna realizada", "Pele limpa e hidratada", "Grades de proteção elevadas"],
  },
  sono: {
    id: "sono",
    label: "Sono & Repouso",
    sublabel: "Qualidade do sono, tranquilidade e despertares",
    periodo: "noite",
    horarioSugerido: "22:00",
    icon: Moon,
    color: "indigo",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    textColor: "text-indigo-700",
    hoverColor: "hover:bg-indigo-100",
    isMultiSelect: false,
    options: [
      { label: "Dormiu Bem / Calmo", value: "Noite Bem Dormida" },
      { label: "Sono Agitado", value: "Sono Agitado" },
      { label: "Insônia / Dificuldade", value: "Insônia" },
      { label: "Soneca Diurna", value: "Soneca" },
    ],
    detailLabel: "Detalhes do sono",
    detailPlaceholder: "Ex: Adormeceu às 21h30 sem agitação, acordou 1x...",
    sugestoesRapidas: ["Dormiu a noite toda", "Acordou para ir ao banheiro", "Sono calmo"],
  },

  // ==========================================
  // 📋 GERAL & ALERTAS (Qualquer momento)
  // ==========================================
  humor: {
    id: "humor",
    label: "Humor & Bem-Estar",
    sublabel: "Estado emocional e disposição demonstrada no dia",
    periodo: "geral",
    icon: Smile,
    color: "yellow",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    textColor: "text-yellow-700",
    hoverColor: "hover:bg-yellow-100",
    isMultiSelect: true,
    options: [
      { label: "Feliz / Animado", value: "Feliz" },
      { label: "Calmo / Tranquilo", value: "Normal" },
      { label: "Tristonho / Apático", value: "Tristonho" },
      { label: "Ansioso / Agitado", value: "Ansioso" },
    ],
    detailLabel: "Observação do humor",
    detailPlaceholder: "Ex: Muito sorridente no almoço, comunicativo...",
    sugestoesRapidas: ["Tranquilo e colaborativo", "Muito comunicativo", "Mais quieto hoje"],
  },
  cognitivo: {
    id: "cognitivo",
    label: "Estado Cognitivo",
    sublabel: "Orientação de tempo, espaço e lucidez",
    periodo: "geral",
    icon: Brain,
    color: "rose",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    textColor: "text-rose-700",
    hoverColor: "hover:bg-rose-100",
    isMultiSelect: true,
    options: [
      { label: "Lúcido / Orientado", value: "Lúcido" },
      { label: "Confuso / Desorientado", value: "Confuso" },
      { label: "Agressivo / Irritável", value: "Agressivo" },
      { label: "Apático", value: "Apático" },
      { label: "Sonolento", value: "Sonolento" },
    ],
    detailLabel: "Observação cognitiva",
    detailPlaceholder: "Ex: Reconheceu familiares, orientado em tempo e espaço...",
    sugestoesRapidas: ["Lúcido e orientado", "Leve desorientação temporal", "Sonolência pós-almoço"],
  },
  incidente: {
    id: "incidente",
    label: "Intercorrência / Alerta",
    sublabel: "Quedas, dor, febre ou qualquer evento imprevisto",
    periodo: "geral",
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
      { label: "Queixa de Dor", value: "Dor" },
      { label: "Febre", value: "Febre" },
      { label: "Desidratação", value: "Desidratação" },
      { label: "Pressão Alterada", value: "Pressão Alterada" },
      { label: "Outro", value: "Outro" },
    ],
    detailLabel: "Descrição do evento",
    detailPlaceholder: "Ex: Sem queixas ou febre de 37.8°C às 15h, equipe avisada...",
    sugestoesRapidas: ["Dia tranquilo sem intercorrências", "Dor leve tratada", "Sinais vitais normais"],
  },

  // ==========================================
  // RETROCOMPATIBILIDADE (Chaves Legadas)
  // ==========================================
  alimentacao: {
    id: "alimentacao",
    label: "Alimentação Geral",
    sublabel: "Aceitação alimentar",
    periodo: "tarde",
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
  hidratacao: {
    id: "hidratacao",
    label: "Hidratação Geral",
    sublabel: "Ingestão hídrica",
    periodo: "manha",
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
  medicacao: {
    id: "medicacao",
    label: "Medicação Geral",
    sublabel: "Administração de fármacos",
    periodo: "manha",
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
  higiene: {
    id: "higiene",
    label: "Higiene Geral",
    sublabel: "Cuidados de higiene",
    periodo: "manha",
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
      { label: "Não realizada", value: "Não realizada" },
    ],
    detailPlaceholder: "Ex: banho no leito/cadeira...",
  },
};

export type ActivityType = keyof typeof ACTIVITY_TYPES;

export interface ActivityLog {
  id: string;
  pacienteId: string;
  cuidadorId: string;
  instituicaoId: string;
  dataHora: unknown;
  tipo: ActivityType;
  status: string;
  resumo?: string;
  detalhe?: string;
  observacao?: string;
}

/**
 * Lista ordenada cronologicamente dos tipos ativos de rotina para exibição
 */
export const CHRONOLOGICAL_ACTIVITY_KEYS: ActivityType[] = [
  // Manhã
  "cafe_manha",
  "banho_higiene",
  "medicacao_manha",
  "hidratacao_manha",
  // Tarde
  "almoco",
  "medicacao_tarde",
  "atividade_fisica",
  "lanche_tarde",
  "social",
  // Noite
  "jantar",
  "medicacao_noite",
  "higiene_noturna",
  "sono",
  // Geral
  "humor",
  "cognitivo",
  "incidente",
];

export function getPeriodoAtual(): RoutinePeriod {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return "manha";
  if (hora >= 12 && hora < 18) return "tarde";
  if (hora >= 18 && hora <= 23) return "noite";
  return "geral";
}

export function getAtividadesPorPeriodo(periodo: RoutinePeriod | "todos"): ActivityTypeConfig[] {
  if (periodo === "todos") {
    return CHRONOLOGICAL_ACTIVITY_KEYS.map((key) => ACTIVITY_TYPES[key]).filter(Boolean);
  }
  return CHRONOLOGICAL_ACTIVITY_KEYS.map((key) => ACTIVITY_TYPES[key]).filter(
    (item) => item && item.periodo === periodo
  );
}

export function useActivityType(tipo: ActivityType) {
  return ACTIVITY_TYPES[tipo];
}

export function useAllActivityTypes() {
  return CHRONOLOGICAL_ACTIVITY_KEYS.map((key) => ACTIVITY_TYPES[key]).filter(Boolean);
}

