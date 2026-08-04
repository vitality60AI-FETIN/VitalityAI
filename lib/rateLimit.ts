/**
 * Rate Limiter em memória — baseado em janela deslizante por UID.
 *
 * Armazena timestamps de requisições por usuário e rejeita quando
 * o número de chamadas dentro da janela excede o limite configurado.
 *
 * Nota: funciona por instância do servidor. Em deploy serverless (Vercel),
 * cada cold start reinicia o Map — o que é aceitável para proteção de custos,
 * pois ainda limita rajadas dentro de uma mesma instância.
 */

interface RateLimitConfig {
  /** Número máximo de requisições permitidas dentro da janela */
  maxRequests: number;
  /** Duração da janela em milissegundos */
  windowMs: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Limpa entradas expiradas a cada 5 minutos para evitar memory leak
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanupTimer(windowMs: number) {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      // Remove timestamps antigos
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
      // Remove entrada vazia
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Não impedir o encerramento do processo Node
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

export interface RateLimitResult {
  /** Se a requisição foi permitida */
  allowed: boolean;
  /** Quantas requisições restam na janela atual */
  remaining: number;
  /** Timestamp (ms) de quando a janela reseta para a requisição mais antiga */
  resetAt: number;
  /** Total permitido na janela */
  limit: number;
}

/**
 * Verifica e registra uma requisição para o identificador fornecido.
 *
 * @param identifier - Chave única (ex: UID do Firebase)
 * @param config - Configuração de limite
 * @returns Resultado indicando se a requisição é permitida
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { maxRequests, windowMs } = config;
  const now = Date.now();

  ensureCleanupTimer(windowMs);

  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  // Remove timestamps fora da janela
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    // Requisição bloqueada
    const oldestInWindow = entry.timestamps[0];
    const resetAt = oldestInWindow + windowMs;

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      limit: maxRequests,
    };
  }

  // Registra a requisição
  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    resetAt: entry.timestamps[0] + windowMs,
    limit: maxRequests,
  };
}
