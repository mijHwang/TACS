export interface Session {
  token: string;
  username: string;
  userId: string;
}

export interface SessionStore {
  get(chatId: number): Session | undefined;
  set(chatId: number, session: Session): void;
  clear(chatId: number): void;
}

export function createSessionStore(): SessionStore {
  const map = new Map<number, Session>();
  return {
    get: (chatId) => map.get(chatId),
    set: (chatId, session) => {
      map.set(chatId, session);
    },
    clear: (chatId) => {
      map.delete(chatId);
    },
  };
}
