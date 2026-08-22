import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { CuidadorData } from "./types";

/**
 * Hook para pegar o instituicaoId do usuário logado
 * Usado em todas as queries para garantir isolamento por instituição
 */
export function useInstitucaoId() {
  const [instituicaoId, setInstituicaoId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setInstituicaoId(null);
        setRole(null);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        // Buscar dados do cuidador para pegar instituicaoId e role
        const cuidadorRef = doc(db, "Cuidadores", user.uid);
        const cuidadorSnap = await getDoc(cuidadorRef);

        if (cuidadorSnap.exists()) {
          const data = cuidadorSnap.data();
          setInstituicaoId(data.instituicaoId || null);
          setRole(data.role || "Cuidador");
          setError(null);
        } else {
          // Novo usuário que ainda não completou onboarding
          // Retorna null, não erro
          setInstituicaoId(null);
          setRole(null);
          setError(null);
        }
      } catch (err: unknown) {
        console.error("Erro ao carregar instituicaoId/role:", err);
        setError(err instanceof Error ? err.message : "Erro desconhecido");
        setInstituicaoId(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { instituicaoId, role, loading, error };
}

/**
 * Hook para pegar dados completos do cuidador logado com atualização em tempo real
 */
export function useCuidadorData() {
  const [cuidador, setCuidador] = useState<CuidadorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setCuidador(null);
        setLoading(false);
        if (unsubDoc) unsubDoc();
        return;
      }

      const cuidadorRef = doc(db, "Cuidadores", user.uid);
      unsubDoc = onSnapshot(
        cuidadorRef,
        (snap) => {
          if (snap.exists()) {
            setCuidador({ id: user.uid, ...snap.data() } as CuidadorData);
          } else {
            setCuidador(null);
          }
          setLoading(false);
        },
        (err) => {
          console.error("Erro realtime cuidador:", err);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return { cuidador, loading };
}
