export const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"]
export const MAX_BYTES_FOTO = 8_000_000
export const TIPOS_VIDEO = ["video/mp4", "video/webm", "video/quicktime"]
export const MAX_BYTES_VIDEO = 50_000_000
export const TIPOS_ARCHIVO = [...TIPOS_FOTO, ...TIPOS_VIDEO]

export const esVideo = (tipo: string) => TIPOS_VIDEO.includes(tipo)

const EXTENSIONES_ARCHIVO = /\.(jpe?g|png|webp|mp4|webm|mov)$/i
const EXTENSIONES_VIDEO = /\.(mp4|webm|mov)$/i

export const archivoEsVideo = (archivo: File) => (archivo.type ? esVideo(archivo.type) : EXTENSIONES_VIDEO.test(archivo.name))

export const motivoParaNoSubirFoto = (archivo: File): string | null => {
  const tipoValido = archivo.type ? TIPOS_ARCHIVO.includes(archivo.type) : EXTENSIONES_ARCHIVO.test(archivo.name)
  if (!tipoValido) return "Solo se pueden subir fotos (JPEG, PNG o WebP) o vídeos (MP4, WebM o MOV)"
  if (archivo.size === 0) return "El archivo está vacío"
  if (archivoEsVideo(archivo)) return archivo.size > MAX_BYTES_VIDEO ? "El vídeo no puede ocupar más de 50 MB" : null
  if (archivo.size > MAX_BYTES_FOTO) return "La foto no puede ocupar más de 8 MB"
  return null
}

export const textoDeFotos = (fotos: number, miembros: number, videos = 0) =>
  `${fotos} ${fotos === 1 ? "foto" : "fotos"}${videos > 0 ? ` · ${videos} ${videos === 1 ? "vídeo" : "vídeos"}` : ""} · ${miembros} ${miembros === 1 ? "miembro" : "miembros"}`

export const descripcionDeFoto = (subidoPor: string | null, creadoEn: string, miembros: { usuario_id: string; nombre: string | null }[]) => {
  const fecha = new Date(creadoEn)
  const dia = Number.isNaN(fecha.getTime()) ? "" : fecha.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "")
  const nombre = miembros.find((m) => m.usuario_id === subidoPor)?.nombre ?? null
  if (nombre && dia) return `Subida por ${nombre} · ${dia}`
  if (nombre) return `Subida por ${nombre}`
  if (dia) return `Subida el ${dia}`
  return ""
}
