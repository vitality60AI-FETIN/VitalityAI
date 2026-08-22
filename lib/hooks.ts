import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { CuidadorData } from "./types";

// ─── Module-Level Cache para evitar Flickering/Piscar no Layout ───
let cachedInstituicaoId: string | null = null;
let cachedRole: string | null = null;
let cachedCuidador: CuidadorData | null = null;
let cachedInstituicao: any | null = null;

/**
 * Hook para pegar o instituicaoId do usuário logado
 * Usado em todas as queries para garantir isolamento por instituição
 */
export function useInstitucaoId() {
  const [instituicaoId, setInstituicaoId] = useState<string | null>(cachedInstituicaoId);
  const [role, setRole] = useState<string | null>(cachedRole);
  const [loading, setLoading] = useState(!cachedInstituicaoId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        cachedInstituicaoId = null;
        cachedRole = null;
        cachedCuidador = null;
        cachedInstituicao = null;
        setInstituicaoId(null);
        setRole(null);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        const cuidadorRef = doc(db, "Cuidadores", user.uid);
        const cuidadorSnap = await getDoc(cuidadorRef);

        if (cuidadorSnap.exists()) {
          const data = cuidadorSnap.data();
          const newInstId = data.instituicaoId || null;
          const newRole = data.role || "Cuidador";

          cachedInstituicaoId = newInstId;
          cachedRole = newRole;

          setInstituicaoId(newInstId);
          setRole(newRole);
          setError(null);
        } else {
          cachedInstituicaoId = null;
          cachedRole = null;
          setInstituicaoId(null);
          setRole(null);
          setError(null);
        }
      } catch (err: unknown) {
        console.error("Erro ao carregar instituicaoId/role:", err);
        setError(err instanceof Error ? err.message : "Erro desconhecido");
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
  const [cuidador, setCuidador] = useState<CuidadorData | null>(cachedCuidador);
  const [loading, setLoading] = useState(!cachedCuidador);

  useEffect(() => {
    let unsubDoc: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        cachedCuidador = null;
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
            const data = { id: user.uid, ...snap.data() } as CuidadorData;
            cachedCuidador = data;
            setCuidador(data);
          } else {
            cachedCuidador = null;
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

/**
 * Hook para pegar dados completos da instituição ativa com atualização em tempo real
 */
export function useInstitucaoData() {
  const { instituicaoId } = useInstitucaoId();
  const [instituicao, setInstituicao] = useState<any | null>(cachedInstituicao);
  const [loading, setLoading] = useState(!cachedInstituicao);

  useEffect(() => {
    const activeInstId = instituicaoId || cachedInstituicaoId;
    if (!activeInstId) {
      setInstituicao(null);
      setLoading(false);
      return;
    }

    const instRef = doc(db, "Instituicoes", activeInstId);
    const unsubDoc = onSnapshot(
      instRef,
      (snap) => {
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          cachedInstituicao = data;
          setInstituicao(data);
        } else {
          cachedInstituicao = null;
          setInstituicao(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Erro realtime instituição:", err);
        setLoading(false);
      }
    );

    return () => unsubDoc();
  }, [instituicaoId]);

  return { instituicao, loading };
}
