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
