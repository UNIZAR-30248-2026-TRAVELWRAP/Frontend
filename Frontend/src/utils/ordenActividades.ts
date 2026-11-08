export type ActividadOrdenable = {
  id: string
  fecha: string
  hora_inicio: string | null
  orden: number
  creado_en: string
}

export const claveDeHora = (actividad: Pick<ActividadOrdenable, "hora_inicio">) =>
  actividad.hora_inicio ? actividad.hora_inicio.slice(0, 5) : ""

const textoMenor = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

const ordenValido = (actividad: ActividadOrdenable) => (Number.isFinite(actividad.orden) ? actividad.orden : 0)

const desempate = (a: ActividadOrdenable, b: ActividadOrdenable) =>
  textoMenor(a.creado_en, b.creado_en) || textoMenor(a.id, b.id)

const porHora = (a: ActividadOrdenable, b: ActividadOrdenable) =>
  textoMenor(claveDeHora(a), claveDeHora(b)) || ordenValido(a) - ordenValido(b) || desempate(a, b)

const porOrden = (a: ActividadOrdenable, b: ActividadOrdenable) => ordenValido(a) - ordenValido(b) || desempate(a, b)

const posicionColocada = (actividad: ActividadOrdenable) => -ordenValido(actividad) - 1

const porPosicionColocada = (a: ActividadOrdenable, b: ActividadOrdenable) =>
  posicionColocada(a) - posicionColocada(b) || desempate(a, b)

export const ordenarDia = <T extends ActividadOrdenable>(delDia: T[]) => {
  const conHora = delDia.filter((actividad) => claveDeHora(actividad) !== "").sort(porHora)
  const sinHora = delDia.filter((actividad) => claveDeHora(actividad) === "")
  const colocadas = sinHora.filter((actividad) => ordenValido(actividad) < 0).sort(porPosicionColocada)
  const alFinal = sinHora.filter((actividad) => ordenValido(actividad) >= 0).sort(porOrden)

  const resultado: T[] = [...conHora]
  let ultima = -1
  for (const actividad of colocadas) {
    const posicion = Math.min(Math.max(posicionColocada(actividad), ultima + 1), resultado.length)
    resultado.splice(posicion, 0, actividad)
    ultima = posicion
  }
  return [...resultado, ...alFinal]
}

export const ordenarAgenda = <T extends ActividadOrdenable>(actividades: T[]) => {
  const porDia = new Map<string, T[]>()
  for (const actividad of actividades) {
    const delDia = porDia.get(actividad.fecha)
    if (delDia) delDia.push(actividad)
    else porDia.set(actividad.fecha, [actividad])
  }
  return [...porDia.keys()].sort().flatMap((fecha) => ordenarDia(porDia.get(fecha) as T[]))
}

export const puedeReordenarse = <T extends ActividadOrdenable>(delDia: T[], id: string) => {
  const actividad = delDia.find((candidata) => candidata.id === id)
  if (!actividad) return false
  const clave = claveDeHora(actividad)
  if (clave === "") return delDia.length > 1
  return delDia.filter((candidata) => claveDeHora(candidata) === clave).length > 1
}

export const valoresDeOrden = <T extends ActividadOrdenable>(lista: T[]) => {
  let ultimaConHora = -1
  lista.forEach((actividad, indice) => {
    if (claveDeHora(actividad) !== "") ultimaConHora = indice
  })
  return new Map(
    lista.map((actividad, indice) => [
      actividad.id,
      claveDeHora(actividad) === "" && indice < ultimaConHora ? -(indice + 1) : indice,
    ]),
  )
}

export const horasEnOrden = <T extends ActividadOrdenable>(lista: T[]) => {
  const horas = lista.map(claveDeHora).filter((clave) => clave !== "")
  return horas.every((clave, indice) => indice === 0 || horas[indice - 1] <= clave)
}

export const moverActividad = <T extends ActividadOrdenable>(
  actividades: T[],
  fecha: string,
  idMovida: string,
  idDestino: string,
) => {
  if (idMovida === idDestino) return null
  const delDia = ordenarDia(actividades.filter((actividad) => actividad.fecha === fecha))
  const desde = delDia.findIndex((actividad) => actividad.id === idMovida)
  const hasta = delDia.findIndex((actividad) => actividad.id === idDestino)
  if (desde < 0 || hasta < 0) return null
  const movida = delDia[desde]
  if (claveDeHora(movida) !== "" && claveDeHora(movida) !== claveDeHora(delDia[hasta])) return null

  const nuevoDia = [...delDia]
  nuevoDia.splice(desde, 1)
  nuevoDia.splice(hasta, 0, movida)
  if (!horasEnOrden(nuevoDia)) return null

  const valores = valoresDeOrden(nuevoDia)
  return {
    actividades: actividades.map((actividad) =>
      valores.has(actividad.id) ? { ...actividad, orden: valores.get(actividad.id) as number } : actividad,
    ),
    orden: nuevoDia.map((actividad) => actividad.id),
  }
}
