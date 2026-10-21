import { peticion } from "./authApi"

export type EstadoViaje = "activo" | "finalizado" | "archivado"

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
  miembros: MiembroDelViaje[]
}

export type NuevoViaje = {
  nombre: string
  presupuesto: number
  destino: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
}

export const listarViajes = (tokenSesion: string, estado?: EstadoViaje) =>
  peticion<{ viajes: ViajeDelUsuario[] }>(`/viajes${estado ? `?estado=${estado}` : ""}`, {
    token: tokenSesion,
  })

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

// Cierra el viaje y lo deja archivado, de solo lectura (solo el creador)
export const archivarViaje = (viajeId: string, tokenSesion: string) =>
  peticion<ViajeDelUsuario>(`/viajes/${encodeURIComponent(viajeId)}/archivar`, {
    metodo: "POST",
    token: tokenSesion,
  })

// Solo el creador, y solo viajes archivados. Responde 204 sin cuerpo
export const eliminarViaje = (viajeId: string, tokenSesion: string) =>
  peticion<null>(`/viajes/${encodeURIComponent(viajeId)}`, { metodo: "DELETE", token: tokenSesion })
