// Comprobaciones de los datos que se guardan en el navegador (localStorage). Lo que llega del servidor no se
// guarda tal cual: se copia campo a campo, solo con los campos esperados y si cada uno tiene el tipo y el formato
// que corresponde. Así un dato inesperado no acaba en el almacenamiento ni se vuelve a leer después.
// Cada función devuelve el valor comprobado o lanza DatoNoValido.

export class DatoNoValido extends Error {
  constructor() {
    super("Dato no válido para guardarlo en el navegador")
  }
}

// Identificadores: uuid o, en las pruebas, nombres cortos como «roma»
const IDENTIFICADOR = /^[\w-]{1,64}$/
// Tokens de sesión (JWT o el token de refresco de Supabase)
const TOKEN = /^[\w.~+/=-]{1,4096}$/
const FECHA = /^\d{4}-\d{2}-\d{2}$/
// Fecha y hora ISO 8601, con o sin fracciones de segundo y zona horaria (2026-10-06T15:29:32.123456+00:00)
const FECHA_HORA = /^\d{4}-\d{2}-\d{2}[T ][\d:.]{5,18}(Z|[+-][\d:]{2,5})?$/
const HORA = /^\d{2}:\d{2}(:\d{2})?$/
const URL_IMAGEN = /^https?:\/\/[^\s"'<>]{1,2048}$/
const EMAIL = /^[^\s@]{1,254}@[^\s@]{1,254}$/
const MAX_TEXTO = 5000

const exigir = (valido: boolean) => {
  if (!valido) throw new DatoNoValido()
}

const conFormato = (formato: RegExp) => (valor: unknown): string => {
  if (typeof valor !== "string" || !formato.test(valor)) throw new DatoNoValido()
  return valor
}

export const identificador = conFormato(IDENTIFICADOR)
export const token = conFormato(TOKEN)
export const fecha = conFormato(FECHA)
export const fechaHora = conFormato(FECHA_HORA)
export const hora = conFormato(HORA)
export const urlImagen = conFormato(URL_IMAGEN)
export const email = conFormato(EMAIL)

export const texto = (valor: unknown): string => {
  if (typeof valor !== "string" || valor.length > MAX_TEXTO) throw new DatoNoValido()
  return valor
}

export const numero = (valor: unknown): number => {
  if (typeof valor !== "number" || !Number.isFinite(valor)) throw new DatoNoValido()
  return valor
}

// Columnas numeric de PostgreSQL (presupuesto, coordenadas): pueden llegar como número o como texto
const DECIMAL = /^-?\d{1,15}(\.\d{1,9})?$/
export const cantidad = (valor: unknown): number => {
  if (typeof valor === "string") {
    exigir(DECIMAL.test(valor))
    return Number(valor)
  }
  return numero(valor)
}

export const booleano = (valor: unknown): boolean => {
  if (typeof valor !== "boolean") throw new DatoNoValido()
  return valor
}

// Uno de los valores permitidos. Devuelve el de la lista, no el recibido
export const unoDe =
  <T extends string>(permitidos: readonly T[]) =>
  (valor: unknown): T => {
    const encontrado = permitidos.find((permitido) => permitido === valor)
    exigir(encontrado !== undefined)
    return encontrado as T
  }

// null o ausente se guarda como null; cualquier otro valor tiene que pasar la comprobación
export const opcional =
  <T>(comprobar: (valor: unknown) => T) =>
  (valor: unknown): T | null =>
    valor === null || valor === undefined ? null : comprobar(valor)

export const lista =
  <T>(comprobar: (valor: unknown) => T) =>
  (valor: unknown): T[] => {
    exigir(Array.isArray(valor))
    return (valor as unknown[]).map(comprobar)
  }

export const objeto = (valor: unknown): Record<string, unknown> => {
  exigir(typeof valor === "object" && valor !== null && !Array.isArray(valor))
  return valor as Record<string, unknown>
}

// Copia comprobada del valor, o null si algo no cumple el formato esperado
export const copiaValida = <T>(comprobar: () => T): T | null => {
  try {
    return comprobar()
  } catch (e) {
    if (e instanceof DatoNoValido) return null
    throw e
  }
}
