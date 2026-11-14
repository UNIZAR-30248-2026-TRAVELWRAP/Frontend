// pdfjs-dist pesa bastante: solo se descarga al abrir un PDF. Vite empaqueta el worker como un archivo aparte
// (?url) y pdf.js lo arranca desde ahí
export const cargarPdfjs = async () => {
  const [pdfjs, { default: urlWorker }] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url")
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = urlWorker
  return pdfjs
}
