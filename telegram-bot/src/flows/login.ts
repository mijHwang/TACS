import type { ApiClient } from "../api/client";
import { authenticate } from "../api/auth";
import { ApiError } from "../errors";
import type { SessionStore } from "../session/store";
import type { PendingFlow } from "../session/flows";
import type { FlowResult } from "./types";

type LoginFlow = Extract<PendingFlow, { kind: "login" }>;

export async function handleLogin(
  flow: LoginFlow,
  text: string,
  chatId: number,
  deps: { client: ApiClient; sessions: SessionStore },
): Promise<FlowResult> {
  if (flow.step === "username") {
    return {
      replies: ["🔒 Ahora ingresá tu contraseña:"],
      next: { kind: "login", step: "password", username: text.trim() },
    };
  }

  // step === "password"
  try {
    const session = await authenticate(deps.client, flow.username, text);
    deps.sessions.set(chatId, session);
    return {
      replies: [`✅ Sesión iniciada. ¡Hola, ${session.username}!`],
      deleteIncoming: true,
      clear: true,
    };
  } catch (e) {
    const credencialesMal = e instanceof ApiError && (e.status === 401 || e.status === 403);
    return {
      replies: [
        credencialesMal
          ? "❌ Usuario o contraseña incorrectos. Probá /login de nuevo."
          : "❌ No se pudo iniciar sesión. Probá de nuevo en un momento.",
      ],
      deleteIncoming: true,
      clear: true,
    };
  }
}
