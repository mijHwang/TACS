import { useState, useEffect } from 'react';
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

/**
 * Vista "Mis repetidas": solo figuritas con count>1. Muestra total y excedente
 * (`x{count} ({count-1} repetidas)`). Solo lectura.
 */
export default function RepetidasPage() {
  const { user } = useAuth();
  const [repetidas, setRepetidas] = useState<FiguritaResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const filtros = useFiltrosFigurita();

  useEffect(() => {
    if (!user?.username) return;
    api.get(`/api/usuarios/${user.username}/figuritas/repetidas`)
      .then((res) => { setRepetidas(res.data); setLoading(false); })
      .catch((error) => { console.error('Error fetching repetidas:', error); setLoading(false); });
  }, [user?.username]);

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
            footer={
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block px-2 py-1 bg-yellow-600 text-white text-xs font-bold rounded">
                  x{f.count}
                </span>
                <span className="text-xs text-muted">({f.count - 1} repetidas)</span>
              </span>
            }
          />
        ))}
      </GrillaFiguritas>
    </>
  );
}
