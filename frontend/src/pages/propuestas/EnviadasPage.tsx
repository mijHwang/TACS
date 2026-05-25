import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import api from '../../services/api';

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

interface SolicitudDeIntercambio {
  id: string;
  usuario: Usuario;
  figurita: Figurita;
  figuritasOfrecidas: Figurita[];
  cantidadDisponible: number;
  estado: string;
}


export default function PropuestasEnviadasPage() {



  const { user } = useAuth();
  const [propuestasEnviadas, setPropuestasEnviadas] = useState<SolicitudDeIntercambio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    api.get(`/api/solicitudes-intercambio/enviadas/${user.id}`)
      .then(res => {
        setPropuestasEnviadas(res.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching propuestas enviadas:', error);
        setLoading(false);
      });
  }, []);

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case "PENDIENTE":
        return "text-yellow-500";
      case "ACEPTADO":
        return "text-green-500";
      case "RECHAZADO":
        return "text-red-500";
      default:
        return "text-muted";
    }
  };

  const getStatusText = (estado: string) => {
    switch (estado) {
      case "PENDIENTE":
        return "⏳ Pendiente";
      case "ACEPTADO":
        return "✅ Aceptado";
      case "RECHAZADO":
        return "❌ Rechazado";
      default:
        return estado;
    }
  };

  if (loading) {
    return (
      <div className="page-enter">
        <p className="text-text">Cargando propuestas...</p>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <h2 className="text-xl font-semibold text-text mb-6">Propuestas · Enviadas</h2>

      {propuestasEnviadas.length === 0 ? (
        <p className="text-muted">No hay propuestas enviadas</p>
      ) : (
        <div className="space-y-4">
          {propuestasEnviadas.map(propuesta => (
            <div key={propuesta.id} className="bg-surface p-4 rounded-lg border border-border">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted">Enviado a:</p>
                  <p className="text-text font-semibold">{propuesta.figurita.owner?.username || 'Usuario desconocido'}</p>
                </div>                                      {/* propuesta.usuario?.username */}
                <p className={`font-semibold ${getStatusColor(propuesta.estado)}`}>
                  {getStatusText(propuesta.estado)}
                </p>
              </div>

              {/* What You Wanted */}
              <div className="mb-4 pb-4 border-b border-border">
                <p className="text-sm text-muted mb-2">Figurita que querías:</p>
                <p className="text-text font-semibold">
                  {propuesta.figurita?.figuritaBase?.jugador?.nombre || 'N/A'} - {propuesta.figurita?.figuritaBase?.seleccion?.nombre || 'N/A'}
                </p>
              </div>

              {/* What You Offered */}
              <div className="mb-4">
                <p className="text-sm text-muted mb-2">Figuritas que ofreciste:</p>
                <div className="space-y-1">
                  {propuesta.figuritasOfrecidas && propuesta.figuritasOfrecidas.length > 0 ? (
                    propuesta.figuritasOfrecidas.map((fig: Figurita) => (
                      <p key={fig.id} className="text-text text-sm">
                        • {fig.figuritaBase?.jugador?.nombre || 'N/A'} - {fig.figuritaBase?.seleccion?.nombre || 'N/A'}
                      </p>
                    ))
                  ) : (
                    <p className="text-text text-sm">Sin figuritas ofrecidas</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}