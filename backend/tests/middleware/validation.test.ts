import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { validateRequest } from '../../src/middleware/validation.js';
import { ValidationError } from '../../src/types/api.js';

describe('Validation Middleware', () => {
  function createMockReq(
    body: Record<string, unknown> = {},
    query: Record<string, unknown> = {},
    params: Record<string, unknown> = {}
  ): Request {
    return {
      body,
      query,
      params,
    } as unknown as Request;
  }

  function createMockRes(): Response {
    return {} as unknown as Response;
  }

  it('passes when valid inputs satisfy schema rules', () => {
    const validator = validateRequest({
      body: {
        username: { required: true, type: 'string', minLength: 3 },
        age: { type: 'number', min: 18 },
      },
    });

    const req = createMockReq({ username: 'developer', age: 25 });
    const res = createMockRes();
    const next = vi.fn();

    validator(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects when required field is missing', () => {
    const validator = validateRequest({
      body: {
        email: { required: true, type: 'string' },
      },
    });

    const req = createMockReq({});
    const res = createMockRes();
    const next = vi.fn();

    validator(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.statusCode).toBe(400);
    expect(err.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email', location: 'body' }),
      ])
    );
  });

  it('validates string length constraints (minLength, maxLength)', () => {
    const validator = validateRequest({
      body: {
        tag: { type: 'string', minLength: 2, maxLength: 5 },
      },
    });

    // Too short
    const next1 = vi.fn();
    validator(createMockReq({ tag: 'a' }), createMockRes(), next1);
    expect(next1.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);

    // Too long
    const next2 = vi.fn();
    validator(createMockReq({ tag: 'abcdef' }), createMockRes(), next2);
    expect(next2.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);

    // Valid
    const next3 = vi.fn();
    validator(createMockReq({ tag: 'valid' }), createMockRes(), next3);
    expect(next3).toHaveBeenCalledWith();
  });

  it('validates numeric constraints (min, max)', () => {
    const validator = validateRequest({
      query: {
        page: { type: 'number', min: 1, max: 100 },
      },
    });

    // Below min
    const next1 = vi.fn();
    validator(createMockReq({}, { page: 0 }), createMockRes(), next1);
    expect(next1.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);

    // Above max
    const next2 = vi.fn();
    validator(createMockReq({}, { page: 101 }), createMockRes(), next2);
    expect(next2.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);

    // Valid
    const next3 = vi.fn();
    validator(createMockReq({}, { page: 5 }), createMockRes(), next3);
    expect(next3).toHaveBeenCalledWith();
  });

  it('validates regex patterns', () => {
    const validator = validateRequest({
      params: {
        sha: { type: 'string', pattern: /^[0-9a-f]{7,40}$/i },
      },
    });

    // Invalid SHA
    const next1 = vi.fn();
    validator(createMockReq({}, {}, { sha: 'not-a-sha-xyz!' }), createMockRes(), next1);
    expect(next1.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);

    // Valid SHA
    const next2 = vi.fn();
    validator(createMockReq({}, {}, { sha: 'a1b2c3d' }), createMockRes(), next2);
    expect(next2).toHaveBeenCalledWith();
  });

  it('supports custom validation functions returning true, false, or error message', () => {
    const validator = validateRequest({
      body: {
        role: {
          custom: (val) =>
            val === 'admin' || val === 'editor' ? true : "Role must be 'admin' or 'editor'",
        },
      },
    });

    // Custom rejected
    const next1 = vi.fn();
    validator(createMockReq({ role: 'guest' }), createMockRes(), next1);
    const err = next1.mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.details[0].message).toContain("Role must be 'admin' or 'editor'");

    // Custom passed
    const next2 = vi.fn();
    validator(createMockReq({ role: 'admin' }), createMockRes(), next2);
    expect(next2).toHaveBeenCalledWith();
  });

  it('validates array and object field types', () => {
    const validator = validateRequest({
      body: {
        tags: { type: 'array' },
        metadata: { type: 'object' },
      },
    });

    // Not an array
    const next1 = vi.fn();
    validator(createMockReq({ tags: 'string-instead-of-array' }), createMockRes(), next1);
    expect(next1.mock.calls[0]?.[0]).toBeInstanceOf(ValidationError);

    // Valid array & object
    const next2 = vi.fn();
    validator(createMockReq({ tags: ['git', 'ai'], metadata: { env: 'prod' } }), createMockRes(), next2);
    expect(next2).toHaveBeenCalledWith();
  });
});
