import { db } from '@repo/db/client';
import { todoItems } from '@repo/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getSessionWithUser } from '@/lib/auth';
import TodoItemComponent from './components/TodoItem';
import CreateTodoForm from './components/CreateTodoForm';
import { TodoItemStatus } from './schemas';
import Header from '@/components/Header';

export default async function Home() {
  const { userId } = await getSessionWithUser();

  const todos = await db.query.todoItems.findMany({
    where: eq(todoItems.userId, userId),
    orderBy: desc(todoItems.createdAt),
  });

  const allTags = [...new Set(todos.flatMap((todo) => todo.tags ?? []))].sort();

  const pendingTodos = todos.filter((todo) => todo.status === TodoItemStatus.PENDING);
  const completedTodos = todos.filter((todo) => todo.status === TodoItemStatus.COMPLETED);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <CreateTodoForm userId={userId} allTags={allTags} />

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Pending Tasks ({pendingTodos.length})</h2>
            {pendingTodos.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No pending tasks. Great job!</p>
            ) : (
              <div>
                {pendingTodos.map((todo) => (
                  <TodoItemComponent key={todo.id} todo={todo} allTags={allTags} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Completed Tasks ({completedTodos.length})</h2>
            {completedTodos.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No completed tasks yet.</p>
            ) : (
              <div>
                {completedTodos.map((todo) => (
                  <TodoItemComponent key={todo.id} todo={todo} allTags={allTags} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
