interface JwtPayload {
  sub: string;
  roles?: string[];
  exp?: number;
}

function readPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as JwtPayload;
    if (typeof payload?.sub !== 'string') return null;
    return payload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): { sub: string; roles: string[] } | null {
  const payload = readPayload(token);
  if (!payload) return null;
  return { sub: payload.sub, roles: payload.roles ?? [] };
}

/** true sólo si el token trae `exp` y ya venció. Token inválido o sin exp ⇒ false (no bloquea). */
export function isTokenExpired(token: string): boolean {
  const payload = readPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now();
}
