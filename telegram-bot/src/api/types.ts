export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface FiguritaResponseDTO {
  id: string;
  numero: number;
  figuritaBaseId: string;
  count: number;
  jugadorNombre: string | null;
  seleccionNombre: string | null;
  equipoNombre: string | null;
  categoriaNombre: string | null;
  ownerId: string | null;
  ownerName: string | null;
  imagenUrl: string | null;
}

export interface FiguritaBaseDTO {
  id: string;
  numero: number | null;
  jugadorNombre: string | null;
  seleccionNombre: string | null;
  equipoNombre: string | null;
  categoriaNombre: string | null;
  imagenUrl: string | null;
}

export interface NotificacionDTO {
  id: string;
  tipo: string | null;
  titulo: string | null;
  mensaje: string | null;
  leida: boolean | null;
  fecha: string | null;
  enlace: string | null;
}

export interface FiguritaPublicadaResponseDTO {
  id: string;
  figuritaBaseId: string;
  figuritaNumero: number;
  figuritaJugadorNombre: string;
  figuritaSeleccionNombre: string;
  figuritaEquipoNombre: string;
  figuritaCategoriaNombre: string;
  figuritaIds: string[];
  cantidad: number;
  usuarioId: string;
  usuarioUsername: string;
  fechaPublicacion: string;
  estado: string;
}

export interface UsuarioDTO {
  id: string;
  username: string;
}

export type EstadoSubasta = "PENDIENTE" | "EN_CURSO" | "FINALIZADA" | "CANCELADA" | string;

export interface SubastaResponseDTO {
  id: string;
  usuarioId: string | null;
  usuarioUsername: string | null;
  figuritaId: string | null;
  figuritaNumero: number | null;
  figuritaJugadorNombre: string | null;
  figuritaSeleccionNombre: string | null;
  figuritaEquipoNombre: string | null;
  figuritaCategoriaNombre: string | null;
  estado: EstadoSubasta | null;
  duracion: number | null;
  horaInicio: string | null;
  horaFin: string | null;
  ofertasCount: number;
  liderId: string | null;
  liderUsername: string | null;
  liderFiguritasNombres: string[] | null;
}

/**
 * Solicitud de intercambio tal como la devuelve el backend (entidad cruda con refs lazy).
 * Se tipa defensivamente: solo se usan los campos estables para formatear.
 */
export interface SolicitudDTO {
  id: string;
  estado: string | null;
  destinatarioUsername: string | null;
  usuario: { username?: string | null } | null;
  figuritasOfrecidas: unknown[] | null;
}
