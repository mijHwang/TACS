import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useFiltrosFigurita } from './components/useFiltrosFigurita';
import FiltrosFigurita from './components/FiltrosFigurita';
import TarjetaColeccion from './components/TarjetaColeccion';
import GrillaFiguritas from './components/GrillaFiguritas';

interface FiguritaBaseDTO {
  id: string;
  numero: number;
  jugadorNombre: string;
  seleccionNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
}

export default function ColeccionFaltantesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [faltantes, setFaltantes] = useState<FiguritaBaseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const filtros = useFiltrosFigurita();

  useEffect(() => {
    if (!user?.username) return;
    api.get(`/api/usuarios/${user.username}/figuritas/faltantes`)
      .then((res) => { setFaltantes(res.data); setLoading(false); })
      .catch((error) => { console.error('Error fetching faltantes:', error); setLoading(false); });
  }, [user?.username]);

  if (loading) return <p className="text-text">Cargando faltantes...</p>;

  const visibles = filtros.filtrar(faltantes);

  return (
    <>
      <FiltrosFigurita filtros={filtros} />
      <GrillaFiguritas isEmpty={visibles.length === 0} emptyMessage="¡Tienes todas las figuritas!">
        {visibles.map((f) => (
          // 🟢 The key and onClick are now on the wrapper div
          <div
            key={f.id}
            onClick={() => navigate('/buscar', { 
              state: { filterByBaseId: f.id, figuritaInfo: f } 
            })}
            className="cursor-pointer" // Makes it obvious it's clickable
          >
            <TarjetaColeccion
              seleccionNombre={f.seleccionNombre}
              jugadorNombre={f.jugadorNombre}
              equipoNombre={f.equipoNombre}
              categoriaNombre={f.categoriaNombre}
              footer={<p className="text-xs text-muted">#{f.numero}</p>}
            />
          </div>
        ))}
      </GrillaFiguritas>
    </>
  );
}