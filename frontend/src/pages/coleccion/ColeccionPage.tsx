import { NavLink, Outlet, useMatch } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import api from '../../services/api';

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

export default function ColeccionPage() {
  const { user } = useAuth();
  const isIndex = useMatch('/coleccion');
  const [figuritas, setFiguritas] = useState<FiguritaResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeleccion, setFilterSeleccion] = useState('');
  const [filterEquipo, setFilterEquipo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');

  useEffect(() => {
    if (!user?.username) return;

    api.get(`/api/usuarios/${user.username}/figuritas`)
      .then(res => {
        console.log(res.data[0]);
        setFiguritas(res.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching figuritas:', error);
        setLoading(false);
      });
  }, [user?.username]);

  return (
    <div className="page-enter">
      <h1 className="text-2xl font-bold text-text mb-1">Colección</h1>
      <p className="text-sm text-muted mb-6">Administrá tus figuritas</p>

      <nav className="flex gap-2 mb-8 flex-wrap">
        {[
          { to: '', label: 'Todas' },
          { to: 'faltantes', label: 'Faltantes' },
        ].map(({ to, label }) => (
          <NavLink
            key={to || 'todas'}
            to={to}
            className={({ isActive }) =>
              'px-4 py-1.5 rounded-md text-sm font-medium border transition-all duration-150 no-underline ' +
              (isActive
                ? 'bg-primary/15 text-primary border-primary/50 font-semibold'
                : 'text-muted border-border hover:bg-surface2 hover:text-text')
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {isIndex ? (
        <>
          <div className="mb-6">
            <input
              type="text"
              placeholder="Buscar figurita..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
            />
          </div>

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

          {loading ? (
            <p className="text-text">Cargando figuritas...</p>
          ) : figuritas.length === 0 ? (
            <p className="text-muted">No tienes figuritas aún</p>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {figuritas.filter(figurita => {
                const matchesSearch = (figurita.jugadorNombre || '')
                  .toLowerCase()
                  .includes(searchTerm.toLowerCase());

                const matchesSeleccion = filterSeleccion === '' ||
                  (figurita.seleccionNombre || '').toLowerCase()
                    .includes(filterSeleccion.toLowerCase());

                const matchesEquipo = filterEquipo === '' ||
                  (figurita.equipoNombre || '').toLowerCase()
                    .includes(filterEquipo.toLowerCase());

                const matchesCategoria = filterCategoria === '' ||
                  (figurita.categoriaNombre || '').toLowerCase()
                    .includes(filterCategoria.toLowerCase());

                return matchesSearch && matchesSeleccion && matchesEquipo && matchesCategoria;
              })
              .map((figurita) => (
                <div key={figurita.figuritaBaseId} className="bg-surface p-4 rounded-lg border border-border flex flex-col">
                  <div className="w-full aspect-square bg-surface2 rounded-md mb-3 flex items-center justify-center">
                    <p className="text-xs text-muted">Imagen</p>
                  </div>

                  <p className="text-xs text-muted mb-2">{figurita.seleccionNombre}</p>
                  <p className="text-sm font-bold text-primary mb-2">{figurita.jugadorNombre}</p>
                  <p className="text-xs text-text mb-2">{figurita.equipoNombre}</p>
                  <p className="text-xs text-muted mb-3">{figurita.categoriaNombre}</p>

                  <div className="mt-auto">
                    <span className="inline-block px-2 py-1 bg-yellow-600 text-white text-xs font-bold rounded">
                      x{figurita.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <Outlet />
      )}
    </div>
  );
}