import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import api from '../../services/api';
import { useFiltrosFigurita } from './components/useFiltrosFigurita';
import FiltrosFigurita from './components/FiltrosFigurita';
import TarjetaColeccion from './components/TarjetaColeccion';
import GrillaFiguritas from './components/GrillaFiguritas';

interface FiguritaResponseDTO {
  id: string;
  figuritaBaseId: string;
  numero: number;
  jugadorNombre: string;
  seleccionNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
  count: number;
  ownerId: string;
  ownerName: string;
}

// Helper to ask for quantity (shared with TodasPage – could be extracted to a common file)
const askQuantity = (max: number): number | null => {
  const input = window.prompt(
    `¿Cuántas copias de esta figurita querés publicar? (máximo ${max})`,
    "1"
  );
  if (input === null) return null;
  const qty = parseInt(input, 10);
  if (isNaN(qty) || qty < 1 || qty > max) {
    alert(`Ingresá un número entre 1 y ${max}`);
    return askQuantity(max);
  }
  return qty;
};

export default function RepetidasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [repetidas, setRepetidas] = useState<FiguritaResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const filtros = useFiltrosFigurita();

  // Fetch function to reuse after publishing
  const fetchRepetidas = useCallback(async () => {
    if (!user?.username) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/usuarios/${user.username}/figuritas/repetidas`);
      setRepetidas(res.data);
    } catch (error) {
      console.error('Error fetching repetidas:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

  useEffect(() => {
    fetchRepetidas();
  }, [fetchRepetidas]);

  // Publish handler: ask quantity, send correct DTO
  const handlePublishExchange = async (figurita: FiguritaResponseDTO) => {
    if (!user) return;

    const cantidad = askQuantity(figurita.count);
    if (cantidad === null) return; // user cancelled

    setPublishingId(figurita.id);
    try {
      await api.post('/api/publicaciones', {
        usuarioId: user.id,
        figuritaBaseId: figurita.figuritaBaseId,
        cantidad: cantidad
      });
      alert(`¡${figurita.jugadorNombre} (x${cantidad}) publicada para intercambio!`);
      // Refresh the list so counts update and published copies disappear
      await fetchRepetidas();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al publicar.';
      alert(msg);
    } finally {
      setPublishingId(null);
    }
  };

  const handleSubastaClick = (figuritaId: string) => {
    navigate('/subastas/nueva', { state: { prefilledFiguritaId: figuritaId } });
  };

  if (loading) return <p className="text-text">Cargando repetidas...</p>;
  const visibles = filtros.filtrar(repetidas);

  return (
    <>
      <FiltrosFigurita filtros={filtros} />
      <GrillaFiguritas isEmpty={visibles.length === 0} emptyMessage="No tenés figuritas repetidas">
        {visibles.map((f) => (
          <TarjetaColeccion
            key={f.figuritaBaseId}
            seleccionNombre={f.seleccionNombre}
            jugadorNombre={f.jugadorNombre}
            equipoNombre={f.equipoNombre}
            categoriaNombre={f.categoriaNombre}
            onPublishExchange={() => handlePublishExchange(f)}
            onAuction={() => handleSubastaClick(f.id)}
            isPublishing={publishingId === f.id}
            canAuction={f.count > 1}
            footer={
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block px-2 py-1 bg-yellow-600 text-white text-xs font-bold rounded">x{f.count}</span>
                <span className="text-xs text-muted">({f.count - 1} repetidas)</span>
              </span>
            }
          />
        ))}
      </GrillaFiguritas>
    </>
  );
}