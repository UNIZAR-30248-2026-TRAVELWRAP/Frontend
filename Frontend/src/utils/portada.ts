// Preparación y mensajes de la foto de portada del viaje, compartidos por «Editar viaje» y sus pruebas
import { ApiError } from "../services/authApi"

const TIPOS_PORTADA = ["image/jpeg", "image/png"]
// Límite de la foto elegida, antes de reducirla
export const MAX_BYTES_PORTADA_ORIGINAL = 15 * 1024 * 1024
// Límite que acepta el servidor
export const MAX_BYTES_PORTADA = 5_000_000
const LADO_MAXIMO_PORTADA = 1280
const CALIDAD_JPEG = 0.82

// Comprobación previa a la subida. Devuelve el motivo por el que no se puede usar, o null si se puede
export const validarFotoPortada = (archivo: File): string | null => {
  if (!TIPOS_PORTADA.includes(archivo.type)) return "La portada debe ser una foto JPEG o PNG"
  if (archivo.size === 0) return "El archivo está vacío"
  if (archivo.size > MAX_BYTES_PORTADA_ORIGINAL) return "La foto no puede ocupar más de 15 MB"
  return null
}

const aBlob = (lienzo: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, "image/jpeg", CALIDAD_JPEG))

// Reduce la foto a 1280 px de lado como máximo y la convierte a JPEG. Así pesa poco y pierde el EXIF (que puede
// llevar la ubicación). Si el navegador no puede, se sube la original solo si el servidor la acepta
export const prepararPortada = async (archivo: File): Promise<Blob> => {
  try {
    const imagen = await createImageBitmap(archivo)
    const escala = Math.min(1, LADO_MAXIMO_PORTADA / Math.max(imagen.width, imagen.height))
    const lienzo = document.createElement("canvas")
    lienzo.width = Math.round(imagen.width * escala)
    lienzo.height = Math.round(imagen.height * escala)
    const contexto = lienzo.getContext("2d")
    if (contexto) {
      contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height)
      imagen.close()
      const blob = await aBlob(lienzo)
      if (blob) return blob
    } else {
      imagen.close()
    }
  } catch {
    // El navegador no puede procesar la imagen: se intenta con la original
  }
  if (archivo.size <= MAX_BYTES_PORTADA) return archivo
  throw new Error("No se ha podido preparar la foto. Prueba con una más pequeña")
}

const MENSAJES_ERROR: Record<string, string> = {
  sin_conexion: "No hay conexión con el servidor. Inténtalo de nuevo",
  archivo_demasiado_grande: "La foto es demasiado grande (máximo 5 MB)",
  tipo_no_permitido: "La portada debe ser una foto JPEG o PNG",
  sin_sesion: "Tu sesión ha caducado. Vuelve a iniciar sesión",
}

// Texto comprensible para un fallo al guardar la portada
export const mensajeErrorPortada = (error: unknown) => {
  if (error instanceof ApiError) return MENSAJES_ERROR[error.codigo] ?? error.message
  return error instanceof Error ? error.message : "Ha ocurrido un error"
}
