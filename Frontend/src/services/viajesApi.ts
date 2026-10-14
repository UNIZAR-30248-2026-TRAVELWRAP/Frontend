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
