import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import api from '../../services/api';

interface Usuario {
  id: string;
  username: string;
  email?: string;
}

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
  owner?: Usuario;
}

interface Intercambio {
  id: string;
  usuarioGenerador: Usuario;
  figurita: Figurita;
  figuritaIntercambiada: Figurita[];
  usuarioIntercambiador: Usuario;
  fecha: string;
  solicitud: { id: string };
}

export default function IntercambiosPage() {
  const { user } = useAuth();
  const [intercambios, setIntercambios] = useState<Intercambio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/intercambios')
      .then(res => {
        setIntercambios(res.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching intercambios:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="page-enter">
        <p className="text-text">Cargando intercambios...</p>
      </div>
    );
  }

  // Filter intercambios where current user is involved
  const misIntercambios = intercambios.filter(intercambio =>
    intercambio.usuarioGenerador?.id === user?.id ||
    intercambio.usuarioIntercambiador?.id === user?.id
  );

  return (
    <div className="page-enter">
      <h1 className="text-3xl font-bold text-text mb-6">Intercambios</h1>

      {misIntercambios.length === 0 ? (
        <p className="text-muted">No hay intercambios aún</p>
      ) : (
        <div className="space-y-4">
          {misIntercambios.map(intercambio => {
            const sSoy = user?.id === intercambio.usuarioGenerador?.id ? 'generador' : 'participante';
            const otroUsuario = sSoy === 'generador' 
              ? intercambio.usuarioIntercambiador 
              : intercambio.usuarioGenerador;

            return (
              <div key={intercambio.id} className="bg-surface p-4 rounded-lg border border-border">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted">
                      {sSoy === 'generador' ? 'Intercambiaste con' : 'Te intercambió'}
                    </p>
                    <p className="text-text font-semibold">{otroUsuario?.username || 'Usuario desconocido'}</p>
                  </div>
                  <p className="text-xs text-muted">
                    {new Date(intercambio.fecha).toLocaleDateString('es-AR')}
                  </p>
                </div>

                {/* What You Gave / Got */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Left side: What the generator wanted */}
                  <div className="pb-4 border-b border-border md:border-b-0 md:border-r md:pr-4">
                    <p className="text-sm text-muted mb-2">
                      {sSoy === 'generador' ? 'Recibiste:' : 'Diste:'}
                    </p>
                    <p className="text-text font-semibold">
                      {intercambio.figurita?.figuritaBase?.jugador?.nombre || 'N/A'} - {intercambio.figurita?.figuritaBase?.seleccion?.nombre || 'N/A'}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {intercambio.figurita?.figuritaBase?.equipo?.nombre || 'N/A'}
                    </p>
                  </div>

                  {/* Right side: What was offered in return */}
                  <div className="pb-4 md:pl-4">
                    <p className="text-sm text-muted mb-2">
                      {sSoy === 'generador' ? 'Diste:' : 'Recibiste:'}
                    </p>
                    <div className="space-y-1">
                      {intercambio.figuritaIntercambiada && intercambio.figuritaIntercambiada.length > 0 ? (
                        intercambio.figuritaIntercambiada.map((fig: Figurita) => (
                          <div key={fig.id}>
                            <p className="text-text font-semibold">
                              {fig.figuritaBase?.jugador?.nombre || 'N/A'} - {fig.figuritaBase?.seleccion?.nombre || 'N/A'}
                            </p>
                            <p className="text-xs text-muted">
                              {fig.figuritaBase?.equipo?.nombre || 'N/A'}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-text text-sm">Sin figuritas</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
