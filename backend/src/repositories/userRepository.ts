import { User } from '@prisma/client';
import { prisma } from '../config/database.js';

export interface CreateUserInput {
  readonly username: string;
  readonly githubId?: string | null;
  readonly email?: string | null;
  readonly avatarUrl?: string | null;
}

export interface UpdateUserInput {
  readonly username?: string;
  readonly githubId?: string | null;
  readonly email?: string | null;
  readonly avatarUrl?: string | null;
}

/**
 * Retrieves a user by their unique primary key UUID.
 */
export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Retrieves a user by their unique GitHub account ID.
 */
export async function findUserByGithubId(githubId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { githubId },
  });
}

/**
 * Retrieves a user by their unique username.
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { username },
  });
}

/**
 * Creates a new user record.
 */
export async function createUser(data: CreateUserInput): Promise<User> {
  return prisma.user.create({
    data: {
      username: data.username,
      githubId: data.githubId ?? undefined,
      email: data.email ?? undefined,
      avatarUrl: data.avatarUrl ?? undefined,
    },
  });
}

/**
 * Updates an existing user record.
 */
export async function updateUser(id: string, data: UpdateUserInput): Promise<User> {
  return prisma.user.update({
    where: { id },
    data: {
      ...(data.username !== undefined ? { username: data.username } : {}),
      ...(data.githubId !== undefined ? { githubId: data.githubId } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
    },
  });
}
