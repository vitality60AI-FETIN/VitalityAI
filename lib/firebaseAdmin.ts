import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Firebase Admin SDK — inicialização server-side
 * Usado exclusivamente nas API Routes (server) para verificar tokens JWT.
 * Não requer service account para verificar tokens (usa chaves públicas do Google).
 */
if (!getApps().length) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export const adminAuth = getAuth();
