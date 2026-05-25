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

interface FiguritaWithCount extends Figurita {
  count: number;
}

export default function ColeccionRepetidasPage() {
  const { user } = useAuth();
  const [repetidas, setRepetidas] = useState<FiguritaWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeleccion, setFilterSeleccion] = useState('');
  const [filterEquipo, setFilterEquipo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');

  useEffect(() => {
    if (!user?.username) return;

    api.get(`/api/usuarios/${user.username}/figuritas`)
      .then(res => {
        // Group figuritas by figuritaBase and count
        const grouped = new Map<string, FiguritaWithCount>();
        
        res.data.forEach((figurita: Figurita) => {
          const baseId = figurita.figuritaBase.id;
          if (grouped.has(baseId)) {
            const existing = grouped.get(baseId)!;
            existing.count += 1;
          } else {
            grouped.set(baseId, { ...figurita, count: 1 });
          }
        });

        // Filter to only repetidas (count > 1)
        const repetidasList = Array.from(grouped.values()).filter(f => f.count > 1);
        setRepetidas(repetidasList);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching repetidas:', error);
        setLoading(false);
      });
  }, [user?.username]);

  if (loading) {
    return (
      <div className="page-enter">
        <p className="text-text">Cargando repetidas...</p>
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

      {repetidas.length === 0 ? (
        <p className="text-muted">No hay figuritas repetidas</p>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {repetidas.filter(figurita => {
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

              {/* Count badge */}
              <div className="mt-auto">
                <span className="inline-block px-2 py-1 bg-yellow-600 text-text text-xs font-bold rounded">
                  ×{figurita.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
