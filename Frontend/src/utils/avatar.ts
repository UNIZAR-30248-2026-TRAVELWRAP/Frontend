// Preparación y mensajes de la foto de perfil, compartidos por la pantalla «Mi Perfil» y sus pruebas
import { ApiError } from "../services/authApi"

const TIPOS_AVATAR = ["image/jpeg", "image/png"]
// Límite de la foto elegida, antes de reducirla
export const MAX_BYTES_FOTO_ORIGINAL = 15 * 1024 * 1024
// Límite que acepta el servidor
export const MAX_BYTES_AVATAR = 2_000_000
const LADO_AVATAR = 512
const CALIDAD_JPEG = 0.85

// Comprobación previa a la subida. Devuelve el motivo por el que no se puede usar, o null si se puede
export const validarFotoAvatar = (archivo: File): string | null => {
  if (!TIPOS_AVATAR.includes(archivo.type)) return "La foto debe ser JPEG o PNG"
  if (archivo.size === 0) return "El archivo está vacío"
  if (archivo.size > MAX_BYTES_FOTO_ORIGINAL) return "La foto no puede ocupar más de 15 MB"
  return null
}

const aBlob = (lienzo: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, "image/jpeg", CALIDAD_JPEG))

// Recorta la foto al cuadrado central, la deja en 512×512 y la convierte a JPEG. Así pesa poco y pierde el EXIF
// (que puede llevar la ubicación). Si el navegador no puede, se sube la original solo si el servidor la acepta
export const prepararAvatar = async (archivo: File): Promise<Blob> => {
  try {
    const imagen = await createImageBitmap(archivo)
    const lado = Math.min(imagen.width, imagen.height)
    const lienzo = document.createElement("canvas")
    lienzo.width = LADO_AVATAR
    lienzo.height = LADO_AVATAR
    const contexto = lienzo.getContext("2d")
    if (contexto) {
      contexto.drawImage(
        imagen,
        (imagen.width - lado) / 2,
        (imagen.height - lado) / 2,
        lado,
        lado,
        0,
        0,
        LADO_AVATAR,
        LADO_AVATAR,
      )
      imagen.close()
      const blob = await aBlob(lienzo)
      if (blob) return blob
    } else {
      imagen.close()
    }
  } catch {
    // El navegador no puede procesar la imagen: se intenta con la original
  }
  if (archivo.size <= MAX_BYTES_AVATAR) return archivo
  throw new Error("No se ha podido preparar la foto. Prueba con una más pequeña")
}

const MENSAJES_ERROR: Record<string, string> = {
  sin_conexion: "No hay conexión con el servidor. Inténtalo de nuevo",
  archivo_demasiado_grande: "La foto es demasiado grande (máximo 2 MB)",
  tipo_no_permitido: "La foto debe ser JPEG o PNG",
  sin_sesion: "Tu sesión ha caducado. Vuelve a iniciar sesión",
}

// Texto comprensible para un fallo al editar el perfil
export const mensajeErrorPerfil = (error: unknown) => {
  if (error instanceof ApiError) return MENSAJES_ERROR[error.codigo] ?? error.message
  return error instanceof Error ? error.message : "Ha ocurrido un error"
}
