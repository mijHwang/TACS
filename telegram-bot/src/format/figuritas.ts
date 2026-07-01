import type { PagedResponse, FiguritaResponseDTO, FiguritaBaseDTO, NotificacionDTO } from "../api/types";

function grupo(f: { seleccionNombre: string | null; equipoNombre: string | null; categoriaNombre: string | null }): string {
  return f.seleccionNombre ?? f.equipoNombre ?? f.categoriaNombre ?? "—";
}

export function describirFigurita(f: FiguritaResponseDTO): string {
  return `#${f.numero} · ${f.jugadorNombre ?? "?"} (${grupo(f)}) ×${f.count}`;
}

export function describirBase(b: FiguritaBaseDTO): string {
  return `#${b.numero ?? "?"} · ${b.jugadorNombre ?? "?"} (${grupo(b)})`;
}

function colaPaginado(page: { totalElements: number; last: boolean }): string {
  return page.last
    ? `\n\nTotal: ${page.totalElements}`
    : `\n\n(hay más resultados; total ${page.totalElements})`;
}

export function listaFiguritas(page: PagedResponse<FiguritaResponseDTO>, tituloVacio: string): string {
  if (page.content.length === 0) return tituloVacio;
  const lineas = page.content.map((f, i) => `${i + 1}. ${describirFigurita(f)}`);
  return lineas.join("\n") + colaPaginado(page);
}

export function listaBases(page: PagedResponse<FiguritaBaseDTO>, tituloVacio: string): string {
  if (page.content.length === 0) return tituloVacio;
  const lineas = page.content.map((b, i) => `${i + 1}. ${describirBase(b)}`);
  return lineas.join("\n") + colaPaginado(page);
}

export function listaNotificaciones(page: PagedResponse<NotificacionDTO>): string {
  if (page.content.length === 0) return "No tenés notificaciones.";
  const lineas = page.content.map((n) => {
    const marca = n.leida ? "✓" : "•";
    const cuerpo = n.mensaje ? `\n   ${n.mensaje}` : "";
    return `${marca} ${n.titulo ?? n.tipo ?? "Notificación"}${cuerpo}`;
  });
  return lineas.join("\n") + colaPaginado(page);
}
