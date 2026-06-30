import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useFiguritas } from '../../hooks/useFiguritas';
import { useCrearPropuesta } from '../../hooks/usePropuestas';

export default function PropuestasNuevaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const figuritaDelLink = location.state?.figuritaSeleccionada as { id: string; figuritaBaseId: string; jugadorNombre: string; ownerId: string } | undefined;
  const offeredBaseIds = location.state?.figuritasOfrecidasBaseIds as string[] | undefined;

  const { data: misFiguritas = [] } = useFiguritas(user?.username);
  const crearPropuesta = useCrearPropuesta();
  const [figuritaSeleccionada] = useState<string>(figuritaDelLink?.id || '');
  const [figuritasOfrecidas, setFiguritasOfrecidas] = useState<string[]>([]);
  const [expandedMias, setExpandedMias] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const prefillApplied = useRef(false);

  // Handle checkbox for figuritas to offer
  const handleToggleFigurita = (id: string) => {
    if (figuritasOfrecidas.includes(id)) {
      setFiguritasOfrecidas(figuritasOfrecidas.filter(fid => fid !== id));
    } else {
      setFiguritasOfrecidas([...figuritasOfrecidas, id]);
    }
  };

  // Prefill desde sugerencia: pre-tildar figuritas a ofrecer por base id.
  // One-shot initialization once async data arrives — intentional setState in effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (prefillApplied.current) return;
    if (!offeredBaseIds || offeredBaseIds.length === 0 || misFiguritas.length === 0) return;
    prefillApplied.current = true;
    const ids = misFiguritas.filter((f) => offeredBaseIds.includes(f.figuritaBaseId)).map((f) => f.id);
    if (ids.length > 0) {
      setFiguritasOfrecidas(ids);
      setExpandedMias(true);
    }
  }, [misFiguritas, offeredBaseIds]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Handle submit
  const handleSubmit = () => {
    setFormError(null);
    if (figuritaDelLink?.ownerId === user?.id) {
      setFormError('No podés pedir tu propia figurita.');
      return;
    }
    if (!figuritaSeleccionada || figuritasOfrecidas.length === 0) {
      setFormError('Elegí una figurita que querés y al menos una que ofrecés.');
      return;
    }
    crearPropuesta.mutate(
      {
        usuarioId: user!.id,
        usuarioDestino: figuritaDelLink!.ownerId,
        figuritaId: figuritaSeleccionada,
        figuritasOfrecidas,
        estado: 'pendiente',
      },
      {
        onSuccess: () => navigate('/propuestas/enviadas'),
        onError: () => setFormError('No se pudo enviar la propuesta. Intentá de nuevo.'),
      },
    );
  };

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

      {/* Inline error */}
      {formError && (
        <p className="mb-3 text-sm font-semibold text-center" style={{ color: '#D82D31' }}>{formError}</p>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={crearPropuesta.isPending}
        className="w-full p-3 bg-primary text-text font-bold rounded-lg hover:opacity-90 transition-opacity"
      >
        {crearPropuesta.isPending ? 'Enviando…' : 'Enviar Propuesta'}
      </button>
    </div>
  );
}
