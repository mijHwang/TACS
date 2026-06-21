import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';
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
  onwerName: string;
}

export default function ColeccionFaltantesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [faltantes, setFaltantes] = useState<FiguritaResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeleccion, setFilterSeleccion] = useState('');
  const [filterEquipo, setFilterEquipo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');

  useEffect(() => {
    if (!user?.username) return;

    api.get(`/api/usuarios/${user.username}/figuritas/faltantes`)
      .then(res => {
        setFaltantes(res.data);
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
            const matchesSearch = figurita.jugadorNombre
              .toLowerCase()
              .includes(searchTerm.toLowerCase());

            const matchesSeleccion = filterSeleccion === '' ||
              figurita.seleccionNombre.toLowerCase()
                .includes(filterSeleccion.toLowerCase());

            const matchesEquipo = filterEquipo === '' ||
              figurita.equipoNombre.toLowerCase()
                .includes(filterEquipo.toLowerCase());

            const matchesCategoria = filterCategoria === '' ||
              figurita.categoriaNombre.toLowerCase()
                .includes(filterCategoria.toLowerCase());

            return matchesSearch && matchesSeleccion && matchesEquipo && matchesCategoria;
          })
          .map((figurita) => (
            <div key={figurita.figuritaBaseId} 
            onClick={() => navigate('/buscar', { 
            state: { filterByBaseId: figurita.figuritaBaseId, figuritaInfo: figurita } 
            })}
            className="bg-surface p-4 rounded-lg border border-border flex flex-col">
              {/* Image placeholder */}
              <div className="w-full aspect-square bg-surface2 rounded-md mb-3 flex items-center justify-center">
                <p className="text-xs text-muted">Imagen</p>
              </div>

              {/* Info */}
              <p className="text-xs text-muted mb-2">{figurita.seleccionNombre}</p>
              <p className="text-sm font-bold text-primary mb-2">{figurita.jugadorNombre}</p>
              <p className="text-xs text-text mb-2">{figurita.equipoNombre}</p>
              <p className="text-xs text-muted mb-3">{figurita.categoriaNombre}</p>

              {/* Owner info */}
              <div className="mt-auto">
                <p className="text-xs text-muted">
                  Número: {figurita.numero}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}