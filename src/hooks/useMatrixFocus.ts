import { useCallback, useRef } from 'react'

export function useMatrixFocus() {
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const focusCell = useCallback((funci: string, iso: string) => {
    const wrap = wrapRef.current
    if (!wrap) return
    const input = wrap.querySelector<HTMLInputElement>(
      `input[data-funci="${CSS.escape(funci)}"][data-iso="${CSS.escape(iso)}"]`,
    )
    if (!input) return
    input.focus()
    const len = input.value.length
    input.setSelectionRange(len, len)
  }, [])

  return { wrapRef, focusCell }
}
