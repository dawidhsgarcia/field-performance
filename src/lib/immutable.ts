export function produce<T>(state: T, mutator: (draft: T) => void): T {
  const draft = structuredClone(state)
  mutator(draft)
  return draft
}
