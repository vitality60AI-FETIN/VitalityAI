import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

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
      } catch (err: any) {
        console.error("Erro ao carregar instituicaoId/role:", err);
        setError(err.message);
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
 * Hook para pegar dados completos do cuidador logado
 */
export function useCuidadorData() {
  const [cuidador, setCuidador] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setCuidador(null);
        setLoading(false);
        return;
      }

      try {
        const cuidadorRef = doc(db, "Cuidadores", user.uid);
        const cuidadorSnap = await getDoc(cuidadorRef);

        if (cuidadorSnap.exists()) {
          setCuidador({ id: user.uid, ...cuidadorSnap.data() });
        }
      } catch (err) {
        console.error("Erro ao carregar cuidador:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { cuidador, loading };
}
