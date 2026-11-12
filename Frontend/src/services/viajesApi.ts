import { peticion } from "./authApi"

// Solo lo cambia el creador al finalizar: un viaje finalizado no vuelve a activo. Archivar es personal (ver archivado)
export type EstadoViaje = "activo" | "finalizado"

export type MiembroDelViaje = {
  usuario_id: string
  nombre: string | null
  avatar_url: string | null
  rol: "creador" | "miembro"
}

export type Viaje = {
  id: string
  nombre: string
  // null mientras el destino está pendiente de votación
  destino: string | null
  descripcion: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  moneda: string
  presupuesto: number
  estado: EstadoViaje
  creado_en: string
  // true si el viaje está activo y aún no tiene destino
  pendiente_destino: boolean
}

export type ViajeDelUsuario = Viaje & {
  rol: "creador" | "miembro"
  // true si el usuario lo ha archivado: es personal, los demás miembros lo ven por separado
  archivado: boolean
  miembros: MiembroDelViaje[]
}

export type NuevoViaje = {
  // null: el backend le pone el nombre por defecto (destino y año) y lo actualiza al fijar el destino
  nombre: string | null
  presupuesto: number
  destino: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
}

// Por defecto, los viajes que el usuario no ha archivado; con archivados: true, solo los que ha archivado
export type OpcionesListarViajes = { estado?: EstadoViaje; archivados?: boolean }

export const listarViajes = (tokenSesion: string, opciones: OpcionesListarViajes = {}) => {
  const parametros = new URLSearchParams()
  if (opciones.estado) parametros.set("estado", opciones.estado)
  if (opciones.archivados !== undefined) parametros.set("archivados", String(opciones.archivados))
  const consulta = parametros.toString()
  return peticion<{ viajes: ViajeDelUsuario[] }>(`/viajes${consulta ? `?${consulta}` : ""}`, {
    token: tokenSesion,
  })
}

export const obtenerViaje = (viajeId: string, tokenSesion: string) =>
  peticion<ViajeDelUsuario>(`/viajes/${encodeURIComponent(viajeId)}`, { token: tokenSesion })

export const crearViaje = (viaje: NuevoViaje, tokenSesion: string) =>
  peticion<Viaje>("/viajes", { metodo: "POST", cuerpo: viaje, token: tokenSesion })

// Solo se envían los campos que cambian. El destino se puede cambiar, pero no quitar
export type CambiosViaje = Partial<{
  nombre: string
  presupuesto: number
  destino: string
  fecha_inicio: string | null
  fecha_fin: string | null
}>

// Solo el creador puede editar el viaje, y solo mientras está activo
export const editarViaje = (viajeId: string, cambios: CambiosViaje, tokenSesion: string) =>
  peticion<ViajeDelUsuario>(`/viajes/${encodeURIComponent(viajeId)}`, {
    metodo: "PATCH",
    cuerpo: cambios,
    token: tokenSesion,
  })

// Finaliza el viaje: queda de solo lectura en «Viajes anteriores» (solo el creador, solo desde activo)
export const finalizarViaje = (viajeId: string, tokenSesion: string) =>
  peticion<ViajeDelUsuario>(`/viajes/${encodeURIComponent(viajeId)}/finalizar`, {
    metodo: "POST",
    token: tokenSesion,
  })

// Archiva el viaje solo para el usuario: pasa a su «Viajes archivados» (cualquier miembro, con el viaje finalizado)
export const archivarViaje = (viajeId: string, tokenSesion: string) =>
  peticion<ViajeDelUsuario>(`/viajes/${encodeURIComponent(viajeId)}/archivar`, {
    metodo: "POST",
    token: tokenSesion,
  })

// Desarchiva el viaje solo para el usuario: vuelve a sus «Viajes anteriores» (sigue finalizado)
export const desarchivarViaje = (viajeId: string, tokenSesion: string) =>
  peticion<ViajeDelUsuario>(`/viajes/${encodeURIComponent(viajeId)}/desarchivar`, {
    metodo: "POST",
    token: tokenSesion,
  })

// Elimina el viaje solo para el usuario, que debe tenerlo archivado (el último miembro lo borra de verdad).
// Responde 204 sin cuerpo
export const eliminarViaje = (viajeId: string, tokenSesion: string) =>
  peticion<null>(`/viajes/${encodeURIComponent(viajeId)}`, { metodo: "DELETE", token: tokenSesion })
