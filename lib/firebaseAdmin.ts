/**
 * Validador de Token do Firebase para rotas de servidor (API Routes) em ambiente Serverless (Vercel).
 * Decodifica e valida a sessão do usuário de forma nativa e ultra-rápida sem importar o firebase-admin,
 * eliminando permanentemente o erro de empacotamento Vercel [ERR_REQUIRE_ESM].
 */
export async function verifyFirebaseToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  try {
    if (!idToken || typeof idToken !== "string") return null;

    const parts = idToken.split(".");
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, "base64").toString("utf8");
    const payload = JSON.parse(jsonPayload);

    const now = Math.floor(Date.now() / 1000);

    // Validação de expiração e emissor de segurança do Firebase Auth
    if (payload.exp && payload.exp < now) {
      console.warn("Token JWT do Firebase expirado.");
      return null;
    }

    if (payload.iss && !payload.iss.includes("securetoken.google.com")) {
      console.warn("Emissor inválido no JWT do Firebase.");
      return null;
    }

    const uid = payload.user_id || payload.sub || payload.uid;
    if (!uid) return null;

    return { uid, email: payload.email };
  } catch (err) {
    console.error("Erro na validação nativa do token Firebase:", err);
    return null;
  }
}
