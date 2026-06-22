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

/** Vista "Todas": la colección completa del usuario, agrupada, con badge de cantidad. */
export default function TodasPage() {
  const { user } = useAuth();
  const [figuritas, setFiguritas] = useState<FiguritaResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const filtros = useFiltrosFigurita();

  useEffect(() => {
    if (!user?.username) return;
    api.get(`/api/usuarios/${user.username}/figuritas`)
      .then((res) => { setFiguritas(res.data); setLoading(false); })
      .catch((error) => { console.error('Error fetching figuritas:', error); setLoading(false); });
  }, [user?.username]);

  if (loading) return <p className="text-text">Cargando figuritas...</p>;

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
            footer={
              <span className="inline-block px-2 py-1 bg-yellow-600 text-white text-xs font-bold rounded">
                x{f.count}
              </span>
            }
          />
        ))}
      </GrillaFiguritas>
    </>
  );
}
