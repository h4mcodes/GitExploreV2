import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import {
  listBookmarks,
  getBookmark,
  createBookmark,
  updateBookmark,
  deleteBookmark,
} from '../controllers/bookmarkController.js';

export const bookmarksRouter: Router = Router();

// All bookmark endpoints require valid user authentication
bookmarksRouter.use(requireAuth);

const idParamValidation = validateRequest({
  params: {
    id: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Bookmark UUID identifier',
    },
  },
});

const listQueryValidation = validateRequest({
  query: {
    repositoryId: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Optional filter by saved repository ID',
    },
    targetType: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
      description: 'Optional filter by target entity type',
    },
    targetRef: {
      type: 'string',
      minLength: 1,
      maxLength: 500,
      description: 'Optional filter by target reference',
    },
  },
});

const createBookmarkValidation = validateRequest({
  body: {
    repositoryId: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Associated saved repository ID',
    },
    label: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 200,
      description: 'Bookmark descriptive label',
    },
    targetType: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 50,
      description: 'Target entity type (COMMIT, BRANCH, DIFF, REPOSITORY, FILE, COMPARISON)',
    },
    targetRef: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 500,
      description: 'Target reference identifier (SHA, branch name, file path, etc.)',
    },
  },
});

const updateBookmarkValidation = validateRequest({
  params: {
    id: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Bookmark UUID identifier',
    },
  },
  body: {
    label: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
      description: 'Bookmark descriptive label',
    },
    targetType: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
      description: 'Target entity type',
    },
    targetRef: {
      type: 'string',
      minLength: 1,
      maxLength: 500,
      description: 'Target reference identifier',
    },
  },
});

/**
 * GET /api/bookmarks
 * Lists all bookmarks for authenticated user, with optional filters.
 */
bookmarksRouter.get('/', listQueryValidation, listBookmarks);

/**
 * POST /api/bookmarks
 * Creates a new bookmark.
 */
bookmarksRouter.post('/', createBookmarkValidation, createBookmark);

/**
 * GET /api/bookmarks/:id
 * Retrieves a single bookmark by UUID.
 */
bookmarksRouter.get('/:id', idParamValidation, getBookmark);

/**
 * PATCH /api/bookmarks/:id
 * Updates an existing bookmark.
 */
bookmarksRouter.patch('/:id', updateBookmarkValidation, updateBookmark);

/**
 * DELETE /api/bookmarks/:id
 * Removes a bookmark from the user's workspace.
 */
bookmarksRouter.delete('/:id', idParamValidation, deleteBookmark);
