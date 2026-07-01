import type { FiguritaResponseDTO, FiguritaPublicadaResponseDTO, SubastaResponseDTO } from "../api/types";

export type PendingFlow =
  | { kind: "login"; step: "username" }
  | { kind: "login"; step: "password"; username: string }
  | { kind: "publicar"; step: "select"; opciones: FiguritaResponseDTO[] }
  | { kind: "publicar"; step: "cantidad"; figuritaBaseId: string; numero: number; jugador: string }
  | { kind: "proponer"; step: "elegirObjetivo"; objetivos: FiguritaPublicadaResponseDTO[] }
  | { kind: "proponer"; step: "elegirOfrecidas"; figuritaId: string; objetivoDesc: string; ofrecibles: FiguritaResponseDTO[] }
  | { kind: "ofertar"; step: "elegirSubasta"; subastas: SubastaResponseDTO[] }
  | { kind: "ofertar"; step: "elegirFiguritas"; subastaId: string; subastaDesc: string; ofrecibles: FiguritaResponseDTO[] };

export interface FlowStore {
  get(chatId: number): PendingFlow | undefined;
  set(chatId: number, flow: PendingFlow): void;
  clear(chatId: number): void;
}

export function createFlowStore(): FlowStore {
  const map = new Map<number, PendingFlow>();
  return {
    get: (chatId) => map.get(chatId),
    set: (chatId, flow) => {
      map.set(chatId, flow);
    },
    clear: (chatId) => {
      map.delete(chatId);
    },
  };
}
