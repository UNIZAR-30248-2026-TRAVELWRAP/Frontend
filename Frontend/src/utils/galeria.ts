export const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"]
export const MAX_BYTES_FOTO = 8_000_000

const EXTENSIONES_FOTO = /\.(jpe?g|png|webp)$/i

export const motivoParaNoSubirFoto = (archivo: File): string | null => {
  const tipoValido = archivo.type ? TIPOS_FOTO.includes(archivo.type) : EXTENSIONES_FOTO.test(archivo.name)
  if (!tipoValido) return "Solo se pueden subir fotos JPEG, PNG o WebP"
  if (archivo.size === 0) return "El archivo está vacío"
  if (archivo.size > MAX_BYTES_FOTO) return "La foto no puede ocupar más de 8 MB"
  return null
}

export const textoDeFotos = (fotos: number, miembros: number) =>
  `${fotos} ${fotos === 1 ? "foto" : "fotos"} · ${miembros} ${miembros === 1 ? "miembro" : "miembros"}`

export const descripcionDeFoto = (subidoPor: string | null, creadoEn: string, miembros: { usuario_id: string; nombre: string | null }[]) => {
  const fecha = new Date(creadoEn)
  const dia = Number.isNaN(fecha.getTime()) ? "" : fecha.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "")
  const nombre = miembros.find((m) => m.usuario_id === subidoPor)?.nombre ?? null
  if (nombre && dia) return `Subida por ${nombre} · ${dia}`
  if (nombre) return `Subida por ${nombre}`
  if (dia) return `Subida el ${dia}`
  return ""
}
