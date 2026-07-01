# Bot de Telegram para TACS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un bot de Telegram (servicio Node/TS aparte) que actúa como cliente REST del backend Java existente, con login y las acciones básicas de lectura + publicar una figurita repetida (US1).

**Architecture:** Proceso Node independiente con grammY por long polling. Cada comando se enruta a un handler que llama al backend vía un cliente REST adjuntando el JWT de la sesión del `chatId`. Los flujos paso a paso (login, publicar) usan un `FlowStore` en memoria (máquina de estados manual liviana), no el plugin de conversaciones. El bot no toca el backend ni la base.

**Tech Stack:** Node 20, TypeScript 5 (compilado a CommonJS), grammY 1.x, Vitest 2, Docker. `fetch` nativo (sin librería HTTP extra).

## Global Constraints

- **Node 20** (usa `fetch` global; imagen `node:20-alpine`).
- **Secretos por env, nunca en el repo:** `TELEGRAM_BOT_TOKEN` y `BACKEND_URL`. Solo placeholders en `.env.example`; el `.env` real es gitignored. El bot nunca loguea tokens ni contraseñas.
- **El backend NO se modifica.** El bot solo consume su API REST.
- **`POST /auth/login` devuelve el JWT como texto plano** en el body (no JSON).
- **El JWT solo lleva `username`**; el `userId` (ObjectId) se resuelve con `GET /api/usuarios/by-username/{username}`.
- **Todas las llamadas salvo `/auth/login`** viajan con header `Authorization: Bearer {token}`.
- **`PagedResponse<T>`** = `{ content: T[], page, size, totalElements, totalPages, last }`.
- **Nombres de métodos/dominio en español** donde exista convención (coherente con el backend).
- **TDD:** test que falla → implementación mínima → test que pasa → commit. Un commit por tarea como mínimo.

---

## Estructura de archivos

```
telegram-bot/
  src/
    index.ts                 # bootstrap grammY + wiring de comandos + router de flujos
    config.ts                # loadConfig(): valida TELEGRAM_BOT_TOKEN, BACKEND_URL
    errors.ts                # ApiError
    guard.ts                 # guard(): requiere sesión + maneja ApiError para comandos de 1 tiro
    api/
      types.ts               # tipos espejo de los DTOs del backend
      client.ts              # createApiClient(): getJson/postJson/postText + mapeo de errores
      auth.ts                # authenticate(): login + resolveUser -> Session
      figuritas.ts           # createFiguritasApi(): coleccion/faltantes/repetidas/catalogo   (Fase 2)
      publicaciones.ts       # createPublicacionesApi(): publicar                              (Fase 2)
      notificaciones.ts      # createNotificacionesApi(): porUsuario                           (Fase 2)
    session/
      store.ts               # createSessionStore(): Map<chatId, Session>
      flows.ts               # createFlowStore(): Map<chatId, PendingFlow>
    flows/
      types.ts               # FlowResult
      login.ts               # handleLogin()
      publicar.ts            # handlePublicar()                                                (Fase 2)
    commands/
      coleccion.ts           # coleccionReply/faltantesReply/repetidasReply                   (Fase 2)
      buscar.ts              # buscarReply                                                     (Fase 2)
      notificaciones.ts      # notificacionesReply                                             (Fase 2)
      publicar.ts            # iniciarPublicar                                                 (Fase 2)
    format/
      figuritas.ts           # describir/lista* (pretty-print)                                 (Fase 2)
  tests/                     # espejo de src/, archivos *.test.ts
  package.json  package-lock.json  tsconfig.json  vitest.config.ts
  Dockerfile  .dockerignore  .gitignore  README.md
```

---

# FASE 1 — Bot base + login (termina en checkpoint de validación)

### Task 1: Scaffold del proyecto + config + errores

**Files:**
- Create: `telegram-bot/package.json`
- Create: `telegram-bot/tsconfig.json`
- Create: `telegram-bot/vitest.config.ts`
- Create: `telegram-bot/.gitignore`
- Create: `telegram-bot/.dockerignore`
- Create: `telegram-bot/src/config.ts`
- Create: `telegram-bot/src/errors.ts`
- Test: `telegram-bot/tests/config.test.ts`

**Interfaces:**
- Produces: `loadConfig(env?): { botToken: string; backendUrl: string }` (lanza `Error` si falta `TELEGRAM_BOT_TOKEN`); `class ApiError extends Error { status: number }`.

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "tacs-telegram-bot",
  "version": "1.0.0",
  "private": true,
  "description": "Bot de Telegram para TACS (cliente REST del backend)",
  "scripts": {
    "dev": "tsx --env-file=.env watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "grammy": "^1.30.0"
  },
  "devDependencies": {
    "@types/node": "^22.7.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Crear `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

> `rootDir: "src"` garantiza que `src/index.ts` emita a `dist/index.js` (lo que espera el `CMD` del Dockerfile). Vitest descubre los tests por su cuenta (`vitest.config.ts`), no depende de `include`.

- [ ] **Step 3: Crear `vitest.config.ts`, `.gitignore`, `.dockerignore`**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

`.gitignore`:
```
node_modules/
dist/
.env
```

`.dockerignore`:
```
node_modules
dist
tests
.env
.git
```

- [ ] **Step 4: Escribir el test que falla — `tests/config.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { loadConfig } from "../src/config";

describe("loadConfig", () => {
  it("lanza si falta TELEGRAM_BOT_TOKEN", () => {
    expect(() => loadConfig({})).toThrow(/TELEGRAM_BOT_TOKEN/);
  });

  it("usa BACKEND_URL por defecto cuando no está seteado", () => {
    const cfg = loadConfig({ TELEGRAM_BOT_TOKEN: "abc" });
    expect(cfg).toEqual({ botToken: "abc", backendUrl: "http://localhost:8080" });
  });

  it("respeta BACKEND_URL cuando está seteado", () => {
    const cfg = loadConfig({ TELEGRAM_BOT_TOKEN: "abc", BACKEND_URL: "http://backend:8080" });
    expect(cfg.backendUrl).toBe("http://backend:8080");
  });
});
```

- [ ] **Step 5: Instalar dependencias y verificar que el test falla**

Run:
```bash
cd telegram-bot && npm install && npm test
```
Expected: FAIL — `Cannot find module '../src/config'` (config.ts todavía no existe).

- [ ] **Step 6: Implementar `src/errors.ts` y `src/config.ts`**

`src/errors.ts`:
```ts
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}
```

`src/config.ts`:
```ts
export interface Config {
  botToken: string;
  backendUrl: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error("Falta la variable de entorno TELEGRAM_BOT_TOKEN.");
  }
  return {
    botToken,
    backendUrl: env.BACKEND_URL ?? "http://localhost:8080",
  };
}
```

- [ ] **Step 7: Verificar que el test pasa**

Run: `cd telegram-bot && npm test`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add telegram-bot/
git commit -m "feat(telegram-bot): scaffold del proyecto + config y errores"
```

---

### Task 2: Cliente HTTP + tipos de la API

**Files:**
- Create: `telegram-bot/src/api/types.ts`
- Create: `telegram-bot/src/api/client.ts`
- Test: `telegram-bot/tests/api/client.test.ts`

**Interfaces:**
- Consumes: `ApiError` (Task 1).
- Produces:
  - `interface ApiClient { getJson<T>(path, token): Promise<T>; postJson<T>(path, body, token): Promise<T>; postText(path, body): Promise<string> }`
  - `createApiClient(baseUrl: string, fetchFn?: typeof fetch): ApiClient`
  - Tipos: `PagedResponse<T>`, `FiguritaResponseDTO`, `FiguritaBaseDTO`, `NotificacionDTO`, `FiguritaPublicadaResponseDTO`, `UsuarioDTO`.

- [ ] **Step 1: Crear `src/api/types.ts`**

```ts
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
```

- [ ] **Step 2: Escribir el test que falla — `tests/api/client.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { createApiClient } from "../../src/api/client";
import { ApiError } from "../../src/errors";

function fakeFetch(response: Partial<Response> & { okBody?: unknown; text?: string }) {
  return vi.fn(async () =>
    ({
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.okBody,
      text: async () => response.text ?? "",
    }) as unknown as Response,
  );
}

describe("createApiClient", () => {
  it("getJson adjunta el Bearer y arma la URL con baseUrl", async () => {
    const fetchFn = fakeFetch({ okBody: { hola: "mundo" } });
    const client = createApiClient("http://backend:8080", fetchFn as unknown as typeof fetch);

    const res = await client.getJson<{ hola: string }>("/api/x", "TOKEN");

    expect(res).toEqual({ hola: "mundo" });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("http://backend:8080/api/x");
    expect((init as RequestInit).method).toBe("GET");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer TOKEN" });
  });

  it("postText devuelve el body como texto (sin Bearer)", async () => {
    const fetchFn = fakeFetch({ text: "jwt-token-plano" });
    const client = createApiClient("http://b", fetchFn as unknown as typeof fetch);

    const token = await client.postText("/auth/login", { username: "u", password: "p" });

    expect(token).toBe("jwt-token-plano");
    const [, init] = fetchFn.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({ "Content-Type": "application/json" });
    expect((init as RequestInit).body).toBe(JSON.stringify({ username: "u", password: "p" }));
  });

  it("mapea 401 a ApiError con status 401", async () => {
    const fetchFn = fakeFetch({ ok: false, status: 401, text: "" });
    const client = createApiClient("http://b", fetchFn as unknown as typeof fetch);

    await expect(client.getJson("/api/x", "T")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
    });
  });

  it("mapea error de red a ApiError status 0", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const client = createApiClient("http://b", fetchFn as unknown as typeof fetch);

    await expect(client.getJson("/api/x", "T")).rejects.toMatchObject({ status: 0 });
  });
});
```

- [ ] **Step 3: Verificar que el test falla**

Run: `cd telegram-bot && npm test -- client`
Expected: FAIL — `Cannot find module '../../src/api/client'`.

- [ ] **Step 4: Implementar `src/api/client.ts`**

```ts
import { ApiError } from "../errors";

