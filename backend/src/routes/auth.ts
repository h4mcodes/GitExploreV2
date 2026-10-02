import { Router } from 'express';
import { validateRequest } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import {
  register,
  login,
  logout,
  getMe,
} from '../controllers/authController.js';

export const authRouter: Router = Router();

const registerValidation = validateRequest({
  body: {
    username: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 39,
      pattern: /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/,
      description: 'Account username',
    },
    password: {
      required: true,
      type: 'string',
      minLength: 8,
      maxLength: 128,
      description: 'Account password (minimum 8 characters)',
    },
    email: {
      type: 'string',
      minLength: 3,
      maxLength: 255,
      description: 'User email address',
    },
    avatarUrl: {
      type: 'string',
      minLength: 3,
      maxLength: 1000,
      description: 'Avatar image URL',
    },
  },
});

const loginValidation = validateRequest({
  body: {
    username: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 39,
      description: 'Account username',
    },
    password: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 128,
      description: 'Account password',
    },
  },
});

/**
 * POST /api/auth/register
 * Registers a new account and returns safe user model with JWT token.
 */
authRouter.post('/register', registerValidation, register);

/**
 * POST /api/auth/login
 * Validates credentials and returns safe user model with JWT token.
 */
authRouter.post('/login', loginValidation, login);

/**
 * POST /api/auth/logout
 * Revokes the current session token.
 */
authRouter.post('/logout', requireAuth, logout);

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile.
 */
authRouter.get('/me', requireAuth, getMe);
