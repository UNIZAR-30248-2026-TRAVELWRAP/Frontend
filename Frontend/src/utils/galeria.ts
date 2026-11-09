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
