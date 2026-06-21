import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../../services/api';
 import { useAuth } from '../../auth/useAuth'; 


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

export default function BuscarPage() {
   const { user } = useAuth(); 
  const navigate = useNavigate();
  const location = useLocation();
  const [figuritas, setFiguritas] = useState<FiguritaResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNumero, setFilterNumero] = useState('');
  const [filterSeleccion, setFilterSeleccion] = useState('');
  const [filterEquipo, setFilterEquipo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const filterByBaseId = location.state?.filterByBaseId;

  useEffect(() => {
    api.get('/api/figuritas')
      .then(res => {
        setFiguritas(res.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching figuritas:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="page-enter">
        <p className="text-text">Cargando figuritas...</p>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <h1 className="text-3xl font-bold text-text mb-6">Buscar</h1>

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
          placeholder="Categoria"
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {figuritas.filter(figurita => {

          const matchesBaseId = !filterByBaseId || figurita.figuritaBaseId === filterByBaseId;

          const matchesSearch = figurita.jugadorNombre
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

          const matchesNumero = filterNumero === '' || 
            figurita.numero.toString().includes(filterNumero);

          const matchesSeleccion = filterSeleccion === '' || 
            figurita.seleccionNombre.toLowerCase()
              .includes(filterSeleccion.toLowerCase());

          const matchesEquipo = filterEquipo === '' || 
            figurita.equipoNombre.toLowerCase()
              .includes(filterEquipo.toLowerCase());

          const matchesCategoria = filterCategoria === '' || 
            figurita.categoriaNombre.toLowerCase()
              .includes(filterCategoria.toLowerCase());

          return matchesBaseId && matchesSearch && matchesNumero && matchesSeleccion && 
            matchesEquipo && matchesCategoria && figurita.ownerId !== user?.id;;
        })
        .map((figurita) => (
          <div key={figurita.id} className="bg-surface p-4 rounded-lg border border-border">
            <p className="text-sm font-bold text-text mb-2">{figurita.numero}</p>
            <p className="text-sm text-muted mb-2">{figurita.seleccionNombre}</p>
            <p className="text-xl font-bold text-primary mb-2">{figurita.jugadorNombre}</p>
            <p className="text-sm text-text mb-3">{figurita.equipoNombre}</p>
            <p className="text-xs text-muted mb-4">{figurita.categoriaNombre}</p>
            <p className="text-xs text-muted mb-2">De: {figurita.ownerName}</p>
            <button 
              onClick={() => navigate('/propuestas/nueva', { state: { figuritaSeleccionada: figurita } })}
              className="w-full p-2 bg-primary text-text font-bold rounded-lg hover:opacity-90 transition-opacity">
              Hacer Propuesta
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}