import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import api from '../../services/api';

  interface Notificacion {
  id: string;
  usuario: Usuario;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha: string;
  enlace: string;
}

interface Usuario {
  id: string;
  username: string;
  password?: string;
  email?: string;
  figuritas?: Figurita[];
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



export default function NotificacionesPage() {


  const navigate = useNavigate();
 
  const { user } = useAuth();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
  
    api.get(`/api/notificaciones/usuario/${user.id}`)
      .then(res => {

        const ordered = [...res.data].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );

        setNotificaciones(ordered);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching notificaciones:', error);
        setLoading(false);
      });
    }, [user?.id]);

  // Mark notification as read
  const handleLeerNotificacion = (id: string) => {
  api.put(`/api/notificaciones/${id}/leer`)
    .then(res => {
        console.log(res, "hola");
      setNotificaciones(prev =>
        prev.map(notif => 
        notif.id === id ? res.data : notif
        )
      );
      })
    .catch(error => console.error('Error:', error));
  };

  // Delete notification
  const handleEliminarNotificacion = (id: string) => {
  api.delete(`/api/notificaciones/${id}`)
  .then(() => {
    setNotificaciones(prev => prev.filter(notif => notif.id !== id));
  })
  .catch(error => console.error('Error:', error));
  };

  // Clear all notifications
  const handleLimpiarTodas = () => {
  notificaciones.forEach(notif => {
    api.delete(`/api/notificaciones/${notif.id}`)
    .catch(error => console.error('Error:', error));
  });
  setNotificaciones([]);
  };

  // Get icon based on type
  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case "propuesta":
        return "💬";
      case "figurita-faltante":
        return "🎯";
      case "subasta":
        return "🏷️";
      default:
        return "📢";
    }
  };

  // Get color based on type
  const getColorTipo = (tipo: string) => {
    switch (tipo) {
      case "propuesta":
        return "border-l-4 border-l-blue-500";
      case "figurita-faltante":
        return "border-l-4 border-l-green-500";
      case "subasta":
        return "border-l-4 border-l-yellow-500";
      default:
        return "border-l-4 border-l-gray-500";
    }
  };

  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;


  if (loading) {
  return (
    <div className="page-enter">
      <p className="text-text">Cargando notificaciones...</p>
    </div>
  );
  }

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text">Notificaciones</h1>
          {notificacionesNoLeidas > 0 && (
            <p className="text-sm text-muted mt-1">
              {notificacionesNoLeidas} sin leer
            </p>
          )}
        </div>
        {notificaciones.length > 0 && (
          <button
            onClick={handleLimpiarTodas}
            className="p-2 text-sm bg-red-600/10 text-red-500 rounded-lg hover:bg-red-600/20 transition-colors"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {notificaciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-muted">No hay notificaciones</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notificaciones.map(notif => (
            <div
              key={notif.id}
              className={`bg-surface p-4 rounded-lg border border-border ${getColorTipo(notif.tipo)} ${
                !notif.leida ? 'bg-surface/80' : 'opacity-75'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 cursor-pointer" onClick={() => {
                  handleLeerNotificacion(notif.id);
                  if (notif.enlace) navigate(notif.enlace);
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{getIconoTipo(notif.tipo)}</span>
                    <p className={`font-semibold ${!notif.leida ? 'text-primary' : 'text-text'}`}>
                      {notif.titulo}
                    </p>
                    {!notif.leida && (
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                    )}
                  </div>
                  <p className="text-sm text-muted ml-7">{notif.mensaje}</p>
                  <p className="text-xs text-muted mt-2 ml-7">{notif.fecha}</p>
                </div>

                <button
                  onClick={() => handleEliminarNotificacion(notif.id)}
                  className="p-1 text-muted hover:text-red-500 transition-colors"
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}