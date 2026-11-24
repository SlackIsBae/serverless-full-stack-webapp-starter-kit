'use client';

import { useId, useState } from 'react';
import TagChip from './TagChip';
import { MAX_TAGS, MAX_TAG_LENGTH, normalizeTag } from '@/lib/tags';

interface TagInputProps {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}

// Native <datalist> gives accessible autocomplete without adding a dependency.
export default function TagInput({ id, value, onChange, suggestions }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const listId = useId();

  const add = () => {
    const tag = normalizeTag(draft).slice(0, MAX_TAG_LENGTH);
    if (tag && !value.includes(tag) && value.length < MAX_TAGS) onChange([...value, tag]);
    setDraft('');
  };

  return (
    <div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {value.map((tag) => (
          <TagChip key={tag} tag={tag} onRemove={() => onChange(value.filter((t) => t !== tag))} />
        ))}
      </div>
      <input
        id={id}
        value={draft}
        list={listId}
        maxLength={MAX_TAG_LENGTH}
        disabled={value.length >= MAX_TAGS}
        placeholder="Type a tag and press Enter"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault(); // do not submit the form
            add();
          }
        }}
        onBlur={add}
        className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
      />
      <datalist id={listId}>
        {suggestions
          .filter((s) => !value.includes(s))
          .map((s) => (
            <option key={s} value={s} aria-label={s} />
          ))}
      </datalist>
    </div>
  );
}
