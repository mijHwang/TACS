import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
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


export default function BuscarPage() {


    const navigate = useNavigate();
    const [figuritas, setFiguritas] = useState<Figurita[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterNumero, setFilterNumero] = useState('');
    const [filterSeleccion, setFilterSeleccion] = useState('');
    const [filterEquipo, setFilterEquipo] = useState('');
    const [filterCategoria, setFilterCategoria] = useState('');



    //Buscar booting
    useEffect( () => {
      api.get('/api/figuritas')
      .then(res => {
      setFiguritas(res.data);
      setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching figuritas:', error);
        setLoading(false);
      });
    }, []); // figuritas list loaded. Need to test this.
  
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

      {/* The search bar */}
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

        {/*What will be shown in the result page.*/}
        {figuritas.filter(figurita => {
          const matchesSearch = figurita.figuritaBase.jugador.nombre
            .toLowerCase()
            .includes(searchTerm.toLowerCase());

          const currentUserId = localStorage.getItem('userID');

          const isNotOwned = figurita.owner?.id !== currentUserId;
    
          const matchesNumero = filterNumero === '' || 
            figurita.figuritaBase.id.includes(filterNumero);
    
          const matchesSeleccion = filterSeleccion === '' || 
            figurita.figuritaBase.seleccion.nombre.toLowerCase()
            .includes(filterSeleccion.toLowerCase());
    
          const matchesEquipo = filterEquipo === '' || 
            figurita.figuritaBase.equipo.nombre.toLowerCase()
            .includes(filterEquipo.toLowerCase());
    
          const matchesCategoria = filterCategoria === '' || 
            figurita.figuritaBase.categoria.nombre.toLowerCase()
            .includes(filterCategoria.toLowerCase());
    
            return matchesSearch && matchesNumero && matchesSeleccion && 
              matchesEquipo && matchesCategoria && isNotOwned;
          })
          .map((figurita) => (
            <div key={figurita.id} className="bg-surface p-4 rounded-lg border border-border">
            <p className= "text-sm font-bold text-text mb-2">{figurita.id}</p>
            <p className="text-sm text-muted mb-2">{figurita.figuritaBase.seleccion.nombre}</p>
            <p className="text-xl font-bold text-primary mb-2">{figurita.figuritaBase.id} - {figurita.figuritaBase.jugador.nombre}</p>
            <p className="text-sm text-text mb-3">{figurita.figuritaBase.equipo.nombre}</p>
            <p className="text-xs text-muted mb-4">{figurita.figuritaBase.categoria.nombre}</p>

            <button 
            onClick={() => navigate('/propuestas/nueva',{ state: { figuritaSeleccionada: figurita } })}
            className="w-full p-2 bg-primary text-text font-bold rounded-lg hover:opacity-90 transition-opacity">
              Hacer Propuesta
            </button>

          </div>

          ))}
      </div>
    </div>
  );
}
