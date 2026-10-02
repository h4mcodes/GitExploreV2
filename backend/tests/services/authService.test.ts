import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  revokeToken,
  isTokenRevoked,
  clearRevokedTokens,
  toSafeUser,
} from '../../src/services/authService.js';
import { BadRequestError, UnauthorizedError } from '../../src/types/api.js';
import type { User } from '@prisma/client';

describe('AuthService — Cryptography and Tokens', () => {
  beforeEach(() => {
    clearRevokedTokens();
  });

  describe('Password Hashing & Verification', () => {
    it('hashes a valid password and verifies successfully', () => {
      const password = 'SuperSecretPassword123!';
      const hash = hashPassword(password);

      expect(hash).toContain(':');
      expect(verifyPassword(password, hash)).toBe(true);
    });

    it('rejects verification with wrong password', () => {
      const password = 'CorrectPassword123!';
      const hash = hashPassword(password);

      expect(verifyPassword('WrongPassword123!', hash)).toBe(false);
    });

    it('produces unique hashes for identical passwords due to random salting', () => {
      const password = 'IdenticalPassword123!';
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      expect(hash1).not.toBe(hash2);
      expect(verifyPassword(password, hash1)).toBe(true);
      expect(verifyPassword(password, hash2)).toBe(true);
    });

    it('throws BadRequestError when hashing passwords under 8 characters', () => {
      expect(() => hashPassword('short')).toThrow(BadRequestError);
    });

    it('returns false when verifying empty or malformed hash strings', () => {
      expect(verifyPassword('password123', '')).toBe(false);
      expect(verifyPassword('password123', 'invalidhashwithoutcolon')).toBe(false);
    });
  });

  describe('JWT Token Generation & Verification', () => {
    it('generates a valid signed JWT and parses payload correctly', () => {
      const payload = {
        userId: 'uuid-1234',
        username: 'alice',
        email: 'alice@example.com',
      };

      const token = generateToken(payload, 3600);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const decoded = verifyToken(token);
      expect(decoded.userId).toBe('uuid-1234');
      expect(decoded.username).toBe('alice');
      expect(decoded.email).toBe('alice@example.com');
      expect(decoded.exp).toBeDefined();
    });

    it('throws UnauthorizedError when verifying expired token', () => {
      const payload = {
        userId: 'uuid-1234',
        username: 'alice',
        email: 'alice@example.com',
      };

      // Generate already-expired token (-10 seconds)
      const token = generateToken(payload, -10);

      expect(() => verifyToken(token)).toThrow(UnauthorizedError);
      expect(() => verifyToken(token)).toThrow(/expired/i);
    });

    it('throws UnauthorizedError when token is tampered or malformed', () => {
      const payload = {
        userId: 'uuid-1234',
        username: 'alice',
        email: 'alice@example.com',
      };
      const token = generateToken(payload);
      const parts = token.split('.');
      const tampered = `${parts[0]}.${parts[1]}.tamperedsignature123`;

      expect(() => verifyToken(tampered)).toThrow(UnauthorizedError);
      expect(() => verifyToken('not.a.valid.jwt.string')).toThrow(UnauthorizedError);
      expect(() => verifyToken('')).toThrow(UnauthorizedError);
    });

    it('handles token revocation on logout', () => {
      const token = generateToken({
        userId: 'uuid-5678',
        username: 'bob',
        email: null,
      });

      expect(isTokenRevoked(token)).toBe(false);
      expect(verifyToken(token).username).toBe('bob');

      revokeToken(token);
      expect(isTokenRevoked(token)).toBe(true);
      expect(() => verifyToken(token)).toThrow(UnauthorizedError);
      expect(() => verifyToken(token)).toThrow(/revoked/i);
    });
  });

  describe('toSafeUser', () => {
    it('strips passwordHash and returns safe user entity', () => {
      const mockPrismaUser: User = {
        id: 'u-1',
        username: 'charlie',
        email: 'charlie@example.com',
        avatarUrl: 'https://avatar.url',
        githubId: null,
        passwordHash: 'salt123:hash456',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const safe = toSafeUser(mockPrismaUser);
      expect(safe.username).toBe('charlie');
      expect(safe.id).toBe('u-1');
      expect((safe as Record<string, unknown>)['passwordHash']).toBeUndefined();
    });
  });
});
