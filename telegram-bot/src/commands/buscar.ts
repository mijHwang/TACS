import type { FiguritasApi } from "../api/figuritas";
import type { Session } from "../session/store";
import { listaFiguritas } from "../format/figuritas";

export async function buscarReply(api: FiguritasApi, s: Session, search: string): Promise<string> {
  const page = await api.catalogo(s, search);
  const vacio = search
    ? `No se encontraron figuritas para "${search}".`
    : "No hay figuritas disponibles.";
  return listaFiguritas(page, vacio);
}
