import { peticion } from "./authApi"

export type TipoDocumento = "application/pdf" | "image/jpeg" | "image/png"

export type Documento = {
  id: string
  viaje_id: string
  nombre: string
  // Tipo reconocido por el backend a partir del contenido del archivo
  tipo_mime: TipoDocumento
  tamano_bytes: number
  // null si la cuenta de quien lo subió se ha eliminado
  subido_por: string | null
  creado_en: string
}

export type ListaDocumentos = {
  // Del más reciente al más antiguo
  documentos: Documento[]
}

// Los mismos límites que comprueban el backend y Supabase Storage
export const TIPOS_DOCUMENTO: TipoDocumento[] = ["application/pdf", "image/jpeg", "image/png"]
export const MAX_BYTES_DOCUMENTO = 8_000_000

const rutaDocumentos = (viajeId: string) => `/viajes/${encodeURIComponent(viajeId)}/documentos`

// Documentos de la cartera del viaje (sin el contenido de los archivos)
export const listarDocumentos = (viajeId: string, tokenSesion: string) =>
  peticion<ListaDocumentos>(rutaDocumentos(viajeId), { token: tokenSesion })

// Sube un PDF o una imagen a la cartera. Sin nombre, el backend usa el del archivo
export const subirDocumento = (viajeId: string, archivo: File, tokenSesion: string, nombre?: string) => {
  const formulario = new FormData()
  if (nombre?.trim()) formulario.append("nombre", nombre.trim())
  formulario.append("archivo", archivo)
  return peticion<Documento>(rutaDocumentos(viajeId), { metodo: "POST", formulario, token: tokenSesion })
}

export type UrlDocumento = {
  // Enlace firmado de Supabase Storage; el archivo no pasa por el backend
  url: string
  // Cuándo caduca el enlace (5 minutos después de pedirlo)
  expira_en: string
  nombre: string
  tipo_mime: TipoDocumento
}

// Enlace temporal para abrir un documento. Con descargar = true el archivo se guarda con el nombre del documento.
// Caduca, así que hay que pedir uno nuevo cada vez que se abre o se descarga
export const urlDeDocumento = (viajeId: string, documentoId: string, tokenSesion: string, descargar = false) =>
  peticion<UrlDocumento>(
    `${rutaDocumentos(viajeId)}/${encodeURIComponent(documentoId)}/url${descargar ? "?descargar=true" : ""}`,
    { token: tokenSesion }
  )

// Elimina el documento de la cartera y su archivo. Cualquier miembro puede, y solo con el viaje activo.
// Responde 204 sin cuerpo
export const eliminarDocumento = (viajeId: string, documentoId: string, tokenSesion: string) =>
  peticion<null>(`${rutaDocumentos(viajeId)}/${encodeURIComponent(documentoId)}`, {
    metodo: "DELETE",
    token: tokenSesion,
  })
