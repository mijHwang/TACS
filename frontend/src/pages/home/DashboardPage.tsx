import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import api from '../../services/api';
import { getDashboardData } from '../../services/dashboardService';
import type { DashboardData } from '../../types/dashboard';
import Carousel from './components/Carousel';
import StatCard from './components/StatCard';
import CollectionProgress from './components/CollectionProgress';
import QuickActions from './components/QuickActions';
import SectionSkeleton from './components/SectionSkeleton';
import SubastaCard from './components/SubastaCard';
import PropuestaRecibidaCard from './components/PropuestaRecibidaCard';
import PropuestaEnviadaRow from './components/PropuestaEnviadaRow';
import NovedadesList from './components/NovedadesList';

const BLUE = '#03BAE9';
const RED = '#D82D31';
const GREEN = '#05B15A';
const PURPLE = '#7F77DD';

function Section({ title, color, to, toLabel, error, children }: {
  title: string; color: string; to?: string; toLabel?: string; error?: boolean; children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
        </div>
        {to && (
          <button type="button" onClick={() => navigate(to)}
            className="flex items-center gap-1 text-xs font-semibold bg-transparent border-none cursor-pointer hover:opacity-70" style={{ color }}>
            {toLabel ?? 'Ver todos'} →
          </button>
        )}
      </div>
      {error ? <p className="text-sm text-gray-400">No se pudo cargar esta sección.</p> : children}
    </section>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !user?.username) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    getDashboardData(user.id, user.username)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [user?.id, user?.username]);

  const loadDashboard = useCallback(() => {
    if (!user?.id || !user?.username) return;
    queueMicrotask(() => {
      setLoading(true);
    });
    getDashboardData(user.id, user.username)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setData(null);
        setLoading(false);
      });
  }, [user]);

  const responder = (id: string, accion: 'aceptar' | 'rechazar') => {
    api.put(`/api/solicitudes-intercambio/${id}/${accion}`)
      .then(() => setData((prev) => prev && {
        ...prev,
        recibidas: { ...prev.recibidas, data: prev.recibidas.data.map(p => p.id === id ? { ...p, estado: accion === 'aceptar' ? 'ACEPTADO' : 'RECHAZADO' } : p) },
      }))
      .catch((e) => { console.error(e); alert('No se pudo procesar la propuesta'); });
  };

  const wrap = { margin: '-1.75rem', padding: '1.75rem', minHeight: 'calc(100% + 3.5rem)', background: 'white' };

  if (loading) {
    return (
      <div className="page-enter flex flex-col gap-8" style={wrap}>
        <div><h1 className="text-2xl font-bold text-gray-900 mb-1">Inicio</h1><p className="text-sm text-gray-500">Cargando tu resumen…</p></div>
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-enter flex flex-col gap-8" style={wrap}>
        <div><h1 className="text-2xl font-bold text-gray-900 mb-1">Inicio</h1><p className="text-sm text-gray-500">Resumen de tu actividad</p></div>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-base font-semibold" style={{ color: RED }}>No pudimos cargar tu dashboard.</p>
          <button
            type="button"
            onClick={loadDashboard}
            className="px-6 py-2 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: RED }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const c = data.counts;

  return (
    <div className="page-enter flex flex-col gap-8" style={wrap}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Inicio</h1>
        <p className="text-sm text-gray-500">Resumen de tu actividad{user?.username ? `, ${user.username}` : ''}</p>
      </div>

      <CollectionProgress owned={data.progreso.owned} total={data.progreso.total} faltan={data.progreso.faltan} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Figuritas publicadas" value={c.publicadas} sub={`+${c.excedentes} excedentes`} color={BLUE} to="/coleccion/repetidas" />
        <StatCard label="Propuestas pendientes" value={c.propuestasPendientes} sub={`${c.recibidasPendientes} recibidas`} color={GREEN} to="/propuestas/recibidas" />
        <StatCard label="Subastas activas" value={c.subastasActivas} sub={`${c.subastasPorVencer} por vencer`} color={RED} to="/subastas/activas" />
        <StatCard label="Alertas sin leer" value={c.alertasSinLeer} sub="novedades" color={BLUE} to="/notificaciones" />
      </div>

      <QuickActions />

      <Section title="Sugerencias para vos" color={PURPLE} to="/sugerencias" toLabel="Ver todas" error={data.sugerencias.error}>
        {data.sugerencias.data.length === 0 ? (
          <p className="text-sm text-gray-400">Sin sugerencias por ahora.</p>
        ) : (
          <Carousel>
            {data.sugerencias.data.map(({ key, figurita: f, contraparteNombre, figuritasAOfrecerBaseIds }) => (
              <button key={key}
                onClick={() => navigate('/propuestas/nueva', { state: { figuritaSeleccionada: f, figuritasOfrecidasBaseIds: figuritasAOfrecerBaseIds } })}
                className="text-left min-w-[180px] p-4 rounded-2xl bg-white hover:-translate-y-0.5 transition-transform" style={{ border: `1.5px solid ${PURPLE}30` }}>
                <p className="text-sm font-bold text-gray-900">{f.jugadorNombre} <span className="text-gray-400 font-normal">#{f.numero}</span></p>
                <p className="text-xs text-gray-500">{f.seleccionNombre} · {f.equipoNombre}</p>
                <p className="text-xs text-gray-400 mt-2">De @{contraparteNombre}</p>
                <p className="text-xs mt-2 font-semibold" style={{ color: PURPLE }}>Proponer →</p>
              </button>
            ))}
          </Carousel>
        )}
      </Section>

      <Section title="Propuestas recibidas" color={GREEN} to="/propuestas/recibidas" toLabel="Ver todas" error={data.recibidas.error}>
        {data.recibidas.data.length === 0 ? (
          <p className="text-sm text-gray-400">No tenés propuestas recibidas.</p>
        ) : (
          <Carousel>
            {data.recibidas.data.map((p) => (
              <PropuestaRecibidaCard key={p.id} propuesta={p}
                onAceptar={(id) => responder(id, 'aceptar')} onRechazar={(id) => responder(id, 'rechazar')} />
            ))}
          </Carousel>
        )}
        {data.enviadas.data.length > 0 && (
          <div className="rounded-2xl bg-white px-4 mt-1" style={{ border: `1.5px solid ${GREEN}20` }}>
            <p className="text-xs font-semibold text-gray-400 pt-3">Enviadas</p>
            {data.enviadas.data.slice(0, 5).map((p) => <PropuestaEnviadaRow key={p.id} propuesta={p} />)}
          </div>
        )}
      </Section>

      <Section title="Subastas activas" color={RED} to="/subastas/activas" toLabel="Ver todas" error={data.subastas.error}>
        {data.subastas.data.length === 0 ? (
          <p className="text-sm text-gray-400">No tenés subastas activas ni participando.</p>
        ) : (
          <Carousel>
            {data.subastas.data.map((s) => (
              <SubastaCard key={s.id} figurita={s.figuritaLabel} propietario={s.propietario} ofertasCount={s.ofertas}
                endTime={s.endTime} esMia={s.esMia}
                etiqueta={s.participacion === 'mia' ? 'Mi subasta' : s.participacion === 'ganando' ? 'Vas ganando' : 'Te superaron'} />
            ))}
          </Carousel>
        )}
      </Section>

      <Section title="Novedades" color={BLUE} to="/notificaciones" toLabel="Ver todas" error={data.alertas.error}>
        <NovedadesList alertas={data.alertas.data.slice(0, 5)} />
      </Section>
    </div>
  );
}
