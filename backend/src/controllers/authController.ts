import { Request, Response, NextFunction } from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  AuthResult,
  SafeUser,
} from '../services/authService.js';
import { UnauthorizedError } from '../types/api.js';

/**
 * Controller handler for user registration.
 * POST /api/auth/register
 */
export async function register(
  req: Request<unknown, AuthResult, { username: string; password: string; email?: string; avatarUrl?: string }>,
  res: Response<AuthResult>,
  next: NextFunction
): Promise<void> {
  try {
    const { username, password, email, avatarUrl } = req.body;
    const result = await registerUser({
      username,
      password,
      email,
      avatarUrl,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Controller handler for user login.
 * POST /api/auth/login
 */
export async function login(
  req: Request<unknown, AuthResult, { username: string; password: string }>,
  res: Response<AuthResult>,
  next: NextFunction
): Promise<void> {
  try {
    const { username, password } = req.body;
    const result = await loginUser({
      username,
      password,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * Controller handler for user logout.
 * POST /api/auth/logout
 */
export async function logout(
  req: Request,
  res: Response<{ message: string }>,
  next: NextFunction
): Promise<void> {
  try {
    if (req.token) {
      logoutUser(req.token);
    }
    res.status(200).json({
      message: 'Successfully logged out and session revoked.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller handler to fetch current authenticated user profile.
 * GET /api/auth/me
 */
export async function getMe(
  req: Request,
  res: Response<{ user: SafeUser }>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required', 'AUTH_REQUIRED');
    }
    const user = await getCurrentUser(req.user.userId);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}
