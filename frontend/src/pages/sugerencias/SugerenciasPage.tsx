import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ownerId: string;
  ownerName: string;
}

interface SugerenciaResponseDTO {
  contraparteId: string;
  contraparteNombre: string;
  figuritasARecibir: FiguritaResponseDTO[];
  figuritasAOfrecer: FiguritaResponseDTO[];
}

/**
 * Página de Sugerencias de Intercambio (US4): muestra intercambios bidireccionales posibles
 * con otros usuarios, agrupados por contraparte. Click en una figurita "a recibir" prearma
 * una propuesta con las figuritas a ofrecer pre-tildadas.
 */
export default function SugerenciasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sugerencias, setSugerencias] = useState<SugerenciaResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.username) return;
    api.get(`/api/usuarios/${user.username}/sugerencias`)
      .then((res) => { setSugerencias(res.data || []); setLoading(false); })
      .catch((error) => { console.error('Error fetching sugerencias:', error); setLoading(false); });
  }, [user?.username]);

  const proponer = (s: SugerenciaResponseDTO, f: FiguritaResponseDTO) => {
    navigate('/propuestas/nueva', {
      state: {
        figuritaSeleccionada: f,
        figuritasOfrecidasBaseIds: s.figuritasAOfrecer.map((x) => x.figuritaBaseId),
      },
    });
  };

  if (loading) {
    return (
      <div className="page-enter">
        <p className="text-text">Cargando sugerencias...</p>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <h1 className="text-2xl font-bold text-text mb-1">Sugerencias de Intercambio</h1>
      <p className="text-sm text-muted mb-6">Intercambios posibles con otros usuarios. Se actualizan a diario.</p>

      {sugerencias.length === 0 ? (
        <p className="text-muted">No tenés sugerencias por ahora.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {sugerencias.map((s) => (
            <div key={s.contraparteId} className="bg-surface border border-border rounded-lg p-5">
              <h2 className="text-lg font-semibold text-text mb-4">Con @{s.contraparteNombre}</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold text-primary mb-3">Te puede dar</p>
                  <div className="flex flex-col gap-2">
                    {s.figuritasARecibir.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => proponer(s, f)}
                        className="text-left p-3 bg-surface2 rounded-lg border border-border hover:border-primary transition-colors"
                      >
                        <p className="text-sm font-bold text-text">
                          {f.jugadorNombre} <span className="text-muted font-normal">#{f.numero}</span>
                        </p>
                        <p className="text-xs text-muted">{f.seleccionNombre} · {f.equipoNombre}</p>
                        <p className="text-xs text-primary mt-1">Proponer intercambio →</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text mb-3">Vos le podés dar</p>
                  <div className="flex flex-col gap-2">
                    {s.figuritasAOfrecer.map((f) => (
                      <div key={f.id} className="p-3 bg-surface2 rounded-lg border border-border">
                        <p className="text-sm font-bold text-text">
                          {f.jugadorNombre} <span className="text-muted font-normal">#{f.numero}</span>
                        </p>
                        <p className="text-xs text-muted">{f.seleccionNombre} · {f.equipoNombre}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
