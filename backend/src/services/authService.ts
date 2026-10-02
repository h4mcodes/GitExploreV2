import crypto from 'crypto';
import { User } from '@prisma/client';
import { env } from '../config/env.js';
import {
  findUserByUsername,
  findUserById,
  createUser,
} from '../repositories/userRepository.js';
import {
  UnauthorizedError,
  ConflictError,
  BadRequestError,
} from '../types/api.js';

export interface AuthTokenPayload {
  readonly userId: string;
  readonly username: string;
  readonly email: string | null;
  readonly iat?: number;
  readonly exp?: number;
}

export interface SafeUser {
  readonly id: string;
  readonly username: string;
  readonly email: string | null;
  readonly avatarUrl: string | null;
  readonly githubId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface RegisterInput {
  readonly username: string;
  readonly password: string;
  readonly email?: string | null;
  readonly avatarUrl?: string | null;
}

export interface LoginInput {
  readonly username: string;
  readonly password: string;
}

export interface AuthResult {
  readonly user: SafeUser;
  readonly token: string;
}

// In-memory token revocation blacklist (stores revoked token signatures until expiration)
const revokedTokens = new Set<string>();

/**
 * Clears the revoked tokens set (primarily for test cleanup).
 */
export function clearRevokedTokens(): void {
  revokedTokens.clear();
}

/**
 * Checks if a token is marked as revoked.
 */
export function isTokenRevoked(token: string): boolean {
  return revokedTokens.has(token);
}

/**
 * Marks a token as revoked.
 */
export function revokeToken(token: string): void {
  if (token) {
    revokedTokens.add(token.trim());
  }
}

/**
 * Strips passwordHash and returns a safe User representation.
 */
export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    githubId: user.githubId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Hashes a plaintext password using crypto.scrypt with a random 16-byte salt.
 * Returns formatted string: `<salt_hex>:<derived_key_hex>`
 */
export function hashPassword(password: string): string {
  if (!password || password.length < 8) {
    throw new BadRequestError('Password must be at least 8 characters long', 'AUTH_WEAK_PASSWORD');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

/**
 * Securely verifies a plaintext password against a stored `<salt>:<hash>` string using timing-safe comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const salt = parts[0];
  const originalHash = parts[1];
  if (!salt || !originalHash) return false;

  try {
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    const keyBuf = Buffer.from(derivedKey, 'hex');
    const origBuf = Buffer.from(originalHash, 'hex');

    if (keyBuf.length !== origBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(keyBuf, origBuf);
  } catch {
    return false;
  }
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Generates an HMAC-SHA256 signed JWT token.
 * Defaults to 7 days expiration.
 */
export function generateToken(
  payload: Omit<AuthTokenPayload, 'iat' | 'exp'>,
  expiresInSeconds: number = 7 * 24 * 60 * 60
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AuthTokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', env.jwtSecret)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * Verifies and decodes an HMAC-SHA256 signed JWT token.
 * Validates format, signature, revocation, and expiration.
 */
export function verifyToken(token: string): AuthTokenPayload {
  if (!token || typeof token !== 'string') {
    throw new UnauthorizedError('Missing or empty authentication token', 'AUTH_TOKEN_MISSING');
  }

  const cleanToken = token.trim();
  if (isTokenRevoked(cleanToken)) {
    throw new UnauthorizedError('Authentication token has been revoked', 'AUTH_TOKEN_REVOKED');
  }

  const parts = cleanToken.split('.');
  if (parts.length !== 3) {
    throw new UnauthorizedError('Malformed authentication token', 'AUTH_TOKEN_MALFORMED');
  }

  const headerB64 = parts[0];
  const payloadB64 = parts[1];
  const signatureB64 = parts[2];
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new UnauthorizedError('Malformed authentication token components', 'AUTH_TOKEN_MALFORMED');
  }

  // Verify HMAC-SHA256 signature
  const expectedSig = crypto
    .createHmac('sha256', env.jwtSecret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuf = Buffer.from(signatureB64);
  const expectedBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new UnauthorizedError('Invalid authentication token signature', 'AUTH_TOKEN_INVALID');
  }

  // Decode payload
  let payload: AuthTokenPayload;
  try {
    const decodedJson = base64UrlDecode(payloadB64);
    payload = JSON.parse(decodedJson);
  } catch {
    throw new UnauthorizedError('Failed to parse token payload JSON', 'AUTH_TOKEN_MALFORMED');
  }

  // Verify expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new UnauthorizedError('Authentication token has expired', 'AUTH_TOKEN_EXPIRED');
  }

  return payload;
}

/**
 * Registers a new user account with hashed password and generates a session JWT.
 */
export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const cleanUsername = input.username.trim();

  // Check if username already exists
  const existingUser = await findUserByUsername(cleanUsername);
  if (existingUser) {
    throw new ConflictError(
      `Username '${cleanUsername}' is already registered. Please choose another username or log in.`,
      'AUTH_USERNAME_TAKEN'
    );
  }

  const passwordHash = hashPassword(input.password);
  const user = await createUser({
    username: cleanUsername,
    passwordHash,
    email: input.email?.trim() || null,
    avatarUrl: input.avatarUrl?.trim() || null,
  });

  const token = generateToken({
    userId: user.id,
    username: user.username,
    email: user.email,
  });

  return {
    user: toSafeUser(user),
    token,
  };
}

/**
 * Authenticates user credentials and generates a session JWT.
 */
export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const cleanUsername = input.username.trim();
  const user = await findUserByUsername(cleanUsername);

  if (!user) {
    throw new UnauthorizedError('Invalid username or password', 'AUTH_INVALID_CREDENTIALS');
  }

  if (!user.passwordHash) {
    throw new UnauthorizedError(
      'This account was created via GitHub OAuth. Please sign in with GitHub.',
      'AUTH_OAUTH_ONLY'
    );
  }

  const isValid = verifyPassword(input.password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid username or password', 'AUTH_INVALID_CREDENTIALS');
  }

  const token = generateToken({
    userId: user.id,
    username: user.username,
    email: user.email,
  });

  return {
    user: toSafeUser(user),
    token,
  };
}

/**
 * Logs out the user by revoking the provided token.
 */
export function logoutUser(token: string): void {
  revokeToken(token);
}

/**
 * Retrieves the current authenticated user by their user ID.
 */
export async function getCurrentUser(userId: string): Promise<SafeUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new UnauthorizedError('Authenticated user not found in database', 'AUTH_USER_NOT_FOUND');
  }
  return toSafeUser(user);
}
