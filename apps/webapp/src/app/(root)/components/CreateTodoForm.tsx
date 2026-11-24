'use client';

import { useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks';
import { createTodo } from '../actions';
import { createTodoSchema } from '../schemas';
import { toast } from 'sonner';
import { useEventBus } from '@/hooks/use-event-bus';
import { useRouter } from 'next/navigation';
import { Controller } from 'react-hook-form';
import TagInput from '@/components/TagInput';

export default function CreateTodoForm(props: { userId: string; allTags: string[] }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const slot = useSyncExternalStore(
    () => () => {},
    () => document.getElementById('header-actions'),
    () => null,
  );
  const router = useRouter();

  useEventBus({
    channelName: `user/${props.userId}/jobs`,
    onReceived: (data) => {
      console.log('received', data);
      router.refresh();
    },
  });

  const {
    form: { register, formState, reset, control },
    action,
    handleSubmitWithAction,
  } = useHookFormAction(createTodo, zodResolver(createTodoSchema), {
    actionProps: {
      onSuccess: () => {
        toast.success('Todo created successfully');
        reset();
        setIsFormOpen(false);
      },
      onError: ({ error }) => {
        toast.error(typeof error === 'string' ? error : 'Failed to create todo');
      },
    },
    formProps: {
      defaultValues: {
        title: '',
        description: '',
        tags: [],
        owner: '',
      },
    },
  });

  if (!isFormOpen) {
    return slot
      ? createPortal(
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center px-3 sm:px-4 py-2 border border-white/60 text-sm font-medium rounded-md shadow-sm whitespace-nowrap text-white bg-indigo-500 hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-600 focus:ring-white"
          >
            + Add New Todo
          </button>,
          slot,
        )
      : null;
  }

  return (
    <div className="bg-card shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-lg font-medium text-foreground mb-4">Create New Todo</h2>
      <form onSubmit={handleSubmitWithAction} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-foreground">
            Title
          </label>
          <input
            id="title"
            {...register('title')}
            placeholder="Your TODO item title."
            className="mt-1 p-2 block w-full rounded-md border-input bg-background text-foreground shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          {formState.errors.title && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formState.errors.title.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={3}
            placeholder="Describe your TODO item."
            className="mt-1 p-2 block w-full rounded-md border-input bg-background text-foreground shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          {formState.errors.description && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formState.errors.description.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="owner" className="block text-sm font-medium text-foreground">
            Owner
          </label>
          <input
            id="owner"
            {...register('owner')}
            placeholder="Who owns this task? (optional)"
            className="mt-1 p-2 block w-full rounded-md border-input bg-background text-foreground shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-foreground">
            Tags
          </label>
          <Controller
            control={control}
            name="tags"
            render={({ field }) => (
              <TagInput id="tags" value={field.value} onChange={field.onChange} suggestions={props.allTags} />
            )}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => setIsFormOpen(false)}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-secondary-foreground bg-secondary hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={action.isExecuting}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {action.isExecuting ? 'Creating...' : 'Create Todo'}
          </button>
        </div>
      </form>
    </div>
  );
}
