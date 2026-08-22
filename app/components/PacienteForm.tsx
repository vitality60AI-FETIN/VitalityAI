"use client";

import { useState, useRef } from "react";
import FotoUpload from "./FotoUpload";

export interface PacienteFormData {
  nome: string;
  fotoUrl: string;
  idade: string;
  genero: "Masculino" | "Feminino";
  peso: string;
  altura: string;
  restricoesFisicas: string;
  doencasCronicas: string;
  contatoEmergencia: string;
  objetivo: string;
  consentimentoLGPD?: boolean;
}

interface ValidationErrors {
  [key: string]: string;
}

interface PacienteFormProps {
  onSubmit: (data: PacienteFormData) => Promise<void>;
  isLoading?: boolean;
  submitButtonText?: string;
  initialData?: Partial<PacienteFormData>;
  title?: string;
  description?: string;
}

/**
 * Validações robustas para formulário de paciente
 */
const validarDados = (data: PacienteFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  // Nome
  if (!data.nome || data.nome.trim().length < 3) {
    errors.nome = "Nome deve ter pelo menos 3 caracteres";
  }

  // Idade
  const idade = parseInt(data.idade);
  if (!data.idade || isNaN(idade) || idade < 40 || idade > 130) {
    errors.idade = "Idade deve estar entre 40 e 130 anos";
  }

  // Peso
  const peso = parseFloat(data.peso);
  if (!data.peso || isNaN(peso) || peso < 20 || peso > 300) {
    errors.peso = "Peso deve estar entre 20 e 300 kg";
  }

  // Altura
  const altura = parseInt(data.altura);
  if (!data.altura || isNaN(altura) || altura < 100 || altura > 250) {
    errors.altura = "Altura deve estar entre 100 e 250 cm";
  }

  // Contato de Emergência (telefone básico)
  if (!data.contatoEmergencia || data.contatoEmergencia.replace(/\D/g, "").length < 10) {
    errors.contatoEmergencia = "Telefone inválido (mínimo 10 dígitos)";
  }

  // Consentimento LGPD de Dados Sensíveis de Saúde (Art. 11 LGPD)
  if (!data.consentimentoLGPD) {
    errors.consentimentoLGPD = "Confirmação de consentimento LGPD do titular é obrigatória.";
  }

  return errors;
};

