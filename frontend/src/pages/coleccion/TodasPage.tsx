import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import api from '../../services/api';
import { useFiguritasPaginadas, type FiguritaResponseDTO } from '../../hooks/useFiguritas';
import { useFiltrosServidor } from './components/useFiltrosServidor';
import { askQuantity } from './components/askQuantity';
import FiltrosFigurita from './components/FiltrosFigurita';
import TarjetaColeccion from './components/TarjetaColeccion';
import GrillaFiguritas from './components/GrillaFiguritas';
import Paginador from '../../components/Paginador';
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
import AgregarFiguritaModal from './components/AgregarFiguritaModal';

/**
 * Vista "Todas": la colección del usuario, agrupada, paginada y filtrada server-side.
 * Cada tarjeta permite publicar copias para intercambio o subastarlas (happy path).
 */
export default function TodasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { filtros, page, setPage, params, pageSize, setPageSize, options } = useFiltrosServidor();
  const { data, isLoading, refetch } = useFiguritasPaginadas(user?.username, params);
  const figuritas = data?.content ?? [];
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const handlePublishExchange = async (figurita: FiguritaResponseDTO) => {
    if (!user) return;
    const cantidad = askQuantity(figurita.count);
    if (cantidad === null) return; // cancelado

    setPublishingId(figurita.id);
    try {
      await api.post('/api/publicaciones', {
        usuarioId: user.id,
        figuritaBaseId: figurita.figuritaBaseId,
        cantidad,
      });
      alert(`¡${figurita.jugadorNombre} (x${cantidad}) publicada para intercambio!`);
      await refetch(); // refresca counts y saca las copias publicadas
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

  return (
    <>
      <FiltrosFigurita filtros={filtros} />
      {isLoading ? (
        <p className="text-text">Cargando figuritas...</p>
      ) : (
        <>
          <ListToolbar total={data?.totalElements ?? 0}>
            <button
              onClick={() => setShowAdd(true)}
              className="px-3 py-1.5 rounded-md text-sm font-semibold bg-primary/15 text-primary border border-primary/40 hover:bg-primary/25 transition-colors"
            >
              + Agregar Figurita
            </button>
            <PageSizeSelector value={pageSize} options={options} onChange={(n) => setPageSize(n)} />
          </ListToolbar>
          <GrillaFiguritas isEmpty={figuritas.length === 0} emptyMessage="No tienes figuritas aún">
            {figuritas.map((f) => (
              <TarjetaColeccion
                key={f.figuritaBaseId}
                seleccionNombre={f.seleccionNombre}
                jugadorNombre={f.jugadorNombre}
                equipoNombre={f.equipoNombre}
                categoriaNombre={f.categoriaNombre}
                imagenUrl={f.imagenUrl}
                onPublishExchange={() => handlePublishExchange(f)}
                onAuction={() => handleSubastaClick(f.id)}
                isPublishing={publishingId === f.id}
                canAuction={f.count > 1}
                footer={
                  <span className="inline-block px-2 py-1 bg-yellow-600 text-white text-xs font-bold rounded">
                    x{f.count}
                  </span>
                }
              />
            ))}
          </GrillaFiguritas>
          <Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
        </>
      )}
      {showAdd && (
        <AgregarFiguritaModal
          mode="poseida"
          onClose={() => setShowAdd(false)}
          onDone={() => refetch()}
        />
      )}
    </>
  );
}
