'use client';

import { useState } from 'react';
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateTodo, deleteTodo, updateTodoStatus, runTranslateJob } from '../actions';
import { updateTodoSchema, TodoItemStatus } from '../schemas';
import { useAction } from 'next-safe-action/hooks';
import { toast } from 'sonner';
import { Controller } from 'react-hook-form';
import TagInput from '@/components/TagInput';
import TagChip from '@/components/TagChip';
import { ownerInitials } from '@/lib/owner';
import { todoPicture } from '@/lib/todoPicture';
import type { todoItems } from '@repo/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

type TodoItem = InferSelectModel<typeof todoItems>;

interface TodoItemProps {
  todo: TodoItem;
  allTags: string[];
}

export default function TodoItemComponent({ todo, allTags }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { execute, status: translateStatus } = useAction(runTranslateJob, {
    onSuccess: () => {
      toast.success('Translation job started successfully');
    },
    onError: (error) => {
      toast.error(typeof error === 'string' ? error : 'Failed to start translation job');
    },
  });

  // Update Todo Form Action with React Hook Form
  const {
    form: { register: registerUpdate, formState: updateFormState, control },
    action: updateAction,
    handleSubmitWithAction: handleUpdate,
  } = useHookFormAction(updateTodo, zodResolver(updateTodoSchema), {
    actionProps: {
      onSuccess: () => {
        toast.success('Todo updated successfully');
        setIsEditing(false);
      },
      onError: ({ error }) => {
        toast.error(typeof error === 'string' ? error : 'Failed to update todo');
      },
    },
    formProps: {
      defaultValues: {
        id: todo.id,
        title: todo.title,
        description: todo.description,
        status: todo.status as TodoItemStatus,
        tags: todo.tags ?? [],
        owner: todo.owner ?? '',
      },
    },
  });

  // Delete Todo Action - Simple action without form
  const { execute: executeDelete, status: deleteStatus } = useAction(deleteTodo, {
    onSuccess: () => {
      toast.success('Todo deleted successfully');
    },
    onError: (error) => {
      toast.error(typeof error === 'string' ? error : 'Failed to delete todo');
    },
  });

  // Update Status Action - Simple action without form
  const { execute: executeStatusUpdate, status: statusStatus } = useAction(updateTodoStatus, {
    onSuccess: () => {
      toast.success('Status updated successfully');
    },
    onError: (error) => {
      toast.error(typeof error === 'string' ? error : 'Failed to update status');
    },
  });

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this todo?')) {
      executeDelete({ id: todo.id });
    }
  };

  const toggleStatus = () => {
    const newStatus = todo.status === TodoItemStatus.PENDING ? TodoItemStatus.COMPLETED : TodoItemStatus.PENDING;

    executeStatusUpdate({
      id: todo.id,
      status: newStatus,
    });
  };

  if (isEditing) {
    return (
      <div className="border p-4 rounded-md shadow-sm mb-4 bg-card">
        <form onSubmit={handleUpdate} className="space-y-4">
          <input type="hidden" {...registerUpdate('id')} value={todo.id} />
          <input type="hidden" {...registerUpdate('status')} value={todo.status} />

          <div>
            <label htmlFor={`title-${todo.id}`} className="block text-sm font-medium text-foreground">
              Title
            </label>
            <input
              id={`title-${todo.id}`}
              type="text"
              {...registerUpdate('title')}
              className="mt-1 p-2 block w-full rounded-md border-input bg-background text-foreground shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            {updateFormState.errors.title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{updateFormState.errors.title.message}</p>
            )}
          </div>

          <div>
            <label htmlFor={`description-${todo.id}`} className="block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              id={`description-${todo.id}`}
              {...registerUpdate('description')}
              rows={3}
              className="mt-1 p-2 block w-full rounded-md border-input bg-background text-foreground shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            {updateFormState.errors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {updateFormState.errors.description.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`owner-${todo.id}`} className="block text-sm font-medium text-foreground">
              Owner
            </label>
            <input
              id={`owner-${todo.id}`}
              {...registerUpdate('owner')}
              placeholder="Who owns this task? (optional)"
              className="mt-1 p-2 block w-full rounded-md border-input bg-background text-foreground shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor={`tags-${todo.id}`} className="block text-sm font-medium text-foreground">
              Tags
            </label>
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <TagInput id={`tags-${todo.id}`} value={field.value} onChange={field.onChange} suggestions={allTags} />
              )}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-secondary-foreground bg-secondary hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateAction.isExecuting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {updateAction.isExecuting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    // <article> labels each todo for assistive technology and enables scoped E2E locators (role "article").
    <article
      aria-labelledby={`todo-title-${todo.id}`}
      className={`relative overflow-hidden border p-4 rounded-md shadow-sm mb-4 ${todo.status === TodoItemStatus.COMPLETED ? 'bg-muted' : 'bg-card'}`}
    >
      {/* Decorative picture: soft gradient plus a large faded emoji on the right. Text sits above it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-indigo-500/10 dark:to-indigo-400/15"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 top-1/2 -translate-y-1/2 select-none text-8xl leading-none opacity-20 dark:opacity-25"
      >
        {todoPicture(todo.description)}
      </span>
      <div className="relative flex items-start justify-between">
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={todo.status === TodoItemStatus.COMPLETED}
            onChange={toggleStatus}
            disabled={statusStatus === 'executing'}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-input rounded"
          />
          <div className="ml-3">
            <h3
              id={`todo-title-${todo.id}`}
              className={`text-lg font-medium ${todo.status === TodoItemStatus.COMPLETED ? 'line-through text-muted-foreground' : 'text-foreground'}`}
            >
              {todo.title}
            </h3>
            <p
              className={`text-sm ${todo.status === TodoItemStatus.COMPLETED ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}
            >
              {todo.description}
            </p>
            {(todo.tags ?? []).length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {(todo.tags ?? []).map((tag) => (
                  <TagChip key={tag} tag={tag} />
                ))}
              </div>
            )}
            {todo.owner && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-foreground">
                <span
                  aria-hidden="true"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100"
                >
                  {ownerInitials(todo.owner)}
                </span>
                <span>Owner: {todo.owner}</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Created: {new Date(todo.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsEditing(true)}
            disabled={deleteStatus === 'executing' || statusStatus === 'executing' || translateStatus === 'executing'}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteStatus === 'executing' || statusStatus === 'executing' || translateStatus === 'executing'}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
          >
            {deleteStatus === 'executing' ? 'Deleting...' : 'Delete'}
          </button>
          <button
            onClick={() => execute({ id: todo.id })}
            disabled={deleteStatus === 'executing' || statusStatus === 'executing' || translateStatus === 'executing'}
            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
          >
            {translateStatus === 'executing' ? 'Translating...' : 'Translate'}
          </button>
        </div>
      </div>
    </article>
  );
}