export default function PacienteForm({
  onSubmit,
  isLoading = false,
  submitButtonText = "Salvar Dados",
  initialData,
  title = "Nova Anamnese Digital",
  description = "Preencha os dados de saúde do idoso. Essas informações alimentam nossa IA Adaptativa.",
}: PacienteFormProps) {
  const [form, setForm] = useState<PacienteFormData>({
    nome: initialData?.nome || "",
    fotoUrl: initialData?.fotoUrl || "",
    idade: initialData?.idade || "",
    genero: initialData?.genero || "Masculino",
    peso: initialData?.peso || "",
    altura: initialData?.altura || "",
    restricoesFisicas: initialData?.restricoesFisicas || "",
    doencasCronicas: initialData?.doencasCronicas || "",
    contatoEmergencia: initialData?.contatoEmergencia || "",
    objetivo: initialData?.objetivo || "Manutenção de Massa Magra (Sarcopenia)",
    consentimentoLGPD: initialData?.consentimentoLGPD ?? true,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const name = target.name as keyof PacienteFormData;
    const value = target.value;
    setForm((prev) => ({ ...prev, [name]: value } as PacienteFormData));

    // Limpar erro do campo ao editar
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const name = target.name as string;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar todos os campos
    const newErrors = validarDados(form);
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        await onSubmit(form);
      } catch (error) {
        console.error("Erro ao salvar:", error);
      }
    }
  };

  const getFieldClass = (fieldName: string) => {
    const hasError = errors[fieldName] && touched[fieldName];
    const baseClass = "w-full px-5 py-4 rounded-2xl border-2 transition-all duration-300 outline-none text-base font-medium text-slate-800 placeholder-slate-400";
    const bgClass = "bg-slate-50/70 hover:bg-slate-100 focus:bg-white";

    if (hasError) {
      return `${baseClass} ${bgClass} border-red-400 focus:border-red-500 focus:shadow-lg focus:shadow-red-500/10 focus:-translate-y-0.5`;
    }

    return `${baseClass} ${bgClass} border-transparent focus:border-blue-500 focus:shadow-lg focus:shadow-blue-500/10 focus:-translate-y-0.5`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Cabeçalho */}
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-3 md:text-4xl">
          {title}
        </h1>
        <p className="text-slate-500 text-base md:text-lg max-w-2xl leading-relaxed">
          {description}
        </p>
      </header>

      {/* SEÇÃO 1: DADOS BÁSICOS & BIOMETRIA */}
      <section className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm shadow-slate-100/50">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">1</span>
          Identificação & Biometria
        </h2>

        {/* Upload de Foto do Paciente */}
        <div className="flex justify-center mb-8">
          <FotoUpload
            currentUrl={form.fotoUrl || undefined}
            onUpload={(url) => setForm((prev) => ({ ...prev, fotoUrl: url }))}
            size={112}
            label="Foto do Residente"
            fallbackName={form.nome}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Nome */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Nome Completo do Idoso
            </label>
            <input
              type="text"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              onBlur={handleBlur}
              className={getFieldClass("nome")}
              placeholder="Ex: José da Silva"
            />
            {errors.nome && touched.nome && (
              <p className="text-sm text-red-600 mt-2 ml-1">⚠️ {errors.nome}</p>
            )}
          </div>

          {/* Idade */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Idade
            </label>
            <input
              type="number"
              name="idade"
              value={form.idade}
              onChange={handleChange}
              onBlur={handleBlur}
              className={getFieldClass("idade")}
              placeholder="80"
            />
            {errors.idade && touched.idade && (
              <p className="text-sm text-red-600 mt-2 ml-1">⚠️ {errors.idade}</p>
            )}
          </div>

          {/* Gênero */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Gênero
            </label>
            <select
              name="genero"
              value={form.genero}
              onChange={handleChange}
              className={`${getFieldClass("genero")} appearance-none cursor-pointer`}
            >
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>

          {/* Peso */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Peso (kg)
            </label>
            <input
              type="number"
              step="0.1"
              name="peso"
              value={form.peso}
              onChange={handleChange}
              onBlur={handleBlur}
              className={getFieldClass("peso")}
              placeholder="Ex: 75.5"
            />
            {errors.peso && touched.peso && (
              <p className="text-sm text-red-600 mt-2 ml-1">⚠️ {errors.peso}</p>
            )}
          </div>

          {/* Altura */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Altura (cm)
            </label>
            <input
              type="number"
              name="altura"
              value={form.altura}
              onChange={handleChange}
              onBlur={handleBlur}
              className={getFieldClass("altura")}
              placeholder="Ex: 170"
            />
            {errors.altura && touched.altura && (
              <p className="text-sm text-red-600 mt-2 ml-1">⚠️ {errors.altura}</p>
            )}
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: CONDIÇÕES & OBJETIVOS */}
      <section className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm shadow-slate-100/50">
        <h2 className="text-sm font-black text-blue-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">2</span>
          Condições Clínicas & Objetivos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          {/* Restrições Físicas */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Restrições Biomecânicas
            </label>
            <textarea
              name="restricoesFisicas"
              value={form.restricoesFisicas}
              onChange={handleChange}
              onBlur={handleBlur}
              rows={3}
              className={`${getFieldClass("restricoesFisicas")} resize-none`}
              placeholder="Ex: Dores no joelho, usa andador..."
            />
            <p className="text-xs text-slate-400 mt-1 ml-1">Opcional</p>
          </div>

          {/* Doenças Crônicas */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Doenças Crônicas / Medicações
            </label>
            <textarea
              name="doencasCronicas"
              value={form.doencasCronicas}
              onChange={handleChange}
              onBlur={handleBlur}
              rows={3}
              className={`${getFieldClass("doencasCronicas")} resize-none`}
              placeholder="Ex: Hipertensão, toma Losartana..."
            />
            <p className="text-xs text-slate-400 mt-1 ml-1">Opcional</p>
          </div>
        </div>

        {/* Objetivo */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
            Objetivo Principal de Cuidado
          </label>
          <input
            type="text"
            name="objetivo"
            value={form.objetivo}
            onChange={handleChange}
            onBlur={handleBlur}
            className={getFieldClass("objetivo")}
            placeholder="Ex: manter mobilidade, reduzir quedas, acompanhar cognição..."
          />
          <p className="text-xs text-slate-400 mt-1 ml-1">Campo livre para descrever a meta do cuidado</p>
        </div>
      </section>

      {/* SEÇÃO 3: SEGURANÇA (GATILHO) */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-6 md:p-8 rounded-[2rem] border border-blue-100 shadow-sm">
        <h2 className="text-sm font-black text-blue-700 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-200">3</span>
          Gatilho de Segurança SOS
        </h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Contato de Emergência (WhatsApp)
            </label>
            <input
              type="tel"
              name="contatoEmergencia"
              value={form.contatoEmergencia}
              onChange={handleChange}
              onBlur={handleBlur}
              className={getFieldClass("contatoEmergencia")}
              placeholder="+55 35 99999-9999"
            />
            {errors.contatoEmergencia && touched.contatoEmergencia && (
              <p className="text-sm text-red-600 mt-2 ml-1">
                ⚠️ {errors.contatoEmergencia}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-2 ml-1 italic">
              *Este número receberá o alerta SOS se houver inatividade prolongada no app.
            </p>
          </div>
        </div>
      </section>

      {/* SEÇÃO 4: COMPLIANCE LGPD (DADOS SENSÍVEIS DO TITULAR / IDOSO) */}
      <section className="bg-slate-50/80 p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-md">4</span>
          Consentimento LGPD (Art. 11 - Dados Sensíveis de Saúde)
        </h2>
        <div className="flex items-start gap-4 rounded-2xl bg-white p-5 border border-slate-200 shadow-sm">
          <input
            type="checkbox"
            id="consentimentoLGPD"
            name="consentimentoLGPD"
            checked={Boolean(form.consentimentoLGPD)}
            onChange={(e) => {
              const checked = e.target.checked;
              setForm((prev) => ({ ...prev, consentimentoLGPD: checked }));
              if (checked && errors.consentimentoLGPD) {
                setErrors((prev) => {
                  const copy = { ...prev };
                  delete copy.consentimentoLGPD;
                  return copy;
                });
              }
            }}
            className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="consentimentoLGPD" className="text-sm text-slate-700 leading-relaxed cursor-pointer font-medium">
            <strong>Autorização do Titular ou Responsável Legal</strong>: Confirmo que a instituição possui o consentimento formal e assinado pelo idoso residente (ou seu curador/responsável legal) autorizando a coleta, armazenamento e processamento de seus dados sensíveis de saúde nesta plataforma, em conformidade com o Art. 11 da LGPD (Lei nº 13.709/2018).
          </label>
        </div>
        {errors.consentimentoLGPD && (
          <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 mt-3 font-bold">
            ⚠️ {errors.consentimentoLGPD}
          </p>
        )}
      </section>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || Object.keys(errors).length > 0}
        className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black text-lg shadow-2xl shadow-slate-900/20 transition-all duration-300 hover:bg-blue-600 hover:shadow-blue-600/30 hover:-translate-y-1 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:bg-slate-900 mt-4"
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Salvando...
          </span>
        ) : (
          submitButtonText
        )}
      </button>
    </form>
  );
}
