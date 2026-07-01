import type { PagedResponse, SolicitudDTO } from "../api/types";

function estadoDe(s: SolicitudDTO): string {
  return s.estado ?? "PENDIENTE";
}

export function listaRecibidas(page: PagedResponse<SolicitudDTO>, tituloVacio: string): string {
  if (page.content.length === 0) return tituloVacio;
  return page.content
    .map(
      (s, i) =>
        `${i + 1}. [${estadoDe(s)}] de @${s.usuario?.username ?? "?"} · ofrece ${s.figuritasOfrecidas?.length ?? 0} figurita(s)`,
    )
    .join("\n");
}

export function listaEnviadas(page: PagedResponse<SolicitudDTO>, tituloVacio: string): string {
  if (page.content.length === 0) return tituloVacio;
  return page.content
    .map(
      (s, i) =>
        `${i + 1}. [${estadoDe(s)}] para @${s.destinatarioUsername ?? "?"} · ofreciste ${s.figuritasOfrecidas?.length ?? 0} figurita(s)`,
    )
    .join("\n");
}
