import { useState, useEffect } from 'react';
import api, { type PagedResponse } from '../../../services/api';
import {
  mapIntercambioToTransaction,
  mapSubastaToTransaction,
  type Transaction,
  type IntercambioResponseDTO,
  type SubastaResponseDTO,
} from '../transacciones';

// Estos 3 endpoints ahora están paginados; HistorialPage sigue siendo client-side, así que
// recorremos todas las páginas (size=100) hasta `last` para reconstruir el historial completo.
async function fetchAllPages<T>(url: string): Promise<T[]> {
  const out: T[] = [];
  let page = 0;
  for (;;) {
    const res = await api.get<PagedResponse<T>>(url, { params: { page, size: 100 } });
    out.push(...res.data.content);
    if (res.data.last || res.data.content.length === 0) break;
    page += 1;
  }
  return out;
}

export function useTransactions(userId: string | undefined, username: string | undefined) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId || !username || userId === username) return;

    const fetchAll = async () => {
      setError(false);
      try {
        const [intercambios, participando, misSubastas] = await Promise.all([
          fetchAllPages<IntercambioResponseDTO>(`/api/intercambios/usuario/${userId}`),
          fetchAllPages<SubastaResponseDTO>(`/api/subastas/participando/${userId}`),
          fetchAllPages<SubastaResponseDTO>(`/api/subastas/usuario/${userId}`),
        ]);

        const fromIntercambios = intercambios.map(i =>
          mapIntercambioToTransaction(i, userId)
        );

        const fromParticipando = participando
          .map(s => mapSubastaToTransaction(s, userId))
          .filter((t): t is Transaction => t !== null);

        const fromMisSubastas = misSubastas
          .map(s => mapSubastaToTransaction(s, userId))
          .filter((t): t is Transaction => t !== null);

        // Merge, deduplicate by id, sort by date descending
        const all = [...fromIntercambios, ...fromParticipando, ...fromMisSubastas];
        const deduped = Array.from(new Map(all.map(t => [t.id, t])).values());
        deduped.sort((a, b) => b.isoDate.localeCompare(a.isoDate));

        setTransactions(deduped);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [userId, username]);

  return { transactions, loading, error };
}