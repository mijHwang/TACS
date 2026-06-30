// ── DTOs backend (subconjunto usado por el dashboard) ──────────────────────────
export interface FiguritaResponseDTO {
  id: string;
  numero: number;
  figuritaBaseId: string;
  count: number;
  jugadorNombre: string;
  seleccionNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
  ownerId: string;
  ownerName: string;
  imagenUrl?: string | null;
}

export interface FiguritaBaseRef {
  numero?: number;
  jugador?: { nombre?: string };
  seleccion?: { nombre?: string };
}

export interface FiguritaRef {
  id: string;
  figuritaBase?: FiguritaBaseRef;
  owner?: { username?: string };
}

export interface SolicitudDeIntercambio {
  id: string;
  usuario?: { id?: string; username?: string };
  figurita?: FiguritaRef;
  figuritasOfrecidas?: FiguritaRef[];
  estado: string;
  destinatarioUsername?: string;
}

export interface NotificacionDTO {
  id: string;
  tipo?: string;
  titulo?: string;
  mensaje?: string;
  leida?: boolean;
  fecha?: string;
  enlace?: string;
}

export interface SugerenciaResponseDTO {
  contraparteId: string;
  contraparteNombre: string;
  figuritasARecibir: FiguritaResponseDTO[];
  figuritasAOfrecer: FiguritaResponseDTO[];
}

// ── View-models ────────────────────────────────────────────────────────────────
export type AlertaTipoUI = 'propuesta' | 'subasta' | 'intercambio' | 'sistema';

export interface PropuestaVM {
  id: string;
  tipo: 'enviada' | 'recibida';
  contraparte: string;
  ofrece: string[];
  pide: string;
  estado: string;
}

export interface SubastaVM {
  id: string;
  figuritaLabel: string;
  esMia: boolean;
  propietario: string;
  ofertas: number;
  endTime: string;
  participacion: 'mia' | 'ganando' | 'superado';
}

export interface AlertaVM {
  id: string;
  tipo: AlertaTipoUI;
  texto: string;
  tiempo: string;
  leida: boolean;
}

export interface SugerenciaFlatVM {
  key: string;
  figurita: FiguritaResponseDTO;
  contraparteNombre: string;
  figuritasAOfrecerBaseIds: string[];
}

export interface DashboardCounts {
  owned: number;
  totalAlbum: number;
  faltan: number;
  progresoPct: number;
  publicadas: number;
  excedentes: number;
  propuestasPendientes: number;
  recibidasPendientes: number;
  enviadasPendientes: number;
  subastasActivas: number;
  subastasPorVencer: number;
  alertasSinLeer: number;
}

export interface SectionResult<T> {
  data: T;
  error: boolean;
}

export interface DashboardData {
  counts: DashboardCounts;
  progreso: { owned: number; total: number; faltan: number };
  publicadas: SectionResult<FiguritaResponseDTO[]>;
  recibidas: SectionResult<PropuestaVM[]>;
  enviadas: SectionResult<PropuestaVM[]>;
  subastas: SectionResult<SubastaVM[]>;
  alertas: SectionResult<AlertaVM[]>;
  sugerencias: SectionResult<SugerenciaFlatVM[]>;
}
