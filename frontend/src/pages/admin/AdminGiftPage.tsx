import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface Usuario {
  id: string;
  username: string;
  email: string;
}

interface FiguritaBase {
  id: string;
  numero: number;
  jugador: { id: string; nombre: string };
  seleccion: { id: string; nombre: string };
  equipo: { id: string; nombre: string };
  categoria: { id: string; nombre: string };
}

export default function AdminGiftPage() {
  const navigate = useNavigate();
  const [figuritaBases, setFiguritaBases] = useState<FiguritaBase[]>([]);
  const [loading, setLoading] = useState(true);
  
  // User search
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<Usuario[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  
  // FiguritaBase selection
  const [selectedBaseId, setSelectedBaseId] = useState('');
  
  // Feedback
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [gifting, setGifting] = useState(false);

  // Load all figuritaBases on mount
  useEffect(() => {
    api.get('/api/figuritas-base')
      .then(res => {
        setFiguritaBases(res.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading figuritaBases:', error);
        setMessage('Error al cargar figuritas');
        setMessageType('error');
        setLoading(false);
      });
  }, []);

  // Search users
  const handleUserSearch = async (query: string) => {
    setUserSearch(query);
    
    if (query.length < 2) {
      setUserResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await api.get(`/api/usuarios/search?search=${query}`);
      setUserResults(res.data);
    } catch (error) {
      console.error('Error searching users:', error);
      setUserResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectUser = (userId: string, username: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(username);
    setUserResults([]);
    setUserSearch('');
  };

  const handleGift = async () => {
    if (!selectedUserId) {
      setMessage('Selecciona un usuario');
      setMessageType('error');
      return;
    }
    if (!selectedBaseId) {
      setMessage('Selecciona una figurita');
      setMessageType('error');
      return;
    }

    setGifting(true);
    setMessage('');
    
    try {
      await api.post(`/api/admin/users/${selectedUserId}/gift-figurita/${selectedBaseId}`);
      
      setMessage(`✓ Figurita regalada a ${selectedUserName}!`);
      setMessageType('success');
      
      // Reset form
      setSelectedUserId('');
      setSelectedUserName('');
      setSelectedBaseId('');
      setUserSearch('');
      
      setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 3000);
    } catch (error) {
      setMessage('✗ Error al regalar figurita');
      setMessageType('error');
      console.error('Error:', error);
    } finally {
      setGifting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-enter">
        <p className="text-text">Cargando figuritas...</p>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <h1 className="text-3xl font-bold text-text mb-6">Regalar Figurita (Admin)</h1>

      <button
        onClick={() => navigate('/admin')}
        className="mb-6 px-4 py-2 bg-surface border border-border rounded-lg text-text hover:bg-surface/80 transition-colors"
      >
        ← Volver a Estadísticas
      </button>

      <div className="max-w-md mx-auto bg-surface p-6 rounded-lg border border-border">
        
        {/* User Search */}
        <div className="mb-6">
          <label htmlFor="gift-user-search" className="block text-sm font-semibold text-text mb-2">Selecciona Usuario</label>
          <input
            id="gift-user-search"
            type="text"
            placeholder="Buscar por nombre de usuario..."
            value={userSearch}
            onChange={(e) => handleUserSearch(e.target.value)}
            className="w-full p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary mb-2"
          />
          
          {searchLoading && <p className="text-sm text-muted">Buscando...</p>}
          
          {userResults.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              {userResults.map(user => (
                <button
                  key={user.id}
                  onClick={() => selectUser(user.id, user.username)}
                  className="w-full text-left p-3 bg-surface hover:bg-surface/80 border-b border-border last:border-b-0 transition-colors"
                >
                  <p className="text-text font-semibold">{user.username}</p>
                  <p className="text-xs text-muted">{user.email}</p>
                </button>
              ))}
            </div>
          )}

          {selectedUserName && (
            <div className="mt-2 p-3 bg-primary/15 rounded-lg border border-primary/50">
              <p className="text-sm text-primary font-semibold">✓ {selectedUserName}</p>
            </div>
          )}
        </div>

        {/* FiguritaBase Dropdown */}
        <div className="mb-6">
          <label htmlFor="gift-figurita" className="block text-sm font-semibold text-text mb-2">Selecciona Figurita</label>
          <select
            id="gift-figurita"
            value={selectedBaseId}
            onChange={(e) => setSelectedBaseId(e.target.value)}
            className="w-full p-3 bg-surface border border-border rounded-lg text-text focus:outline-none focus:border-primary"
          >
            <option value="">-- Elige una figurita --</option>
            {figuritaBases.map(fig => (
              <option key={fig.id} value={fig.id}>
                #{fig.numero} - {fig.jugador.nombre} ({fig.seleccion.nombre})
              </option>
            ))}
          </select>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-semibold ${
            messageType === 'success' 
              ? 'bg-green-900/30 text-green-400 border border-green-500/50'
              : 'bg-red-900/30 text-red-400 border border-red-500/50'
          }`}>
            {message}
          </div>
        )}

        {/* Gift Button */}
        <button
          onClick={handleGift}
          disabled={gifting || !selectedUserId || !selectedBaseId}
          className="w-full p-3 bg-primary text-text font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {gifting ? 'Regalando...' : 'Regalar Figurita'}
        </button>
      </div>
    </div>
  );
}