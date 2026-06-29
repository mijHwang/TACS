import { useState, useEffect } from 'react';
import api from '../../../services/api';
import {
  mapIntercambioToTransaction,
  mapSubastaToTransaction,
  type Transaction,
  type IntercambioResponseDTO,
  type SubastaResponseDTO,
} from '../transacciones';

export function useTransactions(userId: string | undefined, username: string | undefined) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !username || userId === username) return;

    const fetchAll = async () => {
      try {
        const [intercambiosRes, participandoRes, misSubastasRes] = await Promise.all([
          api.get<IntercambioResponseDTO[]>(`/api/intercambios/usuario/${userId}`),
          api.get<SubastaResponseDTO[]>(`/api/subastas/participando/${userId}`),
          api.get<SubastaResponseDTO[]>(`/api/subastas/usuario/${userId}`),
        ]);

        const fromIntercambios = intercambiosRes.data.map(i =>
          mapIntercambioToTransaction(i, userId)
        );

        const fromParticipando = participandoRes.data
          .map(s => mapSubastaToTransaction(s, userId))
          .filter((t): t is Transaction => t !== null);

        const fromMisSubastas = misSubastasRes.data
          .map(s => mapSubastaToTransaction(s, userId))
          .filter((t): t is Transaction => t !== null);

        // Merge, deduplicate by id, sort by date descending
        const all = [...fromIntercambios, ...fromParticipando, ...fromMisSubastas];
        const deduped = Array.from(new Map(all.map(t => [t.id, t])).values());
        deduped.sort((a, b) => b.isoDate.localeCompare(a.isoDate));

        setTransactions(deduped);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [userId, username]);

  return { transactions, loading };
}