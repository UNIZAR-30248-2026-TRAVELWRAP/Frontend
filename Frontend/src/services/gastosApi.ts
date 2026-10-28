import { peticion } from "./authApi"

export type CategoriaGasto = "comida" | "transporte" | "entradas" | "alojamiento" | "ocio" | "otros"

// Parte del gasto que le corresponde a un miembro
export type RepartoGasto = {
  usuario_id: string
  importe: number
}

export type Gasto = {
  id: string
  viaje_id: string
  concepto: string
  importe: number
  categoria: CategoriaGasto
  pagado_por: string
  fecha: string
  // null si la cuenta de quien lo registró se ha eliminado
  creado_por: string | null
  creado_en: string
  actualizado_en: string
  // Las partes siempre suman el importe del gasto
  repartos: RepartoGasto[]
}

// Sin categoría se guarda «otros» y sin fecha, la de hoy
export type NuevoGasto = {
  concepto: string
  importe: number
  categoria?: CategoriaGasto | null
  pagado_por: string
  fecha?: string | null
  // Miembros entre los que se divide a partes iguales, sin repetir
  participantes: string[]
}

const rutaGastos = (viajeId: string) => `/viajes/${encodeURIComponent(viajeId)}/gastos`

// Registra el gasto y su reparto a partes iguales. Devuelve el gasto con la parte de cada participante
export const crearGasto = (viajeId: string, gasto: NuevoGasto, tokenSesion: string) =>
  peticion<Gasto>(rutaGastos(viajeId), { metodo: "POST", cuerpo: gasto, token: tokenSesion })
