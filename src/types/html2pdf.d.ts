declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[]
    filename?: string
    image?: { type?: string; quality?: number }
    html2canvas?: Record<string, unknown>
    jsPDF?: Record<string, unknown>
    pagebreak?: Record<string, unknown>
    enableLinks?: boolean
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf
    from(element: HTMLElement | string): Html2Pdf
    save(filename?: string): Promise<void>
    output(...args: unknown[]): Promise<unknown>
    toPdf(): Html2Pdf
  }

  export default function html2pdf(): Html2Pdf
}
