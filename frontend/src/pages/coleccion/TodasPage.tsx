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

// 🔧 NEW: Helper to ask for quantity
const askQuantity = (max: number): number | null => {
  const input = window.prompt(
    `¿Cuántas copias de esta figurita querés publicar? (máximo ${max})`,
    "1"
  );
  if (input === null) return null;
  const qty = parseInt(input, 10);
  if (isNaN(qty) || qty < 1 || qty > max) {
    alert(`Ingresá un número entre 1 y ${max}`);
    return askQuantity(max); // recursive prompt until valid or cancel
  }
  return qty;
};

export default function TodasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [figuritas, setFiguritas] = useState<FiguritaResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const filtros = useFiltrosFigurita();

  // 🔧 NEW: extracted fetch function to reuse after publishing
  const fetchFiguritas = useCallback(async () => {
    if (!user?.username) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/usuarios/${user.username}/figuritas`);
      setFiguritas(res.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

  useEffect(() => {
    fetchFiguritas();
  }, [fetchFiguritas]);

  // 🔧 UPDATED: asks for quantity and sends correct DTO
  const handlePublishExchange = async (figurita: FiguritaResponseDTO) => {
    if (!user) return;

    // Ask how many copies to publish
    const cantidad = askQuantity(figurita.count);
    if (cantidad === null) return; // user cancelled

    setPublishingId(figurita.id);
    try {
      await api.post('/api/publicaciones', {
        usuarioId: user.id,
        figuritaBaseId: figurita.figuritaBaseId, // ✅ correct field
        cantidad: cantidad                        // ✅ now present
      });
      alert(`¡${figurita.jugadorNombre} (x${cantidad}) publicada para intercambio!`);
      // Refresh the list so the count updates and published copies disappear
      await fetchFiguritas();
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

  if (loading) return <p className="text-text">Cargando...</p>;
  const visibles = filtros.filtrar(figuritas);

  return (
    <>
      <FiltrosFigurita filtros={filtros} />
      <GrillaFiguritas isEmpty={visibles.length === 0} emptyMessage="No tienes figuritas aún">
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
            footer={<span className="inline-block px-2 py-1 bg-yellow-600 text-white text-xs font-bold rounded">x{f.count}</span>}
          />
        ))}
      </GrillaFiguritas>
    </>
  );
}