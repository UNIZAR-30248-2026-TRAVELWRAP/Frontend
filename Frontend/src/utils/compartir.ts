export type ResultadoCompartir = "compartido" | "descargado" | "cancelado"

const archivoDe = async (url: string, nombre: string, tipoMime: string) => {
  let respuesta: Response
  try {
    respuesta = await fetch(url)
  } catch {
    throw new Error("No se ha podido preparar el archivo para compartirlo")
  }
  if (!respuesta.ok) throw new Error("No se ha podido preparar el archivo para compartirlo")
  const contenido = await respuesta.blob()
  return new File([contenido], nombre, { type: tipoMime || contenido.type })
}

const descargar = (archivo: File) => {
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
  descargar(archivo)
  return "descargado"
}
