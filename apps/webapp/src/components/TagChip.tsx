import { tagColor } from '@/lib/tags';

export default function TagChip(props: { tag: string; onRemove?: () => void }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tagColor(props.tag)}`}>
      {props.tag}
      {props.onRemove && (
        <button
          type="button"
          onClick={props.onRemove}
          aria-label={`Remove tag ${props.tag}`}
          className="ml-1 leading-none hover:opacity-70"
        >
          ×
        </button>
      )}
    </span>
  );
}
