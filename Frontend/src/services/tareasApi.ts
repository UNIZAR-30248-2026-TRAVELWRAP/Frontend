import { peticion } from "./authApi"

export type ResponsableTarea = {
  usuario_id: string
  // null si el responsable ya no es miembro del viaje
  nombre: string | null
  avatar_url: string | null
}

export type Tarea = {
  id: string
  texto: string
  hecha: boolean
  // Cuándo se marcó como hecha; null mientras está pendiente
  hecha_en: string | null
  creado_en: string
  // null si la tarea está sin asignar
  responsable: ResponsableTarea | null
}

// Campos que se pueden cambiar de una tarea; basta con enviar los que cambian
export type CambiosTarea = {
  texto?: string
  // null deja la tarea sin asignar
  responsable_id?: string | null
  hecha?: boolean
}

export const MAX_TEXTO_TAREA = 200

const rutaTareas = (viajeId: string) => `/viajes/${encodeURIComponent(viajeId)}/tareas`

// Tareas del viaje, de la más antigua a la más reciente
export const listarTareas = (viajeId: string, tokenSesion: string) =>
  peticion<{ tareas: Tarea[] }>(rutaTareas(viajeId), { token: tokenSesion })

// Cualquier miembro añade tareas mientras el viaje está activo; con responsable_id null se crea sin asignar
export const crearTarea = (viajeId: string, tarea: { texto: string; responsable_id: string | null }, tokenSesion: string) =>
  peticion<Tarea>(rutaTareas(viajeId), { metodo: "POST", cuerpo: tarea, token: tokenSesion })

// Edita el texto o el responsable de una tarea, o la marca (hecha: true) y desmarca (hecha: false)
export const editarTarea = (viajeId: string, tareaId: string, cambios: CambiosTarea, tokenSesion: string) =>
  peticion<Tarea>(`${rutaTareas(viajeId)}/${encodeURIComponent(tareaId)}`, {
    metodo: "PATCH",
    cuerpo: cambios,
    token: tokenSesion,
  })

// Borra la tarea para todos los miembros. Responde 204 sin cuerpo
export const borrarTarea = (viajeId: string, tareaId: string, tokenSesion: string) =>
  peticion<null>(`${rutaTareas(viajeId)}/${encodeURIComponent(tareaId)}`, {
    metodo: "DELETE",
    token: tokenSesion,
  })
