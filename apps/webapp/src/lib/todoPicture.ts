// Keyword -> emoji. First rule with a matching word wins, so put specific rules first.
const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(buy|shop|shopping|grocer\w*|store|market)\b/i, '🛒'],
  [/\b(meet\w*|call|phone|interview)\b/i, '📞'],
  [/\b(email|mail|letter|inbox)\b/i, '✉️'],
  [/\b(bug|fix|debug|error|crash)\b/i, '🐛'],
  [/\b(code|deploy|release|build|develop\w*|api|test\w*)\b/i, '💻'],
  [/\b(write|doc|docs|report|essay|blog|note\w*)\b/i, '📝'],
  [/\b(gym|run|workout|exercise|yoga|swim\w*)\b/i, '🏋️'],
  [/\b(cook\w*|dinner|lunch|breakfast|recipe|eat)\b/i, '🍳'],
  [/\b(clean\w*|laundry|dishes|tidy)\b/i, '🧹'],
  [/\b(pay|bill|invoice|tax\w*|budget|bank)\b/i, '💰'],
  [/\b(doctor|dentist|health|medicine|appointment)\b/i, '🩺'],
  [/\b(travel|trip|flight|hotel|vacation|book)\b/i, '✈️'],
  [/\b(study|learn\w*|read\w*|exam|homework|course)\b/i, '📚'],
  [/\b(birthday|party|gift|celebrat\w*)\b/i, '🎉'],
  [/\b(car|drive|repair|garage)\b/i, '🚗'],
  [/\b(plant\w*|garden\w*|water)\b/i, '🌱'],
];

export const DEFAULT_PICTURE = '📌';

export function todoPicture(description: string): string {
  return RULES.find(([pattern]) => pattern.test(description))?.[1] ?? DEFAULT_PICTURE;
}
