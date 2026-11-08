import { CATEGORIAS, type Actividad } from "./actividadesApi"
import type { MiembroDelViaje, ViajeDelUsuario } from "./viajesApi"
import {
  booleano,
  cantidad,
  copiaValida,
  fecha,
  fechaHora,
  hora,
  identificador,
  lista,
  numero,
  objeto,
  opcional,
  texto,
  unoDe,
  urlImagen,
} from "../utils/datosGuardados"

const PREFIJO = "travelwrap.itinerario."

export type ItinerarioGuardado = {
  viaje: ViajeDelUsuario
  actividades: Actividad[]
  guardadoEn: string
}

const ROLES = ["creador", "miembro"] as const
const ESTADOS = ["activo", "finalizado", "archivado"] as const
const VALORES_CATEGORIA = CATEGORIAS.map((c) => c.valor)

const miembroValido = (valor: unknown): MiembroDelViaje => {
  const miembro = objeto(valor)
  return {
    usuario_id: identificador(miembro.usuario_id),
    nombre: opcional(texto)(miembro.nombre),
    avatar_url: opcional(urlImagen)(miembro.avatar_url),
    rol: unoDe(ROLES)(miembro.rol),
  }
}

const viajeValido = (valor: unknown): ViajeDelUsuario => {
  const viaje = objeto(valor)
  return {
    id: identificador(viaje.id),
    nombre: texto(viaje.nombre),
    destino: opcional(texto)(viaje.destino),
    descripcion: opcional(texto)(viaje.descripcion),
    fecha_inicio: opcional(fecha)(viaje.fecha_inicio),
    fecha_fin: opcional(fecha)(viaje.fecha_fin),
    moneda: texto(viaje.moneda),
    presupuesto: cantidad(viaje.presupuesto),
    estado: unoDe(ESTADOS)(viaje.estado),
    creado_en: fechaHora(viaje.creado_en),
    pendiente_destino: booleano(viaje.pendiente_destino),
    rol: unoDe(ROLES)(viaje.rol),
    miembros: lista(miembroValido)(viaje.miembros),
  }
}

const actividadValida = (valor: unknown): Actividad => {
  const actividad = objeto(valor)
  return {
    id: identificador(actividad.id),
    viaje_id: identificador(actividad.viaje_id),
    titulo: texto(actividad.titulo),
    descripcion: opcional(texto)(actividad.descripcion),
    fecha: fecha(actividad.fecha),
    hora_inicio: opcional(hora)(actividad.hora_inicio),
    hora_fin: opcional(hora)(actividad.hora_fin),
    orden: numero(actividad.orden),
    ubicacion_nombre: opcional(texto)(actividad.ubicacion_nombre),
    latitud: opcional(cantidad)(actividad.latitud),
    longitud: opcional(cantidad)(actividad.longitud),
    lugar_externo_id: opcional(texto)(actividad.lugar_externo_id),
    categoria: opcional(unoDe(VALORES_CATEGORIA))(actividad.categoria),
    creado_por: opcional(identificador)(actividad.creado_por),
    creado_en: fechaHora(actividad.creado_en),
    actualizado_en: fechaHora(actividad.actualizado_en),
  }
}

// Copia del itinerario con solo los campos esperados, cada uno con su formato. null si algo no encaja
const itinerarioValido = (valor: unknown): ItinerarioGuardado | null =>
  copiaValida(() => {
    const itinerario = objeto(valor)
    return {
      viaje: viajeValido(itinerario.viaje),
      actividades: lista(actividadValida)(itinerario.actividades),
      guardadoEn: fechaHora(itinerario.guardadoEn),
    }
  })

// Clave del itinerario de un viaje, o null si el identificador no es válido
const claveDe = (viajeId: string) => copiaValida(() => PREFIJO + identificador(viajeId))

// Un itinerario con un formato inesperado no se guarda: sin conexión se verá el aviso de error en su lugar
export const guardarItinerario = (viajeId: string, itinerario: ItinerarioGuardado) => {
  const clave = claveDe(viajeId)
  const valido = itinerarioValido(itinerario)
  if (!clave || !valido) return
  try {
    localStorage.setItem(clave, JSON.stringify(valido))
  } catch {
    return
  }
}

export const leerItinerario = (viajeId: string): ItinerarioGuardado | null => {
  const clave = claveDe(viajeId)
  if (!clave) return null
  try {
    const valor = localStorage.getItem(clave)
    return valor ? itinerarioValido(JSON.parse(valor)) : null
  } catch {
    return null
  }
}

export const borrarItinerarios = () => {
  try {
    Object.keys(localStorage)
      .filter((clave) => clave.startsWith(PREFIJO))
      .forEach((clave) => localStorage.removeItem(clave))
  } catch {
    return
  }
}
