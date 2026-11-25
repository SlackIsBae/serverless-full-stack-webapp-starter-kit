import { sendEvent } from '@repo/event-utils/send-event';
import { db } from '@repo/db/client';
import { todoItems } from '@repo/db/schema';
import { eq, and } from 'drizzle-orm';
import type { TranslateJobPayload } from '@repo/shared-types/job-payload';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';

export async function translateJobHandler(params: TranslateJobPayload) {
  const todoItem = await db.query.todoItems.findFirst({
    where: and(eq(todoItems.id, params.todoItemId), eq(todoItems.userId, params.userId)),
  });
  if (!todoItem) {
    console.log(`item ${params.todoItemId} not found.`);
    return;
  }

  const translateClient = new TranslateClient({});

  const targetLanguage = 'ja';
  const translate = (source: string) =>
    translateClient.send(
      new TranslateTextCommand({
        Text: todoItem.title,
        SourceLanguageCode: source,
        TargetLanguageCode: targetLanguage,
      }),
    );
  const translateResult = await translate('auto').catch((e) => {
    if (e?.name !== 'AccessDeniedException') throw e;
    console.warn('auto-detect denied, falling back to en');
    return translate('en');
  });

  if (translateResult.TranslatedText) {
    await db.insert(todoItems).values({
      title: translateResult.TranslatedText,
      description: `Translated from: ${todoItem.title} (from ${translateResult.SourceLanguageCode} to ${targetLanguage})`,
      userId: params.userId,
      status: todoItem.status,
    });

    console.log(`Created translated todo item`);
  }

  await sendEvent(`user/${params.userId}/jobs`, { type: 'completed' });
}
