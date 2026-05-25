import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import api from '../../services/api';

interface FiguritaBase {
  id: string;
  numero?: number;
  seleccion: { id: string; nombre: string; grupo: string };
  equipo: { id: string; nombre: string };
  categoria: { id: string; nombre: string };
  jugador: { id: string; nombre: string };
}

interface Figurita {
  id: string;
  figuritaBase: FiguritaBase;
  owner?: { id: string; username: string };
}

export default function ColeccionFaltantesPage() {
  const { user } = useAuth();
  const [faltantes, setFaltantes] = useState<Figurita[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeleccion, setFilterSeleccion] = useState('');
  const [filterEquipo, setFilterEquipo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');

  useEffect(() => {
    if (!user?.username) return;

    Promise.all([
      api.get('/api/figuritas'),
      api.get(`/api/usuarios/${user.username}/figuritas`)
    ])
      .then(([allRes, userRes]) => {
        // Get IDs of figuritas user owns
        const ownedIds = new Set(userRes.data.map((f: Figurita) => f.figuritaBase.id));

        // Filter to only ones user doesn't have
        const faltantesList = allRes.data.filter((figurita: Figurita) =>
          !ownedIds.has(figurita.figuritaBase.id)
        );

        setFaltantes(faltantesList);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching faltantes:', error);
        setLoading(false);
      });
  }, [user?.username]);

  if (loading) {
    return (
      <div className="page-enter">
        <p className="text-text">Cargando faltantes...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Search bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar figurita..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Selección"
          value={filterSeleccion}
          onChange={(e) => setFilterSeleccion(e.target.value)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          placeholder="Equipo"
          value={filterEquipo}
          onChange={(e) => setFilterEquipo(e.target.value)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          placeholder="Categoria"
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
      </div>

      {faltantes.length === 0 ? (
        <p className="text-muted">¡Tienes todas las figuritas!</p>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {faltantes.filter(figurita => {
            const matchesSearch = figurita.figuritaBase.jugador.nombre
              .toLowerCase()
              .includes(searchTerm.toLowerCase());

            const matchesSeleccion = filterSeleccion === '' ||
              figurita.figuritaBase.seleccion.nombre.toLowerCase()
              .includes(filterSeleccion.toLowerCase());

            const matchesEquipo = filterEquipo === '' ||
              figurita.figuritaBase.equipo.nombre.toLowerCase()
              .includes(filterEquipo.toLowerCase());

            const matchesCategoria = filterCategoria === '' ||
              figurita.figuritaBase.categoria.nombre.toLowerCase()
              .includes(filterCategoria.toLowerCase());

            return matchesSearch && matchesSeleccion && matchesEquipo && matchesCategoria;
          })
          .map((figurita) => (
            <div key={figurita.id} className="bg-surface p-4 rounded-lg border border-border flex flex-col">
              {/* Image placeholder */}
              <div className="w-full aspect-square bg-surface2 rounded-md mb-3 flex items-center justify-center">
                <p className="text-xs text-muted">Imagen</p>
              </div>

              {/* Info */}
              <p className="text-xs text-muted mb-2">{figurita.figuritaBase.seleccion.nombre}</p>
              <p className="text-sm font-bold text-primary mb-2">{figurita.figuritaBase.jugador.nombre}</p>
              <p className="text-xs text-text mb-2">{figurita.figuritaBase.equipo.nombre}</p>
              <p className="text-xs text-muted mb-3">{figurita.figuritaBase.categoria.nombre}</p>

              {/* Owner info */}
              <div className="mt-auto">
                <p className="text-xs text-muted">
                  Posee: {figurita.owner?.username || 'Desconocido'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
