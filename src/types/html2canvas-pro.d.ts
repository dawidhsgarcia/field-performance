declare module 'html2canvas-pro' {
  interface Html2CanvasOptions {
    scale?: number
    useCORS?: boolean
    logging?: boolean
    backgroundColor?: string | null
    width?: number
    height?: number
    windowWidth?: number
    windowHeight?: number
    onclone?: (clonedDocument: Document, element: HTMLElement) => void
    ignoreElements?: (element: HTMLElement) => boolean
    foreignObjectRendering?: boolean
    removeContainer?: boolean
  }

  export default function html2canvas(
    element: HTMLElement,
    options?: Html2CanvasOptions,
  ): Promise<HTMLCanvasElement>
}
