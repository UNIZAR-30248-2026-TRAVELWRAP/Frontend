import { peticion } from "./authApi"

export type Foto = {
  id: string
  viaje_id: string
  nombre: string
  tipo_mime: "image/jpeg" | "image/png" | "image/webp"
  tamano_bytes: number
  subido_por: string | null
  creado_en: string
  url: string | null
}

export type ListaFotos = {
  fotos: Foto[]
}

const rutaFotos = (viajeId: string) => `/viajes/${encodeURIComponent(viajeId)}/fotos`

export const listarFotos = async (viajeId: string, tokenSesion: string) => {
  const lista = await peticion<ListaFotos>(rutaFotos(viajeId), { token: tokenSesion })
  if (!Array.isArray(lista?.fotos)) throw new Error("Respuesta de fotos no válida")
  return lista
}

export const subirFoto = (viajeId: string, archivo: File, tokenSesion: string) => {
  const formulario = new FormData()
  formulario.append("archivo", archivo)
  return peticion<Foto>(rutaFotos(viajeId), { metodo: "POST", formulario, token: tokenSesion })
}
