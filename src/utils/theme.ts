export function getCSSVar(name: string): string {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  } catch {
    return ''
  }
}
