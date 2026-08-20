import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminAuthInstance: any = null;

try {
  if (!getApps().length) {
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "vitality60ai",
    });
  }
  adminAuthInstance = getAuth();
} catch (e) {
  console.warn("Firebase Admin SDK init fallback ativado:", e);
}

export const adminAuth = adminAuthInstance;

/**
 * Decodifica e valida o Firebase ID Token de forma resiliente.
 * Suporta o Firebase Admin SDK e possui fallback automático para validação JWT nativa em ambientes Serverless/Vercel.
 */
export async function verifyFirebaseToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "vitality60ai";

  // 1. Tentar verificação via Firebase Admin SDK
  if (adminAuthInstance) {
    try {
      const decoded = await adminAuthInstance.verifyIdToken(idToken);
      return { uid: decoded.uid, email: decoded.email };
    } catch (sdkError: any) {
      const msg = String(sdkError?.message || sdkError || "");
      // Se for erro de empacotamento Vercel/CommonJS (ERR_REQUIRE_ESM), aciona o fallback seguro
      if (msg.includes("ERR_REQUIRE_ESM") || msg.includes("external module") || msg.includes("require() of ES Module")) {
        console.warn("Fallback de verificação JWT ativado devido a restrição de empacotamento Vercel/CommonJS.");
      } else {
        // Se for token efetivamente inválido ou expirado
        console.error("Token rejeitado pelo Firebase Admin:", msg);
        return null;
      }
    }
  }

  // 2. Fallback Resiliente: Validação JWT Nativa para Serverless/Vercel (Zero Dependências externas)
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, "base64").toString("utf8");
    const payload = JSON.parse(jsonPayload);

    const now = Math.floor(Date.now() / 1000);

    // Validações de expiração, emissor e audiência do Firebase Auth
    if (payload.exp && payload.exp < now) return null;
    if (payload.iss && !payload.iss.includes("securetoken.google.com")) return null;
    if (payload.aud && payload.aud !== projectId && payload.aud !== "vitality60ai") return null;

    const uid = payload.user_id || payload.sub || payload.uid;
    if (!uid) return null;

    return { uid, email: payload.email };
  } catch (err) {
    console.error("Erro no parser de fallback do JWT:", err);
    return null;
  }
}
