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

export type ListaGastos = {
  // Del más reciente al más antiguo
  gastos: Gasto[]
  total: number
}

// Saldo de un miembro, lo que ha pagado menos su parte. Positivo, le deben y negativo, debe
export type SaldoMiembro = {
  usuario_id: string
  // null si ya abandonó el viaje
  nombre: string | null
  pagado: number
  parte: number
  saldo: number
}

export type Balance = {
  // Primero los miembros actuales, en el orden del viaje. Entre todos suman 0
  saldos: SaldoMiembro[]
}

// Un pago para saldar cuentas: quien paga (de) le da importe a quien recibe (a). Los nombres son null si ya abandonaron el viaje
export type Transferencia = {
  de: string
  de_nombre: string | null
  a: string
  a_nombre: string | null
  importe: number
}

export type Liquidacion = {
  // Lista vacía si todos los saldos están a 0
  transferencias: Transferencia[]
}

const rutaGastos = (viajeId: string) => `/viajes/${encodeURIComponent(viajeId)}/gastos`

// Historial de gastos del viaje con el total gastado
export const listarGastos = (viajeId: string, tokenSesion: string) =>
  peticion<ListaGastos>(rutaGastos(viajeId), { token: tokenSesion })

// Saldo de cada miembro del viaje
export const obtenerBalance = (viajeId: string, tokenSesion: string) =>
  peticion<Balance>(`${rutaGastos(viajeId)}/balance`, { token: tokenSesion })

// Transferencias propuestas para saldar las cuentas del viaje
export const obtenerLiquidacion = (viajeId: string, tokenSesion: string) =>
  peticion<Liquidacion>(`${rutaGastos(viajeId)}/liquidacion`, { token: tokenSesion })

// Registra el gasto y su reparto a partes iguales. Devuelve el gasto con la parte de cada participante
export const crearGasto = (viajeId: string, gasto: NuevoGasto, tokenSesion: string) =>
  peticion<Gasto>(rutaGastos(viajeId), { metodo: "POST", cuerpo: gasto, token: tokenSesion })
