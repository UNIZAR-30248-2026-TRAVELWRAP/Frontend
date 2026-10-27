import { peticion } from "./authApi"

export type TipoVotacion = "fecha" | "destino" | "presupuesto" | "actividad" | "otro"
export type EstadoVotacion = "abierta" | "cerrada"

export type OpcionDeVotacion = {
  id: string
  texto: string
  // Solo en las votaciones de fechas
  valor_fecha: string | null
  orden: number
  votos: number
  // Usuarios que han votado esta opción
  votantes: string[]
}

export type Votacion = {
  id: string
  titulo: string
  descripcion: string | null
  tipo: TipoVotacion
  estado: EstadoVotacion
  // Se guarda al cerrar (null si se cerró sin votos)
  opcion_ganadora_id: string | null
  creado_por: string | null
  creado_en: string
  cerrada_en: string | null
  opciones: OpcionDeVotacion[]
  total_votos: number
  // Miembros activos del viaje, es decir, cuántos pueden votar
  total_miembros: number
  // Ya han votado todos los miembros activos: solo entonces el creador puede cerrarla (RF9)
  todos_han_votado: boolean
  // Opción que ha votado el usuario, o null si no ha votado
  mi_voto: string | null
}

export type NuevaOpcion = { texto: string; valor_fecha?: string | null }

// Las de destino no se crean a mano: se abren al crear un viaje sin destino
export type NuevaVotacion = {
  titulo: string
  descripcion?: string | null
  tipo?: Exclude<TipoVotacion, "destino">
  opciones: NuevaOpcion[]
}

export type CierreVotacion = {
  votacion: Votacion
  // true si había empate y la ganadora se eligió al azar
  hubo_empate: boolean
  // Destino guardado en el viaje, al cerrar la votación de destino
  destino: string | null
}

const rutaVotaciones = (viajeId: string) => `/viajes/${encodeURIComponent(viajeId)}/votaciones`
const rutaVotacion = (viajeId: string, votacionId: string) =>
  `${rutaVotaciones(viajeId)}/${encodeURIComponent(votacionId)}`

export const listarVotaciones = (
  viajeId: string,
  tokenSesion: string,
  filtros: { estado?: EstadoVotacion; tipo?: TipoVotacion } = {},
) => {
  const parametros = new URLSearchParams()
  if (filtros.estado) parametros.set("estado", filtros.estado)
  if (filtros.tipo) parametros.set("tipo", filtros.tipo)
  const consulta = parametros.toString()
  return peticion<{ votaciones: Votacion[] }>(`${rutaVotaciones(viajeId)}${consulta ? `?${consulta}` : ""}`, {
    token: tokenSesion,
  })
}

export const obtenerVotacion = (viajeId: string, votacionId: string, tokenSesion: string) =>
  peticion<Votacion>(rutaVotacion(viajeId, votacionId), { token: tokenSesion })

export const crearVotacion = (viajeId: string, votacion: NuevaVotacion, tokenSesion: string) =>
  peticion<Votacion>(rutaVotaciones(viajeId), { metodo: "POST", cuerpo: votacion, token: tokenSesion })

// Cualquier miembro propone opciones mientras la votación está abierta. Devuelve la votación actualizada
export const proponerOpcion = (viajeId: string, votacionId: string, opcion: NuevaOpcion, tokenSesion: string) =>
  peticion<Votacion>(`${rutaVotacion(viajeId, votacionId)}/opciones`, {
    metodo: "POST",
    cuerpo: opcion,
    token: tokenSesion,
  })

// Emite el voto o lo cambia si ya había votado. Devuelve la votación con el recuento actualizado
export const votar = (viajeId: string, votacionId: string, opcionId: string, tokenSesion: string) =>
  peticion<Votacion>(`${rutaVotacion(viajeId, votacionId)}/voto`, {
    metodo: "PUT",
    cuerpo: { opcion_id: opcionId },
    token: tokenSesion,
  })

export const retirarVoto = (viajeId: string, votacionId: string, tokenSesion: string) =>
  peticion<Votacion>(`${rutaVotacion(viajeId, votacionId)}/voto`, { metodo: "DELETE", token: tokenSesion })

// Solo el creador del viaje y cuando han votado todos los miembros (RF9). Gana la más votada (con empate, una al
// azar); la de destino lo fija en el viaje
export const cerrarVotacion = (viajeId: string, votacionId: string, tokenSesion: string) =>
  peticion<CierreVotacion>(`${rutaVotacion(viajeId, votacionId)}/cerrar`, { metodo: "POST", token: tokenSesion })
