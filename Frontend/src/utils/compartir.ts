export type ResultadoCompartir = "compartido" | "descargado" | "cancelado"

const archivoDe = async (url: string, nombre: string, tipoMime: string) => {
  let respuesta: Response
  try {
    respuesta = await fetch(url)
  } catch {
    throw new Error("No se ha podido preparar el archivo para compartirlo")
  }
  if (!respuesta.ok) throw new Error("No se ha podido preparar el archivo para compartirlo")
  // Se lee como bytes (y no como Blob) para no mezclar el Blob de Node con el File de jsdom
  const contenido = await respuesta.arrayBuffer()
  return new File([contenido], nombre, { type: tipoMime || respuesta.headers.get('Content-Type') || '' })
}

export const descargarArchivo = (archivo: File) => {
  const enlaceTemporal = URL.createObjectURL(archivo)
  const enlace = document.createElement("a")
  enlace.href = enlaceTemporal
  enlace.download = archivo.name
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(enlaceTemporal), 1000)
}

export const puedeCompartirArchivos = (archivo: File) =>
  typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [archivo] })

export const compartirArchivo = async (url: string, nombre: string, tipoMime: string): Promise<ResultadoCompartir> => {
  const archivo = await archivoDe(url, nombre, tipoMime)
  if (puedeCompartirArchivos(archivo)) {
    try {
      await navigator.share({ files: [archivo], title: nombre })
      return "compartido"
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelado"
    }
  }
  descargarArchivo(archivo)
  return "descargado"
}
