import { useAuth } from '../../auth/useAuth';
import { usePropuestasRecibidas, useResponderPropuesta } from '../../hooks/usePropuestas';

export default function PropuestasRecibidasPage() {
  const { user } = useAuth();
  const { data: propuestasRecibidas = [], isLoading } = usePropuestasRecibidas(user?.id);
  const responder = useResponderPropuesta();

  const handleAceptar = (propuestaId: string) => responder.mutate({ propuestaId, accion: 'aceptar' });
  const handleRechazar = (propuestaId: string) => responder.mutate({ propuestaId, accion: 'rechazar' });

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

  if (isLoading) {
    return (
      <div className="page-enter">
        <p className="text-text">Cargando propuestas...</p>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <h2 className="text-xl font-semibold text-text mb-6">Propuestas · Recibidas</h2>

      {responder.isError && (
        <p className="mb-4 text-sm font-semibold" style={{ color: '#D82D31' }}>
          No se pudo procesar la propuesta. Intentá de nuevo.
        </p>
      )}

      {propuestasRecibidas.length === 0 ? (
        <p className="text-muted">No hay propuestas recibidas</p>
      ) : (
        <div className="space-y-4">
          {propuestasRecibidas.map(propuesta => (
            <div key={propuesta.id} className="bg-surface p-4 rounded-lg border border-border">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted">De:</p>
                  <p className="text-text font-semibold">{propuesta.usuario?.username || 'Usuario desconocido'}</p>
                </div>
                <p className={`font-semibold ${getStatusColor(propuesta.estado)}`}>
                  {getStatusText(propuesta.estado)}
                </p>
              </div>

              {/* What They Want */}
              <div className="mb-4 pb-4 border-b border-border">
                <p className="text-sm text-muted mb-2">Quiere tu figurita:</p>
                <p className="text-text font-semibold">
                  {propuesta.figurita?.figuritaBase?.jugador?.nombre || 'N/A'} - {propuesta.figurita?.figuritaBase?.seleccion?.nombre || 'N/A'}
                </p>
              </div>

              {/* What They Offer */}
              <div className="mb-4 pb-4 border-b border-border">
                <p className="text-sm text-muted mb-2">Te ofrece:</p>
                <div className="space-y-1">
                  {propuesta.figuritasOfrecidas && propuesta.figuritasOfrecidas.length > 0 ? (
                    propuesta.figuritasOfrecidas.map(fig => (
                      <p key={fig.id} className="text-text text-sm">
                        • {fig.figuritaBase?.jugador?.nombre || 'N/A'} - {fig.figuritaBase?.seleccion?.nombre || 'N/A'}
                      </p>
                    ))
                  ) : (
                    <p className="text-text text-sm">Sin figuritas ofrecidas</p>
                  )}
                </div>
              </div>

              {/* Buttons - Only show if pending */}
              {propuesta.estado === "PENDIENTE" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAceptar(propuesta.id)}
                    className="flex-1 p-2 bg-green-600 text-text font-bold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => handleRechazar(propuesta.id)}
                    className="flex-1 p-2 bg-red-600 text-text font-bold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
