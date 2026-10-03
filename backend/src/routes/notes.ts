import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
} from '../controllers/noteController.js';

export const notesRouter: Router = Router();

// All note endpoints require valid user authentication
notesRouter.use(requireAuth);

const idParamValidation = validateRequest({
  params: {
    id: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Note UUID identifier',
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
    investigationId: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Optional filter by investigation ID',
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

const createNoteValidation = validateRequest({
  body: {
    content: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 10000,
      description: 'Note content body',
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
      description: 'Target reference identifier (SHA, branch name, path, etc.)',
    },
    repositoryId: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Optional associated saved repository ID',
    },
    investigationId: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Optional associated investigation ID',
    },
  },
});

const updateNoteValidation = validateRequest({
  params: {
    id: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 100,
      description: 'Note UUID identifier',
    },
  },
  body: {
    content: {
      type: 'string',
      minLength: 1,
      maxLength: 10000,
      description: 'Note content body',
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
    repositoryId: {
      type: 'string',
      maxLength: 100,
      description: 'Associated saved repository ID or null',
    },
    investigationId: {
      type: 'string',
      maxLength: 100,
      description: 'Associated investigation ID or null',
    },
  },
});

/**
 * GET /api/notes
 * Lists all notes for authenticated user, with optional filters.
 */
notesRouter.get('/', listQueryValidation, listNotes);

/**
 * POST /api/notes
 * Creates a new note.
 */
notesRouter.post('/', createNoteValidation, createNote);

/**
 * GET /api/notes/:id
 * Retrieves a single note by UUID.
 */
notesRouter.get('/:id', idParamValidation, getNote);

/**
 * PATCH /api/notes/:id
 * Updates an existing note.
 */
notesRouter.patch('/:id', updateNoteValidation, updateNote);

/**
 * DELETE /api/notes/:id
 * Removes a note from the user's workspace.
 */
notesRouter.delete('/:id', idParamValidation, deleteNote);
