import { z } from 'zod';
import { MAX_TAG_LENGTH, MAX_TAGS } from '@/lib/tags';
import { MAX_OWNER_LENGTH } from '@/lib/owner';

const ownerSchema = z.string().trim().max(MAX_OWNER_LENGTH);
const tagsSchema = z.array(z.string().trim().min(1).max(MAX_TAG_LENGTH)).max(MAX_TAGS);

export const TodoItemStatus = { PENDING: 'PENDING', COMPLETED: 'COMPLETED' } as const;
export type TodoItemStatus = (typeof TodoItemStatus)[keyof typeof TodoItemStatus];
const todoItemStatusSchema = z.enum(['PENDING', 'COMPLETED']);

export const createTodoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  tags: tagsSchema,
  owner: ownerSchema,
});

export const updateTodoSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  status: todoItemStatusSchema,
  tags: tagsSchema,
  owner: ownerSchema,
});

export const deleteTodoSchema = z.object({
  id: z.uuid(),
});

export const updateTodoStatusSchema = z.object({
  id: z.uuid(),
  status: todoItemStatusSchema,
});

export const runTranslateJobSchema = z.object({
  id: z.uuid(),
});
