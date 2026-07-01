import type { ApiClient } from "./client";
import type { UsuarioDTO } from "./types";
import type { Session } from "../session/store";

export async function authenticate(
  client: ApiClient,
  username: string,
  password: string,
): Promise<Session> {
  const token = (await client.postText("/auth/login", { username, password })).trim();
  const usuario = await client.getJson<UsuarioDTO>(
    `/api/usuarios/by-username/${encodeURIComponent(username)}`,
    token,
  );
  return { token, username: usuario.username, userId: usuario.id };
}
