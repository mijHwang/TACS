import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../auth/useAuth';

interface PublicacionResponseDTO {
  id: string;
  figuritaBaseId: string;
  figuritaNumero: number;
  figuritaJugadorNombre: string;
  figuritaSeleccionNombre: string;
  figuritaEquipoNombre: string;
  figuritaCategoriaNombre: string;
  figuritaIds: string[];
  cantidad: number;
  usuarioId: string;
  usuarioUsername: string;
  fechaPublicacion: string;
  estado: string;
}

export default function BuscarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [publicaciones, setPublicaciones] = useState<PublicacionResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterNumero, setFilterNumero] = useState('');
  const [filterSeleccion, setFilterSeleccion] = useState('');
  const [filterEquipo, setFilterEquipo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    api.get(`/api/publicaciones/disponibles/${user.id}`)
      .then((res) => {
        setPublicaciones(res.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching publicaciones:', error);
        setLoading(false);
      });
  }, [user?.id]);

  const safeLower = (value: string | null | undefined): string =>
    value?.toLowerCase() || '';

  const filtered = publicaciones.filter((pub) => {
    const searchLower = safeLower(searchTerm);
    const matchesSearch = safeLower(pub.figuritaJugadorNombre).includes(searchLower);

    const matchesNumero = filterNumero === '' ||
      pub.figuritaNumero.toString().includes(filterNumero);

    const matchesSeleccion = filterSeleccion === '' ||
      safeLower(pub.figuritaSeleccionNombre).includes(safeLower(filterSeleccion));

    const matchesEquipo = filterEquipo === '' ||
      safeLower(pub.figuritaEquipoNombre).includes(safeLower(filterEquipo));

    const matchesCategoria = filterCategoria === '' ||
      safeLower(pub.figuritaCategoriaNombre).includes(safeLower(filterCategoria));

    return (
      matchesSearch &&
      matchesNumero &&
      matchesSeleccion &&
      matchesEquipo &&
      matchesCategoria
    );
  });

  if (loading) {
    return <p className="text-text">Cargando figuritas publicadas...</p>;
  }

  return (
    <div className="page-enter">
      <h1 className="text-3xl font-bold text-text mb-6">Buscar Intercambios</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar figurita..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <input
          type="text"
          placeholder="Número"
          value={filterNumero}
          onChange={(e) => setFilterNumero(e.target.value)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
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
          placeholder="Categoría"
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filtered.map((pub) => {
          const isOwn = pub.usuarioId === user?.id;

          return (
            <div key={pub.id} className="bg-surface p-4 rounded-lg border border-border">
              <p className="text-sm font-bold text-text mb-2">{pub.figuritaNumero}</p>
              <p className="text-sm text-muted mb-2">{pub.figuritaSeleccionNombre || 'Sin selección'}</p>
              <p className="text-xl font-bold text-primary mb-2">{pub.figuritaJugadorNombre || 'Sin nombre'}</p>
              <p className="text-sm text-text mb-3">{pub.figuritaEquipoNombre || 'Sin equipo'}</p>
              <p className="text-xs text-muted mb-4">{pub.figuritaCategoriaNombre || 'Sin categoría'}</p>
              <p className="text-xs text-muted mb-2">Cantidad disponible: <span className="font-semibold text-text">{pub.cantidad}</span></p>
              <p className="text-xs text-muted mb-2">De: @{pub.usuarioUsername || 'Usuario desconocido'}</p>

              <button
                onClick={() => {
                  if (isOwn) return;
                  const figuritaSeleccionada = {
                    id: pub.figuritaIds[0] || '',
                    ownerId: pub.usuarioId,
                    jugadorNombre: pub.figuritaJugadorNombre,
                    seleccionNombre: pub.figuritaSeleccionNombre,
                    equipoNombre: pub.figuritaEquipoNombre,
                    categoriaNombre: pub.figuritaCategoriaNombre,
                    numero: pub.figuritaNumero,
                    figuritaBaseId: pub.figuritaBaseId,
                    count: pub.cantidad,
                    ownerName: pub.usuarioUsername,
                  };
                  navigate('/propuestas/nueva', {
                    state: { figuritaSeleccionada },
                  });
                }}
                disabled={isOwn}
                className={`w-full p-2 font-bold rounded-lg transition-opacity ${
                  isOwn
                    ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                    : 'bg-primary text-white hover:opacity-90'
                }`}
              >
                {isOwn ? 'Es tuya' : 'Hacer Propuesta'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}