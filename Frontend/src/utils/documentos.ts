// Formato y validación de los documentos de la cartera, compartidos por la pantalla y sus pruebas
import { ApiError } from "../services/authApi"
import { MAX_BYTES_DOCUMENTO, TIPOS_DOCUMENTO, urlDeDocumento, type TipoDocumento } from "../services/documentosApi"
import { C } from "../styles/tokens"

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const EXTENSIONES = /\.(pdf|jpe?g|png)$/i

// Comprobación previa a la subida, para avisar sin esperar al servidor. El backend vuelve a comprobar el tipo
// por el contenido del archivo. Algunos móviles no indican el tipo, y entonces se mira la extensión.
// Devuelve el motivo por el que no se puede subir, o null si se puede
export const motivoParaNoSubir = (archivo: File): string | null => {
  const tipoValido = archivo.type
    ? TIPOS_DOCUMENTO.includes(archivo.type as TipoDocumento)
    : EXTENSIONES.test(archivo.name)
  if (!tipoValido) return "Solo se pueden subir documentos PDF o imágenes JPEG o PNG"
  if (archivo.size === 0) return "El archivo está vacío"
  if (archivo.size > MAX_BYTES_DOCUMENTO) return "El documento no puede ocupar más de 8 MB"
  return null
}

// 248731 → «243 KB», 1572864 → «1,5 MB»
export const tamanoLegible = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`
}

// Fecha de subida en la hora local: «8 nov 2026»
export const fechaDeSubida = (creadoEn: string) => {
  const fecha = new Date(creadoEn)
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`
}

// Icono y colores de cada tipo de documento, como las tarjetas de la cartera del prototipo
export const aspectoDeDocumento = (tipo: TipoDocumento) =>
  tipo === "application/pdf"
    ? { icono: "document", texto: "PDF", color: C.red, fondo: C.redBg }
    : { icono: "gallery", texto: "Imagen", color: C.green, fondo: C.greenBg }

// Mensaje cuando no se puede abrir o descargar un documento. Si otro miembro lo ha borrado, lo dice
export const mensajeAlAbrir = (error: unknown) => {
  if (error instanceof ApiError && error.estado === 404) return "Este documento ya no existe: es posible que lo hayan eliminado"
  return `No se ha podido abrir el documento: ${error instanceof ApiError ? error.message : "ha ocurrido un error"}`
}

// Pide un enlace nuevo (caducan a los 5 minutos) y deja que el navegador guarde el archivo con el nombre del documento
export const descargarDocumento = async (viajeId: string, documentoId: string, tokenSesion: string) => {
  const { url } = await urlDeDocumento(viajeId, documentoId, tokenSesion, true)
  window.location.assign(url)
}
