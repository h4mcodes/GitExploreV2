import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ValidationError } from '../types/api.js';

export type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface FieldRule {
  readonly required?: boolean;
  readonly type?: FieldType;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly min?: number;
  readonly max?: number;
  readonly pattern?: RegExp;
  readonly custom?: (value: unknown) => boolean | string;
  readonly description?: string;
}

export type SchemaRules = Record<string, FieldRule>;

export interface RequestValidationSchema {
  readonly body?: SchemaRules;
  readonly query?: SchemaRules;
  readonly params?: SchemaRules;
}

export interface ValidationErrorDetail {
  readonly location: 'body' | 'query' | 'params';
  readonly field: string;
  readonly message: string;
}

function validateField(
  location: 'body' | 'query' | 'params',
  field: string,
  value: unknown,
  rule: FieldRule
): ValidationErrorDetail | null {
  // Check required
  if (value === undefined || value === null || value === '') {
    if (rule.required) {
      return {
        location,
        field,
        message: `Field '${field}' in ${location} is required.`,
      };
    }
    return null; // Not required and absent, skip further checks
  }

  // Type checks
  if (rule.type) {
    if (rule.type === 'array') {
      if (!Array.isArray(value)) {
        return {
          location,
          field,
          message: `Field '${field}' must be an array.`,
        };
      }
    } else if (rule.type === 'object') {
      if (typeof value !== 'object' || Array.isArray(value) || value === null) {
        return {
          location,
          field,
          message: `Field '${field}' must be an object.`,
        };
      }
    } else if (typeof value !== rule.type) {
      return {
        location,
        field,
        message: `Field '${field}' must be of type ${rule.type}, received ${typeof value}.`,
      };
    }
  }

  // String specific checks
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return {
        location,
        field,
        message: `Field '${field}' length must be at least ${rule.minLength} characters.`,
      };
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return {
        location,
        field,
        message: `Field '${field}' length must not exceed ${rule.maxLength} characters.`,
      };
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      return {
        location,
        field,
        message: `Field '${field}' format is invalid.`,
      };
    }
  }

  // Number specific checks
  if (typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      return {
        location,
        field,
        message: `Field '${field}' must be greater than or equal to ${rule.min}.`,
      };
    }
    if (rule.max !== undefined && value > rule.max) {
      return {
        location,
        field,
        message: `Field '${field}' must be less than or equal to ${rule.max}.`,
      };
    }
  }

  // Custom validation rule
  if (rule.custom) {
    const customResult = rule.custom(value);
    if (customResult !== true) {
      return {
        location,
        field,
        message: typeof customResult === 'string' ? customResult : `Field '${field}' failed custom validation.`,
      };
    }
  }

  return null;
}

function validateSegment(
  location: 'body' | 'query' | 'params',
  data: Record<string, unknown> | undefined,
  rules: SchemaRules | undefined
): ValidationErrorDetail[] {
  if (!rules) return [];
  const errors: ValidationErrorDetail[] = [];
  const source = data || {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = source[field];
    const err = validateField(location, field, value, rule);
    if (err) {
      errors.push(err);
    }
  }

  return errors;
}

export function validateRequest(schema: RequestValidationSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: ValidationErrorDetail[] = [
      ...validateSegment('params', req.params as Record<string, unknown>, schema.params),
      ...validateSegment('query', req.query as Record<string, unknown>, schema.query),
      ...validateSegment('body', req.body as Record<string, unknown>, schema.body),
    ];

    if (errors.length > 0) {
      next(new ValidationError('Request validation failed', errors));
      return;
    }

    next();
  };
}
