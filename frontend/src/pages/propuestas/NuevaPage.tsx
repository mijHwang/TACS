import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useFiguritas } from '../../hooks/useFiguritas';
import { useCrearPropuesta } from '../../hooks/usePropuestas';
import Paginador from '../../components/Paginador';

const SEL_PAGE_SIZE = 10;

export default function PropuestasNuevaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // 1. Datos recibidos por el router (pueden venir de la búsqueda tradicional o de una sugerencia)
  const figuritaDelLink = location.state?.figuritaSeleccionada as { id: string; figuritaBaseId: string; jugadorNombre: string; ownerId: string } | undefined;
  
  // Retrocompatibilidad: IDs de bases de figuritas (el flujo anterior)
  const offeredBaseIds = location.state?.figuritasOfrecidasBaseIds as string[] | undefined;
  
  // NUEVA CARACTERÍSTICA: IDs físicos exactos y preseleccionados desde la Sugerencia (Evita duplicados)
  const directOfferedIds = location.state?.figuritasOfrecidasIds as string[] | undefined;

  const { data: misFiguritas = [] } = useFiguritas(user?.username);
  const crearPropuesta = useCrearPropuesta();
  
  const [figuritaSeleccionada] = useState<string>(figuritaDelLink?.id || '');
  
  // Mantenemos la característica actual, pero si ya tenemos IDs directos, los cargamos síncronamente al instante
  const [figuritasOfrecidas, setFiguritasOfrecidas] = useState<string[]>(directOfferedIds || []);
  
  // Si venimos con una sugerencia directa, expandimos tus figuritas por defecto para que las veas
  const [expandedMias, setExpandedMias] = useState<boolean>(
    (directOfferedIds && directOfferedIds.length > 0) || (offeredBaseIds && offeredBaseIds.length > 0) ? true : false
  );
  
  const [busqueda, setBusqueda] = useState('');
  const [paginaSel, setPaginaSel] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const prefillApplied = useRef(false);

  // Filtrado + paginado client-side de la lista de selección (se mantienen intactas tus características)
  const q = busqueda.trim().toLowerCase();
  const filtradas = q === ''
    ? misFiguritas
    : misFiguritas.filter((f) =>
        f.jugadorNombre.toLowerCase().includes(q) || f.seleccionNombre.toLowerCase().includes(q));
  const totalPagesSel = Math.ceil(filtradas.length / SEL_PAGE_SIZE);
  const visibles = filtradas.slice(paginaSel * SEL_PAGE_SIZE, paginaSel * SEL_PAGE_SIZE + SEL_PAGE_SIZE);

  // Manejo de la selección manual (característica actual intacta)
  const handleToggleFigurita = (id: string) => {
    if (figuritasOfrecidas.includes(id)) {
      setFiguritasOfrecidas(figuritasOfrecidas.filter(fid => fid !== id));
    } else {
      setFiguritasOfrecidas([...figuritasOfrecidas, id]);
    }
  };

  // Prefill asíncrono (Retrocompatibilidad): Si se navega de la forma vieja usando base IDs,
  // resolvemos las figuritas físicas correspondientes cuando lleguen los datos.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (prefillApplied.current) return;
    
    // Si ya cargamos de forma síncrona los IDs directos, no hacemos nada más
    if (directOfferedIds && directOfferedIds.length > 0) {
      prefillApplied.current = true;
      return;
    }
    
    if (!offeredBaseIds || offeredBaseIds.length === 0 || misFiguritas.length === 0) return;
    
    prefillApplied.current = true;
    const ids = misFiguritas.filter((f) => offeredBaseIds.includes(f.figuritaBaseId)).map((f) => f.id);
    if (ids.length > 0) {
      setFiguritasOfrecidas(ids);
      setExpandedMias(true);
    }
  }, [misFiguritas, offeredBaseIds, directOfferedIds]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Envío del formulario con validaciones existentes intactas
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

      {/* Section 1: Figurita que quieres (Mismo UI/UX que ya tenías) */}
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

      {/* Section 2: Figuritas que ofreces (Mismo UI/UX con acordeón, paginado y filtros) */}
      <div className="mb-8">
        <button
          onClick={() => setExpandedMias(!expandedMias)}
          className="w-full flex items-center justify-between p-4 bg-surface border border-border rounded-lg hover:bg-surface/80 transition-colors mb-2"
        >
          <h3 className="text-lg font-semibold text-text">
            ¿Qué figuritas ofreces?
            {figuritasOfrecidas.length > 0 && (
              <span className="ml-2 text-sm font-normal text-primary">({figuritasOfrecidas.length} elegidas)</span>
            )}
          </h3>
          <span className="text-primary text-xl">{expandedMias ? '▼' : '►'}</span>
        </button>

        {expandedMias && (
          <div className="space-y-2">
            <input
              type="text"
              aria-label="Buscar en tus figuritas"
              placeholder="Buscar en tus figuritas..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPaginaSel(0); }}
              className="w-full p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
            />
            {visibles.length === 0 ? (
              <p className="text-muted p-3">No se encontraron figuritas.</p>
            ) : (
              visibles.map(fig => (
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
              ))
            )}
            {totalPagesSel > 1 && <Paginador page={paginaSel} totalPages={totalPagesSel} onChange={setPaginaSel} />}
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