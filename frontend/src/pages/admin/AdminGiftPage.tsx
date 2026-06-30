import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useBaseSearch } from '../../hooks/useBaseSearch';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import Paginador from '../../components/Paginador';

interface Usuario {
  id: string;
  username: string;
  email: string;
}

export default function AdminGiftPage() {
  const navigate = useNavigate();

  // User search
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<Usuario[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // FiguritaBase typeahead (server-side, paginado)
  const [baseSearch, setBaseSearch] = useState('');
  const [basePage, setBasePage] = useState(0);
  const [selectedBaseId, setSelectedBaseId] = useState('');
  const [selectedBaseLabel, setSelectedBaseLabel] = useState('');
  const debouncedBaseSearch = useDebouncedValue(baseSearch, 300);
  const { data: baseData, isFetching: baseFetching } = useBaseSearch(debouncedBaseSearch, basePage);
  const baseResults = baseData?.content ?? [];

  // Feedback
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [gifting, setGifting] = useState(false);

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

  const selectBase = (id: string, label: string) => {
    setSelectedBaseId(id);
    setSelectedBaseLabel(label);
    setBaseSearch('');
    setBasePage(0);
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
      setSelectedBaseLabel('');
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

        {/* FiguritaBase typeahead */}
        <div className="mb-6">
          <label htmlFor="gift-figurita-search" className="block text-sm font-semibold text-text mb-2">Selecciona Figurita</label>
          <input
            id="gift-figurita-search"
            type="text"
            placeholder="Buscar por jugador, selección o número..."
            value={baseSearch}
            onChange={(e) => { setBaseSearch(e.target.value); setBasePage(0); }}
            className="w-full p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary mb-2"
          />

          {baseFetching && baseResults.length === 0 && <p className="text-sm text-muted">Buscando...</p>}

          {baseResults.length > 0 && (
            <>
              <div className="border border-border rounded-lg overflow-hidden">
                {baseResults.map(base => (
                  <button
                    key={base.id}
                    onClick={() => selectBase(base.id, `#${base.numero} - ${base.jugadorNombre} (${base.seleccionNombre})`)}
                    className="w-full text-left p-3 bg-surface hover:bg-surface/80 border-b border-border last:border-b-0 transition-colors"
                  >
                    <p className="text-text font-semibold">#{base.numero} - {base.jugadorNombre}</p>
                    <p className="text-xs text-muted">{base.seleccionNombre}</p>
                  </button>
                ))}
              </div>
              {(baseData?.totalPages ?? 1) > 1 && <Paginador page={basePage} totalPages={baseData?.totalPages ?? 1} onChange={setBasePage} />}
            </>
          )}

          {selectedBaseLabel && (
            <div className="mt-2 p-3 bg-primary/15 rounded-lg border border-primary/50">
              <p className="text-sm text-primary font-semibold">✓ {selectedBaseLabel}</p>
            </div>
          )}
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
