import { Router } from 'express';
import { validateRequest } from '../middleware/validation.js';
import { getUserProfile } from '../controllers/githubController.js';

export const githubRouter: Router = Router();

// Validation schema for GitHub username parameter (1-39 chars, alphanumeric with single hyphens)
const usernameValidation = validateRequest({
  params: {
    username: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 39,
      pattern: /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/,
      description: 'GitHub username',
    },
  },
});

/**
 * GET /api/github/users/:username
 * Fetches normalized GitHub user profile.
 */
githubRouter.get('/users/:username', usernameValidation, getUserProfile);
