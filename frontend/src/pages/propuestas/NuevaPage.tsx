import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
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
  ownerId: string;  // ADD THIS
  ownerName: string;
}

export default function PropuestasNuevaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();  

  const figuritaDelLink = location.state?.figuritaSeleccionada as FiguritaResponseDTO | undefined;
  const offeredBaseIds = location.state?.figuritasOfrecidasBaseIds as string[] | undefined;
  const [misFiguritas, setMisFiguritas] = useState<FiguritaResponseDTO[]>([]);
  const [figuritaSeleccionada] = useState<string>(figuritaDelLink?.id || "");
  const [figuritasOfrecidas, setFiguritasOfrecidas] = useState<string[]>([]);
  const [expandedMias, setExpandedMias] = useState<boolean>(false);

  // Handle checkbox for figuritas to offer
  const handleToggleFigurita = (id: string) => {
    if (figuritasOfrecidas.includes(id)) {
      setFiguritasOfrecidas(figuritasOfrecidas.filter(fid => fid !== id));
    } else {
      setFiguritasOfrecidas([...figuritasOfrecidas, id]);
    }
  };

  // Handle submit
  const handleSubmit = () => {
    if (figuritaDelLink?.ownerId === user?.id) {
      alert("No puedes querer tu propia figurita");
      return;
    }

    if (!figuritaSeleccionada || figuritasOfrecidas.length === 0) {
      alert("Debes seleccionar una figurita que quieres y al menos una que ofreces");
      return;
    }

    const newSolicitud = {
      usuarioId: user?.id,
      usuarioDestino: figuritaDelLink?.ownerId,
      figuritaId: figuritaSeleccionada,
      figuritasOfrecidas: figuritasOfrecidas,
      estado: "pendiente"
    };

    api.post('/api/solicitudes-intercambio', newSolicitud)
      .then(res => {
        console.log("Propuesta enviada:", res.data);
        alert("¡Propuesta enviada!");
        navigate('/propuestas/enviadas');
      })
      .catch(error => {
        console.error('Error:', error);
        console.log(newSolicitud);
        alert("Error al enviar propuesta");
      });
  };

  useEffect(() => {
    if (!user?.username) return;  

    console.log("Fetching figuritas for:", user.username);
  
    api.get(`/api/usuarios/${user.username}/figuritas`)
      .then(res => {
        const figs: FiguritaResponseDTO[] = res.data || [];
        setMisFiguritas(figs);
        // Prefill: si venimos desde una sugerencia, pre-tildar las figuritas a ofrecer (por base id)
        if (offeredBaseIds && offeredBaseIds.length > 0) {
          const ids = figs
            .filter((f) => offeredBaseIds.includes(f.figuritaBaseId))
            .map((f) => f.id);
          if (ids.length > 0) {
            setFiguritasOfrecidas(ids);
            setExpandedMias(true);
          }
        }
      })
      .catch(error => {
        console.error('Error fetching figuritas:', error);
      });
  }, [user?.username, offeredBaseIds]);

  return (
    <div className="page-enter">
      <h2 className="text-xl font-semibold text-text mb-4">Propuestas · Nueva</h2>

      {/* Section 1: Figurita que quieres */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-text mb-4">¿Qué figurita quieres?</h3>
        <button 
          onClick={() => navigate('/buscar')}
          className="w-full p-3 bg-primary text-text font-bold rounded-lg hover:opacity-90 transition-opacity"
        >
          Buscar Figurita
        </button>
        {figuritaDelLink && (
          <div className="mt-4 p-3 bg-surface rounded-lg border border-border">
            <p className="text-sm text-muted mb-1">Figurita seleccionada:</p>
            <p className="text-text font-semibold">
              {figuritaDelLink.jugadorNombre} - {figuritaDelLink.id}
            </p>
          </div>
        )}
      </div>

      {/* Section 2: Figuritas que ofreces */}
      <div className="mb-8">
        <button
          onClick={() => setExpandedMias(!expandedMias)}
          className="w-full flex items-center justify-between p-4 bg-surface border border-border rounded-lg hover:bg-surface/80 transition-colors mb-2"
        >
          <h3 className="text-lg font-semibold text-text">¿Qué figuritas ofreces?</h3>
          <span className="text-primary text-xl">{expandedMias ? '▼' : '►'}</span>
        </button>
        
        {expandedMias && (
          <div className="space-y-2">
            {misFiguritas.map(fig => (
              <label key={fig.id} className="flex items-center p-3 bg-surface rounded-lg border border-border cursor-pointer hover:bg-surface/80 transition-colors">
                <input
                  type="checkbox"
                  checked={figuritasOfrecidas.includes(fig.id)}
                  onChange={() => handleToggleFigurita(fig.id)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="ml-3 text-text">
                  {fig.jugadorNombre} - {fig.seleccionNombre}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        className="w-full p-3 bg-primary text-text font-bold rounded-lg hover:opacity-90 transition-opacity"
      >
        Enviar Propuesta
      </button>
    </div>
  );
}