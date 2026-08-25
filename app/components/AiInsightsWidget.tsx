"use client";

import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Loader2,
  X,
  Minus,
  MessageSquare,
  RefreshCw,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { auth, db } from "../../lib/firebase";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { useInstitucaoId, useInstitucaoData } from "../../lib/hooks";
import { normalizeLogRecords, NormalizedLogRecord } from "../../lib/logNormalizer";
import { Paciente } from "../../lib/types";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

// ═══════════════════════════════════════════════════════════
// MASCOTE ROBÔ CLEAN & ANIMADO "VITALITY"
// ═══════════════════════════════════════════════════════════
function CuteRobotMascot({
  size = "md",
  isThinking = false,
  onClick
}: {
  size?: "sm" | "md" | "lg";
  isThinking?: boolean;
  onClick?: () => void;
}) {
  const [isBlinking, setIsBlinking] = useState(false);

  // Piscar de olhos automático a cada 4 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const dimensions = {
    sm: { container: "w-9 h-9", head: "w-8 h-7", eyes: "w-2 h-2" },
    md: { container: "w-14 h-14", head: "w-12 h-10", eyes: "w-3 h-3" },
    lg: { container: "w-24 h-24", head: "w-20 h-16", eyes: "w-4 h-4" }
  }[size];

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer select-none flex flex-col items-center justify-center ${dimensions.container}`}
    >
      {/* Sombra Suave de Flutuação */}
      <div className="absolute -bottom-1 w-3/4 h-1.5 bg-slate-300/40 rounded-full blur-xs animate-pulse" />

      {/* Robozinho Animado Flutuante */}
      <div
        className={`relative flex flex-col items-center justify-center transition-all duration-300 ${
          isThinking ? "animate-bounce" : "animate-float-slow"
        }`}
      >
        {/* Antena com Orbe de Luz */}
        <div className="flex flex-col items-center -mb-0.5">
          <div
            className={`w-2 h-2 rounded-full transition-all ${
              isThinking
                ? "bg-amber-400 shadow-sm shadow-amber-400 animate-ping"
                : "bg-indigo-500 shadow-sm shadow-indigo-500 animate-pulse"
            }`}
          />
          <div className="w-0.5 h-2 bg-slate-300" />
        </div>

        {/* Cabeça do Robô Clean (Estilo White & Indigo Glossy) */}
        <div
          className={`relative ${dimensions.head} bg-gradient-to-b from-white via-slate-50 to-indigo-50/80 rounded-2xl border-2 border-indigo-200 shadow-md flex items-center justify-center p-1 overflow-hidden transition-transform duration-300 hover:scale-105`}
        >
          {/* Viseira Digital Escura */}
          <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-around px-2 relative overflow-hidden shadow-inner">
            {/* Brilho da Viseira */}
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-white/20 rounded-full blur-xs pointer-events-none" />

            {/* Olho Esquerdo */}
            <div
              className={`${dimensions.eyes} rounded-full transition-all duration-150 shadow-xs ${
                isBlinking
                  ? "h-0.5 bg-indigo-400"
                  : isThinking
                  ? "bg-amber-400 shadow-amber-400 animate-pulse"
                  : "bg-cyan-400 shadow-cyan-400"
              }`}
            />

            {/* Sorriso Mínimo Digital */}
            <div className="w-1 h-1 rounded-full bg-indigo-400/40" />

            {/* Olho Direito */}
            <div
              className={`${dimensions.eyes} rounded-full transition-all duration-150 shadow-xs ${
                isBlinking
                  ? "h-0.5 bg-indigo-400"
                  : isThinking
                  ? "bg-amber-400 shadow-amber-400 animate-pulse"
                  : "bg-cyan-400 shadow-cyan-400"
              }`}
            />
          </div>
        </div>

        {/* Detalhe do Pescoço/Bochechas */}
        <div className="flex gap-2 -mt-0.5">
          <div className="w-1 h-1 rounded-full bg-indigo-300" />
          <div className="w-1 h-1 rounded-full bg-indigo-300" />
        </div>
      </div>
    </div>
  );
}

export default function AiInsightsWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [logs, setLogs] = useState<NormalizedLogRecord[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showTooltip, setShowTooltip] = useState(true);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const { instituicaoId } = useInstitucaoId();
  const { instituicao } = useInstitucaoData();

  // Limpar histórico de mensagens quando a instituição for alterada
  useEffect(() => {
    setMessages([]);
  }, [instituicaoId]);

  // Esconde tooltip inicial após 8s
  useEffect(() => {
    const timer = setTimeout(() => setShowTooltip(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isOpen) setShowTooltip(false);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isGenerating, isOpen]);

  // Firestore Listeners
  useEffect(() => {
    if (!instituicaoId) {
      setPacientes([]);
      setLogs([]);
      return;
    }

    const qPacientes = query(
      collection(db, "Pacientes"),
      where("instituicaoId", "==", instituicaoId)
    );
    const unsubPacientes = onSnapshot(
      qPacientes,
      (snap) => {
        const lista: Paciente[] = [];
        snap.forEach((d) => lista.push({ id: d.id, ...d.data() } as Paciente));
        setPacientes(lista);
      },
      (err) => console.error(err)
    );

    const qLogs = query(
      collection(db, "LogsRotina"),
      where("instituicaoId", "==", instituicaoId)
    );
    const unsubLogs = onSnapshot(
      qLogs,
      (snap) => {
        const lista = normalizeLogRecords(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
        setLogs(lista);
      },
      (err) => console.error(err)
    );

    return () => {
      unsubPacientes();
      unsubLogs();
    };
  }, [instituicaoId]);

  const handleSendPrompt = async (textToSend?: string) => {
    const queryText = (textToSend || prompt).trim();
    if (!queryText || isGenerating) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: queryText,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setIsGenerating(true);

    try {
      const sortedLogs = [...logs].sort((a, b) => {
        const getMs = (l: any) => {
          if (l.dataHora?.seconds) return l.dataHora.seconds * 1000;
          if (l.dataHora?.toMillis) return l.dataHora.toMillis();
          if (typeof l.dataHora === "string") {
            const t = new Date(l.dataHora).getTime();
            if (!isNaN(t)) return t;
          }
          if (l.dataTurno) {
            const t = new Date(l.dataTurno).getTime();
            if (!isNaN(t)) return t;
          }
          return 0;
        };
        return getMs(b) - getMs(a);
      });

      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: queryText,
          mode: "chat",
          patients: pacientes,
          logs: sortedLogs.slice(0, 100),
          instituicaoId,
          instituicaoNome: (instituicao as any)?.nome || null
        })
      });

      const data = await res.json();
      let answerText = data.error ? `⚠️ Ops! ${data.error}` : data.result;

      if (!data.error) {
        const currentUser = auth.currentUser;
        if (currentUser && instituicaoId) {
          try {
            await addDoc(collection(db, "InsightsHistory"), {
              instituicaoId,
              cuidadorId: currentUser.uid,
              pergunta: queryText,
              resposta: data.result,
              dataHora: serverTimestamp()
            });
          } catch (e) {
            console.error("Erro ao salvar histórico:", e);
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: answerText,
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: "⚠️ Erro ao conectar com o assistente. Tente novamente.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          FAB — Botão Flutuante Clean (Canto Inferior Direito)
          ═══════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-20 right-3.5 md:bottom-8 md:right-8 z-40 flex flex-col items-end pointer-events-none print:hidden">
        {/* Tooltip Clean */}
        {showTooltip && !isOpen && (
          <div className="mb-3 animate-bounce pointer-events-auto">
            <div className="bg-slate-900 text-white text-xs font-semibold py-2 px-3.5 rounded-2xl shadow-xl flex items-center gap-2 max-w-[220px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Dúvida sobre os idosos? Fale com a IA 🤖</span>
              <button
                onClick={() => setShowTooltip(false)}
                className="ml-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group pointer-events-auto relative flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 hover:scale-105 transition-all duration-300 active:scale-95 touch-manipulation cursor-pointer"
            aria-label="Abrir Assistente Vitality AI"
            title="Vitality AI"
          >
            <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full z-10" />
            <CuteRobotMascot size="sm" />
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          JANELA DO CHAT — Design Clean & Minimalista
          ═══════════════════════════════════════════════════════════ */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[82vh] rounded-3xl bg-white shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200 print:hidden">
          
          {/* Header Clean */}
          <div className="bg-white border-b border-slate-100 px-5 py-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <CuteRobotMascot size="sm" isThinking={isGenerating} />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-slate-900">Vitality AI</h3>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-400">
                  Assistente de Saúde & Rotina
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Nova conversa"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                title="Minimizar"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Área Principal de Mensagens */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 custom-scrollbar">
            
            {/* Tela de Apresentação Inicial Clean */}
            {messages.length === 0 && (
              <div className="space-y-6 animate-in fade-in duration-300 py-2">
                
                {/* Apresentação do Mascote em Destaque Clean */}
                <div className="flex flex-col items-center text-center space-y-3 pt-2">
                  <CuteRobotMascot size="lg" isThinking={isGenerating} />
                  <div>
                    <h4 className="font-black text-xl text-slate-900 tracking-tight">
                      Olá! Sou o Vitality 🤖
                    </h4>
                    <p className="text-xs font-semibold text-slate-500 mt-1 max-w-[280px]">
                      Como posso ajudar com a saúde e rotina dos residentes hoje?
                    </p>
                  </div>
                </div>

                {/* Sugestões de Perguntas Limpas */}
                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                    Sugestões rápidas:
                  </p>

                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendPrompt("Quais idosos estão com alertas de risco ou recusas hoje?")}
                      className="w-full text-left p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all flex items-center justify-between group shadow-2xs"
                    >
                      <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-900">
                        🚨 Idosos com alertas ou recusas de rotina
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendPrompt("Gerar Plano Personalizado de exercícios e nutrição proteica para combate à perda de massa muscular dos residentes.")}
                      className="w-full text-left p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all flex items-center justify-between group shadow-2xs"
                    >
                      <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-900">
                        🏋️‍♂️ Plano de Exercícios & Proteína
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendPrompt("Quais estratégias nutricionais e de hidratação fracionada são recomendadas com base nos logs recentes?")}
                      className="w-full text-left p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all flex items-center justify-between group shadow-2xs"
                    >
                      <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-900">
                        💧 Metas de Hidratação & Nutrição
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de Mensagens */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                } animate-in fade-in duration-200`}
              >
                {msg.sender === "ai" && (
                  <div className="shrink-0 mt-1">
                    <CuteRobotMascot size="sm" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs font-medium leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white rounded-tr-xs shadow-md shadow-indigo-600/10"
                      : "bg-white text-slate-800 rounded-tl-xs border border-slate-200/80 shadow-2xs"
                  }`}
                >
                  {msg.sender === "user" ? (
                    <p className="whitespace-pre-wrap font-bold">{msg.text}</p>
                  ) : (
                    <div className="prose prose-xs prose-slate max-w-none prose-headings:font-black prose-headings:text-slate-900 prose-a:text-indigo-600 prose-strong:text-slate-900 prose-strong:font-black leading-relaxed">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  )}
                  <span
                    className={`block text-[9px] mt-1.5 text-right font-semibold ${
                      msg.sender === "user" ? "text-indigo-200" : "text-slate-400"
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
              </div>
            ))}

            {/* Loader Clean */}
            {isGenerating && (
              <div className="flex gap-3 justify-start animate-in fade-in duration-200">
                <CuteRobotMascot size="sm" isThinking={true} />
                <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-3.5 text-xs font-semibold text-slate-600 flex items-center gap-2.5 shadow-2xs">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span>Vitality está analisando...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Campo de Entrada Clean */}
          <div className="p-3 bg-white border-t border-slate-100 flex flex-col gap-2">
            <div className="relative flex items-center">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua dúvida sobre os residentes..."
                rows={1}
                disabled={isGenerating}
                className="w-full bg-slate-100/70 hover:bg-slate-100 focus:bg-white text-xs font-medium text-slate-800 placeholder-slate-400 rounded-2xl py-3 pl-4 pr-12 outline-none border border-slate-200/60 focus:border-indigo-500 transition-all resize-none max-h-24 min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => handleSendPrompt()}
                disabled={isGenerating || !prompt.trim()}
                className="absolute right-2 p-2 rounded-xl bg-indigo-600 text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                title="Enviar mensagem"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400 font-semibold">
              Pressione <kbd className="px-1 bg-slate-100 rounded border border-slate-200 font-mono">Enter</kbd> para enviar
            </p>
          </div>
        </div>
      )}
    </>
  );
}
