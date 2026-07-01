import type { PagedResponse, SubastaResponseDTO } from "../api/types";

export function describirSubasta(su: SubastaResponseDTO): string {
  const fig = `#${su.figuritaNumero ?? "?"} ${su.figuritaJugadorNombre ?? "?"}`;
  const lider = su.liderUsername ? `líder @${su.liderUsername}` : "sin ofertas";
  const fin = su.horaFin ? su.horaFin.replace("T", " ").slice(0, 16) : "?";
  return `${fig} · ${su.ofertasCount} oferta(s) · ${lider} · termina ${fin}`;
}

export function listaSubastas(page: PagedResponse<SubastaResponseDTO>, tituloVacio: string): string {
  if (page.content.length === 0) return tituloVacio;
  return page.content.map((su, i) => `${i + 1}. ${describirSubasta(su)}`).join("\n");
}