export interface ApiClient {
  getJson<T>(path: string, token: string): Promise<T>;
  postJson<T>(path: string, body: unknown, token: string): Promise<T>;
  postText(path: string, body: unknown): Promise<string>;
}

export function createApiClient(baseUrl: string, fetchFn: typeof fetch = fetch): ApiClient {
  async function doFetch(path: string, init: RequestInit): Promise<Response> {
    let res: Response;
    try {
      res = await fetchFn(baseUrl + path, init);
    } catch {
      throw new ApiError(0, "No se pudo conectar con el servidor. Probá de nuevo en un momento.");
    }
    if (!res.ok) {
      const detalle = await res.text().catch(() => "");
      throw new ApiError(res.status, mensajePorStatus(res.status, detalle));
    }
    return res;
  }

  return {
    async getJson<T>(path: string, token: string): Promise<T> {
      const res = await doFetch(path, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
      return (await res.json()) as T;
    },
    async postJson<T>(path: string, body: unknown, token: string): Promise<T> {
      const res = await doFetch(path, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return (await res.json()) as T;
    },
    async postText(path: string, body: unknown): Promise<string> {
      const res = await doFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return await res.text();
    },
  };
}

function mensajePorStatus(status: number, detalle: string): string {
  if (status === 401 || status === 403) return "Tu sesión expiró. Usá /login de nuevo.";
  if (status === 400) return detalle.trim() || "El pedido no es válido.";
  if (status >= 500) return "El servidor no está disponible. Probá de nuevo en un momento.";
  return detalle.trim() || `Error inesperado (${status}).`;
}
```

- [ ] **Step 5: Verificar que el test pasa**

Run: `cd telegram-bot && npm test -- client`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add telegram-bot/src/api telegram-bot/tests/api
git commit -m "feat(telegram-bot): cliente HTTP + tipos de la API con mapeo de errores"
```

---

### Task 3: Session store + autenticación

**Files:**
- Create: `telegram-bot/src/session/store.ts`
- Create: `telegram-bot/src/api/auth.ts`
- Test: `telegram-bot/tests/session/store.test.ts`
- Test: `telegram-bot/tests/api/auth.test.ts`

**Interfaces:**
- Consumes: `ApiClient` (Task 2), `UsuarioDTO` (Task 2), `ApiError`.
- Produces:
  - `interface Session { token: string; username: string; userId: string }`
  - `interface SessionStore { get(chatId): Session | undefined; set(chatId, s): void; clear(chatId): void }`
  - `createSessionStore(): SessionStore`
  - `authenticate(client: ApiClient, username: string, password: string): Promise<Session>`

- [ ] **Step 1: Escribir el test que falla — `tests/session/store.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { createSessionStore } from "../../src/session/store";

describe("SessionStore", () => {
  it("guarda, recupera y limpia sesiones por chatId", () => {
    const store = createSessionStore();
    const s = { token: "t", username: "u", userId: "1" };

    expect(store.get(10)).toBeUndefined();
    store.set(10, s);
    expect(store.get(10)).toEqual(s);
    store.clear(10);
    expect(store.get(10)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Escribir el test que falla — `tests/api/auth.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { authenticate } from "../../src/api/auth";
import type { ApiClient } from "../../src/api/client";

function clientMock(over: Partial<ApiClient>): ApiClient {
  return {
    getJson: vi.fn(),
    postJson: vi.fn(),
    postText: vi.fn(),
    ...over,
  };
}

describe("authenticate", () => {
  it("loguea, resuelve el userId por username y arma la Session", async () => {
    const client = clientMock({
      postText: vi.fn(async () => "  jwt-abc  "),
      getJson: vi.fn(async () => ({ id: "665f", username: "maxi" })),
    });

    const session = await authenticate(client, "maxi", "secreta");

    expect(session).toEqual({ token: "jwt-abc", username: "maxi", userId: "665f" });
    expect(client.postText).toHaveBeenCalledWith("/auth/login", { username: "maxi", password: "secreta" });
    expect(client.getJson).toHaveBeenCalledWith("/api/usuarios/by-username/maxi", "jwt-abc");
  });

  it("propaga el error si el login falla", async () => {
    const client = clientMock({
      postText: vi.fn(async () => {
        throw new Error("401");
      }),
    });
    await expect(authenticate(client, "x", "y")).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `cd telegram-bot && npm test -- store auth`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 4: Implementar `src/session/store.ts`**

```ts
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
```

- [ ] **Step 5: Implementar `src/api/auth.ts`**

```ts
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
```

- [ ] **Step 6: Verificar que pasan**

Run: `cd telegram-bot && npm test -- store auth`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add telegram-bot/src/session/store.ts telegram-bot/src/api/auth.ts telegram-bot/tests
git commit -m "feat(telegram-bot): session store en memoria + authenticate (login + resolveUser)"
```

---

### Task 4: Flujo de login paso a paso (FlowStore + handleLogin)

**Files:**
- Create: `telegram-bot/src/session/flows.ts`
- Create: `telegram-bot/src/flows/types.ts`
- Create: `telegram-bot/src/flows/login.ts`
- Test: `telegram-bot/tests/flows/login.test.ts`

**Interfaces:**
- Consumes: `ApiClient`, `SessionStore`, `authenticate`, `ApiError`.
- Produces:
  - `type PendingFlow` (unión discriminada; incluye variantes `login` y `publicar`).
  - `interface FlowStore { get(chatId): PendingFlow | undefined; set(chatId, flow): void; clear(chatId): void }`, `createFlowStore()`.
  - `interface FlowResult { replies: string[]; deleteIncoming?: boolean; next?: PendingFlow; clear?: boolean }`
  - `handleLogin(flow, text, chatId, deps: { client, sessions }): Promise<FlowResult>`

- [ ] **Step 1: Crear `src/session/flows.ts`** (incluye ya las variantes de publicar para no re-tocar el tipo en Fase 2)

```ts
import type { FiguritaResponseDTO } from "../api/types";

export type PendingFlow =
  | { kind: "login"; step: "username" }
  | { kind: "login"; step: "password"; username: string }
  | { kind: "publicar"; step: "select"; opciones: FiguritaResponseDTO[] }
  | { kind: "publicar"; step: "cantidad"; figuritaBaseId: string; numero: number; jugador: string };

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
```

- [ ] **Step 2: Crear `src/flows/types.ts`**

```ts
import type { PendingFlow } from "../session/flows";

export interface FlowResult {
  /** Mensajes a responder, en orden. */
  replies: string[];
  /** Si true, borrar el mensaje entrante del usuario (ej. la contraseña). */
  deleteIncoming?: boolean;
  /** Próximo estado del flujo (continúa). */
  next?: PendingFlow;
  /** Si true, terminar el flujo (limpiarlo). */
  clear?: boolean;
}
```

- [ ] **Step 3: Escribir el test que falla — `tests/flows/login.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { handleLogin } from "../../src/flows/login";
import { createSessionStore } from "../../src/session/store";
import { ApiError } from "../../src/errors";
import type { ApiClient } from "../../src/api/client";

const clientOk: ApiClient = {
  postText: vi.fn(async () => "jwt-xyz"),
  getJson: vi.fn(async () => ({ id: "42", username: "maxi" })),
  postJson: vi.fn(),
};

describe("handleLogin", () => {
  it("paso username: pide la contraseña y avanza el flujo", async () => {
    const sessions = createSessionStore();
    const res = await handleLogin(
      { kind: "login", step: "username" },
      "maxi",
      100,
      { client: clientOk, sessions },
    );
    expect(res.next).toEqual({ kind: "login", step: "password", username: "maxi" });
    expect(res.replies[0]).toMatch(/contraseña/i);
  });

  it("paso password: crea la sesión, borra el mensaje y termina", async () => {
    const sessions = createSessionStore();
    const res = await handleLogin(
      { kind: "login", step: "password", username: "maxi" },
      "secreta",
      100,
      { client: clientOk, sessions },
    );
    expect(res.clear).toBe(true);
    expect(res.deleteIncoming).toBe(true);
    expect(sessions.get(100)).toEqual({ token: "jwt-xyz", username: "maxi", userId: "42" });
    expect(res.replies[0]).toMatch(/sesión iniciada/i);
  });

  it("paso password con credenciales inválidas: mensaje de error y termina sin sesión", async () => {
    const sessions = createSessionStore();
    const clientErr: ApiClient = {
      postText: vi.fn(async () => {
        throw new ApiError(401, "Tu sesión expiró. Usá /login de nuevo.");
      }),
      getJson: vi.fn(),
      postJson: vi.fn(),
    };
    const res = await handleLogin(
      { kind: "login", step: "password", username: "maxi" },
      "mala",
      100,
      { client: clientErr, sessions },
    );
    expect(res.clear).toBe(true);
    expect(sessions.get(100)).toBeUndefined();
    expect(res.replies[0]).toMatch(/incorrectos/i);
  });
});
```

- [ ] **Step 4: Verificar que falla**

Run: `cd telegram-bot && npm test -- flows/login`
Expected: FAIL — módulo inexistente.

- [ ] **Step 5: Implementar `src/flows/login.ts`**

```ts
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
```

- [ ] **Step 6: Verificar que pasa**

Run: `cd telegram-bot && npm test -- flows/login`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add telegram-bot/src/session/flows.ts telegram-bot/src/flows telegram-bot/tests/flows
git commit -m "feat(telegram-bot): flujo de login paso a paso (FlowStore + handleLogin)"
```

---

### Task 5: Bootstrap del bot + comandos base + router de flujos

**Files:**
- Create: `telegram-bot/src/guard.ts`
- Create: `telegram-bot/src/index.ts`
- Test: `telegram-bot/tests/guard.test.ts`

**Interfaces:**
- Consumes: `SessionStore`, `Session`, `ApiError`, `FlowStore`, `handleLogin`, `loadConfig`, `createApiClient`.
- Produces: `guard(ctx, sessions, run): Promise<void>` (reutilizado por los comandos de 1 tiro de Fase 2). `index.ts` no exporta; es el entrypoint.

- [ ] **Step 1: Escribir el test que falla — `tests/guard.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { guard } from "../src/guard";
import { createSessionStore } from "../src/session/store";
import { ApiError } from "../src/errors";

function fakeCtx(chatId: number) {
  return { chat: { id: chatId }, reply: vi.fn(async () => {}) };
}

describe("guard", () => {
  it("sin sesión: pide /login y no ejecuta run", async () => {
    const sessions = createSessionStore();
    const ctx = fakeCtx(1);
    const run = vi.fn();
    await guard(ctx as never, sessions, run);
    expect(run).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringMatching(/login/i));
  });

  it("con sesión: ejecuta run y responde su texto", async () => {
    const sessions = createSessionStore();
    sessions.set(1, { token: "t", username: "u", userId: "9" });
    const ctx = fakeCtx(1);
    await guard(ctx as never, sessions, async () => "hola");
    expect(ctx.reply).toHaveBeenCalledWith("hola");
  });

  it("ApiError 401: limpia la sesión y responde el mensaje", async () => {
    const sessions = createSessionStore();
    sessions.set(1, { token: "t", username: "u", userId: "9" });
    const ctx = fakeCtx(1);
    await guard(ctx as never, sessions, async () => {
      throw new ApiError(401, "Tu sesión expiró. Usá /login de nuevo.");
    });
    expect(sessions.get(1)).toBeUndefined();
    expect(ctx.reply).toHaveBeenCalledWith("Tu sesión expiró. Usá /login de nuevo.");
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `cd telegram-bot && npm test -- guard`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar `src/guard.ts`**

```ts
import type { Context } from "grammy";
import { ApiError } from "./errors";
import type { SessionStore, Session } from "./session/store";

/** Ejecuta `run` solo si hay sesión; formatea errores de la API de forma amable. */
export async function guard(
  ctx: Context,
  sessions: SessionStore,
  run: (session: Session) => Promise<string>,
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) return;

  const session = sessions.get(chatId);
  if (!session) {
    await ctx.reply("Necesitás iniciar sesión. Usá /login.");
    return;
  }

  try {
    const texto = await run(session);
    await ctx.reply(texto);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) sessions.clear(chatId);
    await ctx.reply(e instanceof ApiError ? e.message : "Ocurrió un error inesperado.");
  }
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `cd telegram-bot && npm test -- guard`
Expected: PASS (3 tests).

- [ ] **Step 5: Implementar `src/index.ts`** (bootstrap + comandos base + router de flujos)

> Orden de registro importante: los `bot.command(...)` van **antes** del `bot.on("message:text", ...)`. Como los handlers de grammY no llaman a `next()`, un mensaje que empieza con `/` lo consume el comando y no llega al router de texto libre.

```ts
import { Bot } from "grammy";
import { loadConfig } from "./config";
import { createApiClient } from "./api/client";
import { createSessionStore } from "./session/store";
import { createFlowStore } from "./session/flows";
import { handleLogin } from "./flows/login";
import type { FlowResult } from "./flows/types";

const config = loadConfig();
const client = createApiClient(config.backendUrl);
const sessions = createSessionStore();
const flows = createFlowStore();

const bot = new Bot(config.botToken);

const BIENVENIDA = [
  "🎴 *Bot de figuritas TACS*",
  "",
  "Comandos:",
  "/login — iniciar sesión",
  "/logout — cerrar sesión",
  "/whoami — ver tu sesión actual",
].join("\n");

bot.command("start", (ctx) => ctx.reply(BIENVENIDA));

bot.command("login", (ctx) => {
  const chatId = ctx.chat!.id;
  flows.set(chatId, { kind: "login", step: "username" });
  return ctx.reply("👤 Ingresá tu usuario:");
});

bot.command("logout", (ctx) => {
  const chatId = ctx.chat!.id;
  sessions.clear(chatId);
  flows.clear(chatId);
  return ctx.reply("Sesión cerrada.");
});

bot.command("whoami", (ctx) => {
  const s = sessions.get(ctx.chat!.id);
  return ctx.reply(s ? `Usuario: ${s.username}\nuserId: ${s.userId}` : "No iniciaste sesión. Usá /login.");
});

// Router de texto libre: solo actúa si hay un flujo pendiente para el chat.
bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat!.id;
  const flow = flows.get(chatId);
  if (!flow) return;

  let result: FlowResult;
  if (flow.kind === "login") {
    result = await handleLogin(flow, ctx.message.text, chatId, { client, sessions });
  } else {
    return; // los flujos de publicar se cablean en Fase 2
  }

  if (result.deleteIncoming) await ctx.deleteMessage().catch(() => {});
  if (result.clear) flows.clear(chatId);
  else if (result.next) flows.set(chatId, result.next);
  for (const r of result.replies) await ctx.reply(r);
});

bot.catch((err) => {
  console.error("Error no manejado en el bot:", err.error);
});

bot.start({
  onStart: (info) => console.log(`🤖 Bot @${info.username} iniciado (long polling).`),
});
```

- [ ] **Step 6: Verificar que compila y que toda la suite pasa**

Run: `cd telegram-bot && npm run build && npm test`
Expected: `tsc` sin errores; todos los tests en verde.

- [ ] **Step 7: Commit**

```bash
git add telegram-bot/src/guard.ts telegram-bot/src/index.ts telegram-bot/tests/guard.test.ts
git commit -m "feat(telegram-bot): bootstrap grammY + comandos base (start/login/logout/whoami) + router de flujos"
```

---

### Task 6: Dockerización + integración docker-compose + docs (fin de Fase 1)

**Files:**
- Create: `telegram-bot/Dockerfile`
- Create: `telegram-bot/README.md`
- Modify: `docker-compose.yml` (agregar servicio `telegram-bot`)
- Modify: `.env.example` (agregar `TELEGRAM_BOT_TOKEN` y `BACKEND_URL`)

**Interfaces:**
- Consumes: la app construida en Tasks 1-5.
- Produces: imagen Docker del bot; servicio `telegram-bot` en compose que lee `TELEGRAM_BOT_TOKEN` del `.env` y `BACKEND_URL=http://backend:8080`.

- [ ] **Step 1: Crear `telegram-bot/Dockerfile`** (multi-stage)

```dockerfile
# ── build ─────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── runtime ───────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Agregar el servicio a `docker-compose.yml`**

Insertar dentro de `services:` (después del bloque `frontend`):
```yaml
  # ─────────────────────────────────────────────
  # TELEGRAM BOT — cliente REST del backend (grammY)
  # ─────────────────────────────────────────────
  telegram-bot:
    build:
      context: ./telegram-bot
      dockerfile: Dockerfile
    container_name: tacs-telegram-bot
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - BACKEND_URL=http://backend:8080
    networks:
      - tacs-net
    restart: unless-stopped
    depends_on:
      - backend
```

- [ ] **Step 3: Agregar placeholders a `.env.example`**

Añadir al final:
```
# ─────────────────────────────────────────────────────────────────────────────
# Bot de Telegram. Token obtenido de @BotFather. NUNCA commitear el valor real.
# ─────────────────────────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRstuVwxyz
# URL del backend vista desde el bot. En docker-compose es http://backend:8080.
BACKEND_URL=http://backend:8080
```

- [ ] **Step 4: Crear `telegram-bot/README.md`**

````markdown
# Bot de Telegram — TACS

Cliente REST del backend. No implementa lógica de negocio; consume la API existente.

## Variables de entorno
- `TELEGRAM_BOT_TOKEN` — token de @BotFather (obligatorio).
- `BACKEND_URL` — URL del backend (default `http://localhost:8080`; en docker `http://backend:8080`).

## Correr con Docker (recomendado)
Con `TELEGRAM_BOT_TOKEN` en el `.env` de la raíz del repo:
```bash
docker compose up --build telegram-bot
```

## Correr local (dev)
```bash
cd telegram-bot
cp ../.env.example .env   # y completar TELEGRAM_BOT_TOKEN y BACKEND_URL=http://localhost:8080
npm install
npm run dev
```

## Tests
```bash
npm test
```

## Comandos del bot
- `/start`, `/login`, `/logout`, `/whoami` (Fase 1)
- `/buscar`, `/miscoleccion`, `/faltantes`, `/repetidas`, `/notificaciones`, `/publicar` (Fase 2)
````

- [ ] **Step 5: Verificar el build de la imagen**

Run:
```bash
docker compose build telegram-bot
```
Expected: la imagen compila (incluye `npm run build` sin errores de tsc).

- [ ] **Step 6: Commit**

```bash
git add telegram-bot/Dockerfile telegram-bot/README.md docker-compose.yml .env.example
git commit -m "feat(telegram-bot): dockerización + servicio en compose + .env.example + README"
```

- [ ] **Step 7: 🔍 CHECKPOINT DE VALIDACIÓN (manual, con el usuario)**

1. El usuario pone el `TELEGRAM_BOT_TOKEN` real (rotado con `/revoke` en @BotFather) en el `.env` de la raíz.
2. `docker compose up --build backend telegram-bot` (con Mongo/Atlas configurado y un usuario existente, ej. seed demo).
3. En Telegram, al bot: `/start` → responde el mensaje de bienvenida.
4. `/login` → "Ingresá tu usuario" → (usuario) → "Ingresá tu contraseña" → (contraseña, se borra) → "✅ Sesión iniciada".
5. `/whoami` → muestra `username` y el `userId` resuelto contra el backend.

**No avanzar a Fase 2 hasta que este checkpoint pase.**

---

# FASE 2 — Servicios esenciales (lectura + publicar US1)

### Task 7: Formateadores de salida

**Files:**
- Create: `telegram-bot/src/format/figuritas.ts`
- Test: `telegram-bot/tests/format/figuritas.test.ts`

**Interfaces:**
- Consumes: `FiguritaResponseDTO`, `FiguritaBaseDTO`, `NotificacionDTO`, `PagedResponse` (Task 2).
- Produces:
  - `describirFigurita(f): string`, `describirBase(b): string`
  - `listaFiguritas(page, tituloVacio): string`
  - `listaBases(page, tituloVacio): string`
  - `listaNotificaciones(page): string`

- [ ] **Step 1: Escribir el test que falla — `tests/format/figuritas.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { describirFigurita, listaFiguritas, listaBases, listaNotificaciones } from "../../src/format/figuritas";
import type { PagedResponse, FiguritaResponseDTO, FiguritaBaseDTO, NotificacionDTO } from "../../src/api/types";

function page<T>(content: T[], last = true, total = content.length): PagedResponse<T> {
  return { content, page: 0, size: 10, totalElements: total, totalPages: 1, last };
}

const fig: FiguritaResponseDTO = {
  id: "1", numero: 7, figuritaBaseId: "b1", count: 3,
  jugadorNombre: "Messi", seleccionNombre: "Argentina",
  equipoNombre: null, categoriaNombre: null, ownerId: null, ownerName: null, imagenUrl: null,
};

describe("format/figuritas", () => {
  it("describirFigurita muestra número, jugador, grupo y cantidad", () => {
    expect(describirFigurita(fig)).toBe("#7 · Messi (Argentina) ×3");
  });

  it("listaFiguritas numera y agrega el total", () => {
    const out = listaFiguritas(page([fig]), "vacío");
    expect(out).toContain("1. #7 · Messi (Argentina) ×3");
    expect(out).toContain("Total: 1");
  });

  it("listaFiguritas usa el título si está vacío", () => {
    expect(listaFiguritas(page([]), "No hay nada")).toBe("No hay nada");
  });

  it("listaFiguritas avisa cuando hay más páginas", () => {
    const out = listaFiguritas(page([fig], false, 25), "vacío");
    expect(out).toMatch(/hay más/i);
    expect(out).toContain("25");
  });

  it("listaBases numera faltantes", () => {
    const base: FiguritaBaseDTO = {
      id: "b1", numero: 10, jugadorNombre: "Di María",
      seleccionNombre: "Argentina", equipoNombre: null, categoriaNombre: null, imagenUrl: null,
    };
    expect(listaBases(page([base]), "vacío")).toContain("1. #10 · Di María (Argentina)");
  });

  it("listaNotificaciones marca leídas/no leídas", () => {
    const n: NotificacionDTO = {
      id: "1", tipo: "OFERTA", titulo: "Nueva oferta", mensaje: "Te ofertaron",
      leida: false, fecha: null, enlace: null,
    };
    const out = listaNotificaciones(page([n]));
    expect(out).toContain("Nueva oferta");
    expect(out).toContain("Te ofertaron");
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `cd telegram-bot && npm test -- format`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar `src/format/figuritas.ts`**

```ts
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
```

- [ ] **Step 4: Verificar que pasa**

Run: `cd telegram-bot && npm test -- format`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/src/format telegram-bot/tests/format
git commit -m "feat(telegram-bot): formateadores de figuritas, faltantes y notificaciones"
```

---

### Task 8: API de figuritas (colección / faltantes / repetidas / catálogo)

**Files:**
- Create: `telegram-bot/src/api/figuritas.ts`
- Test: `telegram-bot/tests/api/figuritas.test.ts`

**Interfaces:**
- Consumes: `ApiClient`, `Session`, tipos.
- Produces:
  - `interface FiguritasApi { coleccion(s); faltantes(s); repetidas(s, size?); catalogo(s, search) }`
  - `createFiguritasApi(client: ApiClient): FiguritasApi`

- [ ] **Step 1: Escribir el test que falla — `tests/api/figuritas.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { createFiguritasApi } from "../../src/api/figuritas";
import type { ApiClient } from "../../src/api/client";

const session = { token: "T", username: "maxi", userId: "u1" };

function clientSpy(): ApiClient {
  return {
    getJson: vi.fn(async () => ({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true })),
    postJson: vi.fn(),
    postText: vi.fn(),
  };
}

describe("FiguritasApi", () => {
  it("coleccion pega a /api/usuarios/{username}/figuritas con el token", async () => {
    const client = clientSpy();
    await createFiguritasApi(client).coleccion(session);
    expect(client.getJson).toHaveBeenCalledWith("/api/usuarios/maxi/figuritas?page=0&size=10", "T");
  });

  it("faltantes pega al endpoint de faltantes", async () => {
    const client = clientSpy();
    await createFiguritasApi(client).faltantes(session);
    expect(client.getJson).toHaveBeenCalledWith("/api/usuarios/maxi/figuritas/faltantes?page=0&size=10", "T");
  });

  it("repetidas admite un size custom", async () => {
    const client = clientSpy();
    await createFiguritasApi(client).repetidas(session, 50);
    expect(client.getJson).toHaveBeenCalledWith("/api/usuarios/maxi/figuritas/repetidas?page=0&size=50", "T");
  });

  it("catalogo usa el userId como caller y pasa el search", async () => {
    const client = clientSpy();
    await createFiguritasApi(client).catalogo(session, "messi");
    expect(client.getJson).toHaveBeenCalledWith("/api/figuritas?usuarioId=u1&search=messi&page=0&size=10", "T");
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `cd telegram-bot && npm test -- api/figuritas`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar `src/api/figuritas.ts`**

```ts
import type { ApiClient } from "./client";
import type { PagedResponse, FiguritaResponseDTO, FiguritaBaseDTO } from "./types";
import type { Session } from "../session/store";

export interface FiguritasApi {
  coleccion(s: Session): Promise<PagedResponse<FiguritaResponseDTO>>;
  faltantes(s: Session): Promise<PagedResponse<FiguritaBaseDTO>>;
  repetidas(s: Session, size?: number): Promise<PagedResponse<FiguritaResponseDTO>>;
  catalogo(s: Session, search: string): Promise<PagedResponse<FiguritaResponseDTO>>;
}

export function createFiguritasApi(client: ApiClient): FiguritasApi {
  const enc = encodeURIComponent;
  return {
    coleccion: (s) => client.getJson(`/api/usuarios/${enc(s.username)}/figuritas?page=0&size=10`, s.token),
    faltantes: (s) => client.getJson(`/api/usuarios/${enc(s.username)}/figuritas/faltantes?page=0&size=10`, s.token),
    repetidas: (s, size = 10) =>
      client.getJson(`/api/usuarios/${enc(s.username)}/figuritas/repetidas?page=0&size=${size}`, s.token),
    catalogo: (s, search) =>
      client.getJson(`/api/figuritas?usuarioId=${enc(s.userId)}&search=${enc(search)}&page=0&size=10`, s.token),
  };
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `cd telegram-bot && npm test -- api/figuritas`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/src/api/figuritas.ts telegram-bot/tests/api/figuritas.test.ts
git commit -m "feat(telegram-bot): API de figuritas (coleccion/faltantes/repetidas/catalogo)"
```

---

### Task 9: Comandos de lectura + wiring (/buscar, /miscoleccion, /faltantes, /repetidas)

**Files:**
- Create: `telegram-bot/src/commands/coleccion.ts`
- Create: `telegram-bot/src/commands/buscar.ts`
- Modify: `telegram-bot/src/index.ts` (instanciar `figuritasApi` y registrar comandos)
- Test: `telegram-bot/tests/commands/coleccion.test.ts`
- Test: `telegram-bot/tests/commands/buscar.test.ts`

**Interfaces:**
- Consumes: `FiguritasApi`, `Session`, formateadores, `guard`.
- Produces:
  - `coleccionReply(api, s): Promise<string>`, `faltantesReply(api, s): Promise<string>`, `repetidasReply(api, s): Promise<string>`
  - `buscarReply(api, s, search): Promise<string>`

- [ ] **Step 1: Escribir tests que fallan**

`tests/commands/coleccion.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { coleccionReply, faltantesReply, repetidasReply } from "../../src/commands/coleccion";
import type { FiguritasApi } from "../../src/api/figuritas";

const session = { token: "T", username: "maxi", userId: "u1" };
const emptyPage = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true };

function api(over: Partial<FiguritasApi>): FiguritasApi {
  return { coleccion: vi.fn(), faltantes: vi.fn(), repetidas: vi.fn(), catalogo: vi.fn(), ...over };
}

describe("comandos de colección", () => {
  it("coleccionReply muestra el mensaje de vacío", async () => {
    const out = await coleccionReply(api({ coleccion: vi.fn(async () => emptyPage) }), session);
    expect(out).toMatch(/vacía/i);
  });

  it("faltantesReply felicita si no falta ninguna", async () => {
    const out = await faltantesReply(api({ faltantes: vi.fn(async () => emptyPage) }), session);
    expect(out).toMatch(/no te falta/i);
  });

  it("repetidasReply informa si no hay repetidas", async () => {
    const out = await repetidasReply(api({ repetidas: vi.fn(async () => emptyPage) }), session);
    expect(out).toMatch(/no tenés figuritas repetidas/i);
  });
});
```

`tests/commands/buscar.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { buscarReply } from "../../src/commands/buscar";
import type { FiguritasApi } from "../../src/api/figuritas";

const session = { token: "T", username: "maxi", userId: "u1" };
const emptyPage = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true };

function api(over: Partial<FiguritasApi>): FiguritasApi {
  return { coleccion: vi.fn(), faltantes: vi.fn(), repetidas: vi.fn(), catalogo: vi.fn(), ...over };
}

describe("buscarReply", () => {
  it("menciona el término buscado cuando no hay resultados", async () => {
    const out = await buscarReply(api({ catalogo: vi.fn(async () => emptyPage) }), session, "messi");
    expect(out).toContain("messi");
  });

  it("mensaje genérico cuando no hay búsqueda", async () => {
    const out = await buscarReply(api({ catalogo: vi.fn(async () => emptyPage) }), session, "");
    expect(out).toMatch(/no hay figuritas/i);
  });
});
```

- [ ] **Step 2: Verificar que fallan**

Run: `cd telegram-bot && npm test -- commands/coleccion commands/buscar`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Implementar `src/commands/coleccion.ts` y `src/commands/buscar.ts`**

`src/commands/coleccion.ts`:
```ts
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
```

`src/commands/buscar.ts`:
```ts
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
```

- [ ] **Step 4: Cablear en `src/index.ts`**

Agregar el import y la instancia (junto a los otros `create*`):
```ts
import { createFiguritasApi } from "./api/figuritas";
import { guard } from "./guard";
import { coleccionReply, faltantesReply, repetidasReply } from "./commands/coleccion";
import { buscarReply } from "./commands/buscar";

const figuritasApi = createFiguritasApi(client);
```

Registrar los comandos **antes** del `bot.on("message:text", ...)`:
```ts
bot.command("miscoleccion", (ctx) => guard(ctx, sessions, (s) => coleccionReply(figuritasApi, s)));
bot.command("faltantes", (ctx) => guard(ctx, sessions, (s) => faltantesReply(figuritasApi, s)));
bot.command("repetidas", (ctx) => guard(ctx, sessions, (s) => repetidasReply(figuritasApi, s)));
bot.command("buscar", (ctx) => guard(ctx, sessions, (s) => buscarReply(figuritasApi, s, ctx.match.trim())));
```

Actualizar `BIENVENIDA` para listar los nuevos comandos:
```ts
const BIENVENIDA = [
  "🎴 *Bot de figuritas TACS*",
  "",
  "Comandos:",
  "/login — iniciar sesión",
  "/logout — cerrar sesión",
  "/buscar <texto> — buscar figuritas disponibles",
  "/miscoleccion — ver tu colección",
  "/faltantes — figuritas que te faltan",
  "/repetidas — tus figuritas repetidas",
  "/whoami — ver tu sesión actual",
].join("\n");
```

- [ ] **Step 5: Verificar suite + build**

Run: `cd telegram-bot && npm run build && npm test`
Expected: `tsc` OK; todos los tests verdes.

- [ ] **Step 6: Commit**

```bash
git add telegram-bot/src/commands/coleccion.ts telegram-bot/src/commands/buscar.ts telegram-bot/src/index.ts telegram-bot/tests/commands
git commit -m "feat(telegram-bot): comandos de lectura (/buscar, /miscoleccion, /faltantes, /repetidas)"
```

---

### Task 10: Notificaciones (API + comando)

**Files:**
- Create: `telegram-bot/src/api/notificaciones.ts`
- Create: `telegram-bot/src/commands/notificaciones.ts`
- Modify: `telegram-bot/src/index.ts`
- Test: `telegram-bot/tests/api/notificaciones.test.ts`

**Interfaces:**
- Consumes: `ApiClient`, `Session`, `listaNotificaciones`.
- Produces:
  - `interface NotificacionesApi { porUsuario(s): Promise<PagedResponse<NotificacionDTO>> }`, `createNotificacionesApi(client)`
  - `notificacionesReply(api, s): Promise<string>`

- [ ] **Step 1: Escribir el test que falla — `tests/api/notificaciones.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { createNotificacionesApi } from "../../src/api/notificaciones";
import { notificacionesReply } from "../../src/commands/notificaciones";
import type { ApiClient } from "../../src/api/client";

const session = { token: "T", username: "maxi", userId: "u1" };
const emptyPage = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true };

describe("NotificacionesApi", () => {
  it("porUsuario pega a /api/notificaciones/usuario/{userId}", async () => {
    const client: ApiClient = { getJson: vi.fn(async () => emptyPage), postJson: vi.fn(), postText: vi.fn() };
    await createNotificacionesApi(client).porUsuario(session);
    expect(client.getJson).toHaveBeenCalledWith("/api/notificaciones/usuario/u1?page=0&size=10", "T");
  });

  it("notificacionesReply informa cuando no hay notificaciones", async () => {
    const api = { porUsuario: vi.fn(async () => emptyPage) };
    expect(await notificacionesReply(api, session)).toMatch(/no tenés notificaciones/i);
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `cd telegram-bot && npm test -- api/notificaciones`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 3: Implementar `src/api/notificaciones.ts` y `src/commands/notificaciones.ts`**

`src/api/notificaciones.ts`:
```ts
import type { ApiClient } from "./client";
import type { PagedResponse, NotificacionDTO } from "./types";
import type { Session } from "../session/store";

export interface NotificacionesApi {
  porUsuario(s: Session): Promise<PagedResponse<NotificacionDTO>>;
}

export function createNotificacionesApi(client: ApiClient): NotificacionesApi {
  return {
    porUsuario: (s) =>
      client.getJson(`/api/notificaciones/usuario/${encodeURIComponent(s.userId)}?page=0&size=10`, s.token),
  };
}
```

`src/commands/notificaciones.ts`:
```ts
import type { NotificacionesApi } from "../api/notificaciones";
import type { Session } from "../session/store";
import { listaNotificaciones } from "../format/figuritas";

export async function notificacionesReply(api: NotificacionesApi, s: Session): Promise<string> {
  return listaNotificaciones(await api.porUsuario(s));
}
```

- [ ] **Step 4: Cablear en `src/index.ts`**

```ts
import { createNotificacionesApi } from "./api/notificaciones";
import { notificacionesReply } from "./commands/notificaciones";

const notificacionesApi = createNotificacionesApi(client);
```
Registrar (antes del router de texto):
```ts
bot.command("notificaciones", (ctx) => guard(ctx, sessions, (s) => notificacionesReply(notificacionesApi, s)));
```
Y añadir `"/notificaciones — ver tus notificaciones",` a `BIENVENIDA`.

- [ ] **Step 5: Verificar suite + build**

Run: `cd telegram-bot && npm run build && npm test`
Expected: verde.

- [ ] **Step 6: Commit**

```bash
git add telegram-bot/src/api/notificaciones.ts telegram-bot/src/commands/notificaciones.ts telegram-bot/src/index.ts telegram-bot/tests/api/notificaciones.test.ts
git commit -m "feat(telegram-bot): comando /notificaciones"
```

---

### Task 11: Publicar figurita repetida — US1 (API + flujo + comando)

**Files:**
- Create: `telegram-bot/src/api/publicaciones.ts`
- Create: `telegram-bot/src/commands/publicar.ts`
- Create: `telegram-bot/src/flows/publicar.ts`
- Modify: `telegram-bot/src/index.ts` (instancia, comando `/publicar`, rama `publicar` del router)
- Test: `telegram-bot/tests/flows/publicar.test.ts`
- Test: `telegram-bot/tests/commands/publicar.test.ts`

**Interfaces:**
- Consumes: `ApiClient`, `FiguritasApi`, `Session`, `SessionStore`, `PendingFlow`, `FlowResult`, `describirFigurita`, `ApiError`.
- Produces:
  - `interface PublicacionesApi { publicar(s, figuritaBaseId, cantidad): Promise<FiguritaPublicadaResponseDTO> }`, `createPublicacionesApi(client)`
  - `iniciarPublicar(api: FiguritasApi, s: Session): Promise<{ reply: string; flow?: PendingFlow }>`
  - `handlePublicar(flow, text, chatId, deps: { publicaciones, sessions }): Promise<FlowResult>`

- [ ] **Step 1: Escribir el test que falla — `tests/commands/publicar.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { iniciarPublicar } from "../../src/commands/publicar";
import type { FiguritasApi } from "../../src/api/figuritas";
import type { FiguritaResponseDTO } from "../../src/api/types";

const session = { token: "T", username: "maxi", userId: "u1" };
const fig: FiguritaResponseDTO = {
  id: "f1", numero: 7, figuritaBaseId: "b7", count: 3,
  jugadorNombre: "Messi", seleccionNombre: "Argentina",
  equipoNombre: null, categoriaNombre: null, ownerId: null, ownerName: null, imagenUrl: null,
};

function api(page: { content: FiguritaResponseDTO[]; last: boolean; totalElements: number }): FiguritasApi {
  return {
    coleccion: vi.fn(), faltantes: vi.fn(), catalogo: vi.fn(),
    repetidas: vi.fn(async () => ({ ...page, page: 0, size: 50, totalPages: 1 })),
  };
}

describe("iniciarPublicar", () => {
  it("sin repetidas: mensaje y sin flujo", async () => {
    const res = await iniciarPublicar(api({ content: [], last: true, totalElements: 0 }), session);
    expect(res.flow).toBeUndefined();
    expect(res.reply).toMatch(/no tenés figuritas repetidas/i);
  });

  it("con repetidas: lista numerada y arranca el flujo en 'select'", async () => {
    const res = await iniciarPublicar(api({ content: [fig], last: true, totalElements: 1 }), session);
    expect(res.reply).toContain("1. #7 · Messi (Argentina) ×3");
    expect(res.flow).toEqual({ kind: "publicar", step: "select", opciones: [fig] });
  });
});
```

- [ ] **Step 2: Escribir el test que falla — `tests/flows/publicar.test.ts`**

```ts
import { describe, it, expect, vi } from "vitest";
import { handlePublicar } from "../../src/flows/publicar";
import { createSessionStore } from "../../src/session/store";
import { ApiError } from "../../src/errors";
import type { PublicacionesApi } from "../../src/api/publicaciones";
import type { FiguritaResponseDTO } from "../../src/api/types";

const fig: FiguritaResponseDTO = {
  id: "f1", numero: 7, figuritaBaseId: "b7", count: 3,
  jugadorNombre: "Messi", seleccionNombre: "Argentina",
  equipoNombre: null, categoriaNombre: null, ownerId: null, ownerName: null, imagenUrl: null,
};

function deps(publicar: PublicacionesApi["publicar"]) {
  const sessions = createSessionStore();
  sessions.set(1, { token: "T", username: "maxi", userId: "u1" });
  return { sessions, publicaciones: { publicar } as PublicacionesApi };
}

describe("handlePublicar", () => {
  it("select inválido: re-pide sin cambiar el flujo", async () => {
    const d = deps(vi.fn());
    const flow = { kind: "publicar", step: "select", opciones: [fig] } as const;
    const res = await handlePublicar(flow, "9", 1, d);
    expect(res.next).toEqual(flow);
    expect(res.replies[0]).toMatch(/entre 1 y 1/);
  });

  it("select válido: pasa a pedir cantidad", async () => {
    const d = deps(vi.fn());
    const res = await handlePublicar({ kind: "publicar", step: "select", opciones: [fig] }, "1", 1, d);
    expect(res.next).toEqual({ kind: "publicar", step: "cantidad", figuritaBaseId: "b7", numero: 7, jugador: "Messi" });
  });

  it("cantidad inválida: re-pide", async () => {
    const d = deps(vi.fn());
    const flow = { kind: "publicar", step: "cantidad", figuritaBaseId: "b7", numero: 7, jugador: "Messi" } as const;
    const res = await handlePublicar(flow, "0", 1, d);
    expect(res.next).toEqual(flow);
    expect(res.replies[0]).toMatch(/mayor a 0/i);
  });

  it("cantidad válida: publica y termina", async () => {
    const publicar = vi.fn(async () => ({}) as never);
    const d = deps(publicar);
    const res = await handlePublicar(
      { kind: "publicar", step: "cantidad", figuritaBaseId: "b7", numero: 7, jugador: "Messi" },
      "2", 1, d,
    );
    expect(publicar).toHaveBeenCalledWith({ token: "T", username: "maxi", userId: "u1" }, "b7", 2);
    expect(res.clear).toBe(true);
    expect(res.replies[0]).toMatch(/publicaste/i);
  });

  it("error 400 del backend: muestra el motivo y termina", async () => {
    const publicar = vi.fn(async () => {
      throw new ApiError(400, "Cantidad supera las repetidas disponibles.");
    });
    const d = deps(publicar);
    const res = await handlePublicar(
      { kind: "publicar", step: "cantidad", figuritaBaseId: "b7", numero: 7, jugador: "Messi" },
      "99", 1, d,
    );
    expect(res.clear).toBe(true);
    expect(res.replies[0]).toContain("Cantidad supera");
  });
});
```

- [ ] **Step 3: Verificar que fallan**

Run: `cd telegram-bot && npm test -- publicar`
Expected: FAIL — módulos inexistentes.

- [ ] **Step 4: Implementar `src/api/publicaciones.ts`**

```ts
import type { ApiClient } from "./client";
import type { FiguritaPublicadaResponseDTO } from "./types";
import type { Session } from "../session/store";

export interface PublicacionesApi {
  publicar(s: Session, figuritaBaseId: string, cantidad: number): Promise<FiguritaPublicadaResponseDTO>;
}

export function createPublicacionesApi(client: ApiClient): PublicacionesApi {
  return {
    publicar: (s, figuritaBaseId, cantidad) =>
      client.postJson(
        "/api/publicaciones",
        { usuarioId: s.userId, figuritaBaseId, cantidad },
        s.token,
      ),
  };
}
```

- [ ] **Step 5: Implementar `src/commands/publicar.ts`**

```ts
import type { FiguritasApi } from "../api/figuritas";
import type { Session } from "../session/store";
import type { PendingFlow } from "../session/flows";
import { describirFigurita } from "../format/figuritas";

const MAX_OPCIONES = 50;

export async function iniciarPublicar(
  api: FiguritasApi,
  s: Session,
): Promise<{ reply: string; flow?: PendingFlow }> {
  const page = await api.repetidas(s, MAX_OPCIONES);
  if (page.content.length === 0) {
    return { reply: "No tenés figuritas repetidas para publicar." };
  }
  const lista = page.content.map((f, i) => `${i + 1}. ${describirFigurita(f)}`).join("\n");
  return {
    reply: `Tus figuritas repetidas:\n${lista}\n\n¿Cuál querés publicar? Respondé con el número.`,
    flow: { kind: "publicar", step: "select", opciones: page.content },
  };
}
```

- [ ] **Step 6: Implementar `src/flows/publicar.ts`**

```ts
import { ApiError } from "../errors";
import type { PublicacionesApi } from "../api/publicaciones";
import type { SessionStore } from "../session/store";
import type { PendingFlow } from "../session/flows";
import type { FlowResult } from "./types";

type PublicarFlow = Extract<PendingFlow, { kind: "publicar" }>;

export async function handlePublicar(
  flow: PublicarFlow,
  text: string,
  chatId: number,
  deps: { publicaciones: PublicacionesApi; sessions: SessionStore },
): Promise<FlowResult> {
  if (flow.step === "select") {
    const idx = Number.parseInt(text.trim(), 10);
    if (!Number.isInteger(idx) || idx < 1 || idx > flow.opciones.length) {
      return { replies: [`Elegí un número entre 1 y ${flow.opciones.length}.`], next: flow };
    }
    const elegida = flow.opciones[idx - 1];
    return {
      replies: [`¿Cuántas copias de #${elegida.numero} (${elegida.jugadorNombre ?? "?"}) querés publicar?`],
      next: {
        kind: "publicar",
        step: "cantidad",
        figuritaBaseId: elegida.figuritaBaseId,
        numero: elegida.numero,
        jugador: elegida.jugadorNombre ?? "?",
      },
    };
  }

  // step === "cantidad"
  const cantidad = Number.parseInt(text.trim(), 10);
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    return { replies: ["Ingresá un número entero mayor a 0."], next: flow };
  }

  const session = deps.sessions.get(chatId);
  if (!session) {
    return { replies: ["Tu sesión expiró. Usá /login."], clear: true };
  }

  try {
    await deps.publicaciones.publicar(session, flow.figuritaBaseId, cantidad);
    return {
      replies: [`✅ Publicaste la figurita #${flow.numero} (${flow.jugador}) ×${cantidad}.`],
      clear: true,
    };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) deps.sessions.clear(chatId);
    return {
      replies: [e instanceof ApiError ? `❌ ${e.message}` : "❌ No se pudo publicar. Probá de nuevo."],
      clear: true,
    };
  }
}
```

- [ ] **Step 7: Cablear en `src/index.ts`**

Imports + instancia:
```ts
import { createPublicacionesApi } from "./api/publicaciones";
import { iniciarPublicar } from "./commands/publicar";
import { handlePublicar } from "./flows/publicar";
import { ApiError } from "./errors";

const publicacionesApi = createPublicacionesApi(client);
```

Comando `/publicar` (antes del router de texto):
```ts
bot.command("publicar", async (ctx) => {
  const chatId = ctx.chat!.id;
  const session = sessions.get(chatId);
  if (!session) {
    await ctx.reply("Necesitás iniciar sesión. Usá /login.");
    return;
  }
  try {
    const { reply, flow } = await iniciarPublicar(figuritasApi, session);
    if (flow) flows.set(chatId, flow);
    await ctx.reply(reply);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) sessions.clear(chatId);
    await ctx.reply(e instanceof ApiError ? e.message : "Ocurrió un error inesperado.");
  }
});
```

Completar la rama `publicar` del router de texto (reemplaza el `return;` placeholder de la Task 5):
```ts
bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat!.id;
  const flow = flows.get(chatId);
  if (!flow) return;

  let result: FlowResult;
  if (flow.kind === "login") {
    result = await handleLogin(flow, ctx.message.text, chatId, { client, sessions });
  } else {
    result = await handlePublicar(flow, ctx.message.text, chatId, { publicaciones: publicacionesApi, sessions });
  }

  if (result.deleteIncoming) await ctx.deleteMessage().catch(() => {});
  if (result.clear) flows.clear(chatId);
  else if (result.next) flows.set(chatId, result.next);
  for (const r of result.replies) await ctx.reply(r);
});
```

Añadir `"/publicar — publicar una figurita repetida",` a `BIENVENIDA`.

- [ ] **Step 8: Verificar suite + build**

Run: `cd telegram-bot && npm run build && npm test`
Expected: `tsc` OK; toda la suite en verde.

- [ ] **Step 9: Commit**

```bash
git add telegram-bot/src/api/publicaciones.ts telegram-bot/src/commands/publicar.ts telegram-bot/src/flows/publicar.ts telegram-bot/src/index.ts telegram-bot/tests
git commit -m "feat(telegram-bot): publicar figurita repetida (US1) — API + flujo paso a paso + comando"
```

- [ ] **Step 10: 🔍 Validación funcional de Fase 2 (manual)**

Con el bot corriendo y sesión iniciada: `/repetidas` lista repetidas; `/publicar` → elegir número → cantidad → confirma publicación; verificar que aparece como disponible para otro usuario vía `/buscar` (o en el frontend). `/miscoleccion`, `/faltantes`, `/notificaciones` responden coherente.

---

## Self-Review

**1. Spec coverage** (contra `docs/superpowers/specs/2026-06-30-telegram-bot-design.md`):
- §2 decisiones (Node/TS, grammY, polling, sesión en memoria, Vitest) → Tasks 1-6. ✔ (refinamiento documentado: flujos con FlowStore manual en vez del plugin conversations — misma UX, más testeable).
- §3 arquitectura + estructura de módulos → estructura de archivos + Tasks 1-11. ✔
- §4 sesión + secretos → Task 3 (store), Task 6 (`.env.example`, compose). ✔
- §5 flujos (login, comando autenticado, publicar) → Task 4 (login), Task 9 (autenticado vía guard), Task 11 (publicar). ✔
- §6 mapa de comandos → Tasks 5, 9, 10, 11. Todos los comandos del v1 (start/login/logout/whoami/buscar/miscoleccion/faltantes/repetidas/notificaciones/publicar). ✔
- §7 manejo de errores → `mensajePorStatus` (Task 2), `guard` (Task 5), `bot.catch` (Task 5), 401 limpia sesión (Tasks 5, 11). ✔
- §8 testing (client, auth, format, handlers, sin-sesión) → Tasks 2,3,4,5,7,8,9,10,11. ✔
- §9 docker-compose + env → Task 6. ✔
- §10 fases con checkpoint → Fase 1 termina en Task 6 Step 7 (checkpoint); Fase 2 Tasks 7-11. ✔
- §11 YAGNI (intercambios/subastas/push/webhook/persistencia fuera) → no hay tareas para eso. ✔

**2. Placeholder scan:** el único `return;` "placeholder" (rama publicar del router en Task 5) se reemplaza explícitamente en Task 11 Step 7. Sin TODOs/TBD. El token de `.env.example` es un placeholder ficticio intencional. ✔

**3. Type consistency:**
- `Session { token, username, userId }` — consistente en store, auth, figuritas, publicaciones, guard, flows. ✔
- `PendingFlow` con variantes login/publicar definidas una vez en `session/flows.ts` (Task 4) y consumidas en flows/login (Task 4) y flows/publicar (Task 11). ✔
- `FlowResult` definido en `flows/types.ts` (Task 4), usado por handleLogin y handlePublicar. ✔
- `ApiClient` con `getJson/postJson/postText` — firma idéntica en client, auth, figuritas, publicaciones, notificaciones. ✔
- `FiguritasApi.repetidas(s, size?)` — el default 10 se usa en `/repetidas`; `iniciarPublicar` llama `repetidas(s, 50)`. ✔
- `createPublicacionesApi.publicar(s, figuritaBaseId, cantidad)` → body `{ usuarioId: s.userId, figuritaBaseId, cantidad }` coincide con `FiguritaPublicadaRequestDTO`. ✔

Sin gaps detectados.
