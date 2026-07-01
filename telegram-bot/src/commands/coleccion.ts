import type { FiguritasApi } from "../api/figuritas";
import type { Session } from "../session/store";
import { listaFiguritas, listaBases } from "../format/figuritas";

export async function coleccionReply(api: FiguritasApi, s: Session): Promise<string> {
  return listaFiguritas(await api.coleccion(s), "Tu colección está vacía.");
}

export async function faltantesReply(api: FiguritasApi, s: Session): Promise<string> {
  return listaBases(await api.faltantes(s), "¡No te falta ninguna figurita! 🎉");
}

export async function repetidasReply(api: FiguritasApi, s: Session): Promise<string> {
  return listaFiguritas(await api.repetidas(s), "No tenés figuritas repetidas.");
}
