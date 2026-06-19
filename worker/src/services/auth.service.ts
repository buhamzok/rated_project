import { SignJWT, jwtVerify } from 'jose';

export interface JWTPayload {
  user_id: number;
  email: string;
  full_name: string;
}

const ALG = 'HS256';

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100_000;
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hash = btoa(String.fromCharCode(...new Uint8Array(derived)));
  const saltB64 = btoa(String.fromCharCode(...salt));
  return `pbkdf2:${iterations}:${saltB64}:${hash}`;
}

export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  const [prefix, iterationsStr, saltB64, hashB64] = storedHash.split(':');
  if (prefix !== 'pbkdf2') return false;
  const iterations = parseInt(iterationsStr, 10);
  if (!iterations || !saltB64 || !hashB64) return false;

  const salt = Uint8Array.from(atob(saltB64).split('').map(c => c.charCodeAt(0)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const computed = btoa(String.fromCharCode(...new Uint8Array(derived)));
  return computed === hashB64;
}

export async function signToken(payload: JWTPayload, secret: string, expiresIn: string): Promise<string> {
  const encoder = new TextEncoder();
  const expires = expiresIn ? parseDuration(expiresIn) : undefined;
  let jwt = new SignJWT({
    user_id: payload.user_id,
    email: payload.email,
    full_name: payload.full_name,
  });
  jwt = jwt.setProtectedHeader({ alg: ALG });
  if (expires) jwt = jwt.setExpirationTime(Math.floor(Date.now() / 1000) + expires);
  return jwt.sign(encoder.encode(secret));
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload> {
  const encoder = new TextEncoder();
  const { payload } = await jwtVerify(token, encoder.encode(secret));
  return {
    user_id: Number(payload.user_id),
    email: String(payload.email),
    full_name: String(payload.full_name),
  };
}

function parseDuration(input: string): number {
  const match = input.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!match) return 7 * 24 * 60 * 60;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * multipliers[unit];
}
