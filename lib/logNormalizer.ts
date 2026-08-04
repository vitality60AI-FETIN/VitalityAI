import { ACTIVITY_TYPES, ActivityType } from "./activityTypes";
import { FirestoreTimestamp } from "./types";

export type RawLogRecord = Record<string, any>;

export interface NormalizedLogRecord {
  id: string;
  pacienteId: string;
  tipo: string;
  tipoLabel: string;
  status: string;
  resumo: string;
  detalhe: string;
  observacao: string;
  observacaoTurno: string;
  dataTurno: string;
  dataHora?: FirestoreTimestamp;
  original: RawLogRecord;
}

const getTypeLabel = (tipo: string) => {
  const config = ACTIVITY_TYPES[tipo as ActivityType];
  return config?.label || "Registro";
};

const buildResumo = (status: string, detalhe: string, resumo?: string) => {
  if (resumo && resumo.trim()) return resumo;
  if (status && detalhe) return `${status} - ${detalhe}`;
  return status || detalhe || "Registro";
};

const pickFirstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

export function normalizeLogRecord(raw: RawLogRecord): NormalizedLogRecord {
  const tipo = pickFirstString(raw.tipo, raw.tipoRotina, raw.categoria) || "registro";
  const status = pickFirstString(raw.status, raw.valor, raw.estado);
  const detalhe = pickFirstString(raw.detalhe, raw.detail, raw.conteudo);
  const observacaoTurno = pickFirstString(raw.observacaoTurno, raw.observacao);
  const dataTurno = pickFirstString(raw.dataTurno, raw.dataReferencia);
  const dataHora = raw.dataHora ?? raw.criadoEm ?? raw.createdAt;

  return {
    id: pickFirstString(raw.id) || "",
    pacienteId: pickFirstString(raw.pacienteId),
    tipo,
    tipoLabel: getTypeLabel(tipo),
    status,
    resumo: buildResumo(status, detalhe, pickFirstString(raw.resumo)),
    detalhe,
    observacao: pickFirstString(raw.observacao),
    observacaoTurno,
    dataTurno,
    dataHora,
    original: raw,
  };
}

export function normalizeLogRecords(records: RawLogRecord[]) {
  return records.map((record) => normalizeLogRecord(record));
}

export function hasLegacyShape(record: RawLogRecord) {
  return Boolean(record && (!record.dataTurno || !record.observacaoTurno));
}
