export type ActividadOrdenable = {
  id: string
  fecha: string
  hora_inicio: string | null
  orden: number
  creado_en: string
}

export type SegmentoDeAgenda<T> = {
  clave: string
  actividades: T[]
}

export const claveDeHora = (actividad: Pick<ActividadOrdenable, "hora_inicio">) =>
  actividad.hora_inicio ? actividad.hora_inicio.slice(0, 5) : ""

const compararPorAgenda = (a: ActividadOrdenable, b: ActividadOrdenable) => {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1
  const horaA = claveDeHora(a)
  const horaB = claveDeHora(b)
  if (horaA !== horaB) {
    if (horaA === "") return 1
    if (horaB === "") return -1
    return horaA < horaB ? -1 : 1
  }
  if (a.orden !== b.orden) return a.orden - b.orden
  if (a.creado_en !== b.creado_en) return a.creado_en < b.creado_en ? -1 : 1
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

export const ordenarAgenda = <T extends ActividadOrdenable>(actividades: T[]) =>
  [...actividades].sort(compararPorAgenda)

export const segmentosPorHora = <T extends ActividadOrdenable>(delDia: T[]) => {
  const segmentos: SegmentoDeAgenda<T>[] = []
  for (const actividad of delDia) {
    const clave = claveDeHora(actividad)
    const ultimo = segmentos[segmentos.length - 1]
    if (ultimo && ultimo.clave === clave) ultimo.actividades.push(actividad)
    else segmentos.push({ clave, actividades: [actividad] })
  }
  return segmentos
}

export const puedeReordenarse = <T extends ActividadOrdenable>(delDia: T[], id: string) => {
  const actividad = delDia.find((candidata) => candidata.id === id)
  if (!actividad) return false
  const clave = claveDeHora(actividad)
  return delDia.filter((candidata) => claveDeHora(candidata) === clave).length > 1
}

export const moverEnGrupo = <T extends ActividadOrdenable>(
  actividades: T[],
  fecha: string,
  idMovida: string,
  idDestino: string,
) => {
  if (idMovida === idDestino) return null
  const delDia = ordenarAgenda(actividades.filter((actividad) => actividad.fecha === fecha))
  const movida = delDia.find((actividad) => actividad.id === idMovida)
  const destino = delDia.find((actividad) => actividad.id === idDestino)
  if (!movida || !destino) return null
  const clave = claveDeHora(movida)
  if (claveDeHora(destino) !== clave) return null

  const grupo = delDia.filter((actividad) => claveDeHora(actividad) === clave)
  const desde = grupo.findIndex((actividad) => actividad.id === idMovida)
  const hasta = grupo.findIndex((actividad) => actividad.id === idDestino)
  const nuevoGrupo = [...grupo]
  nuevoGrupo.splice(desde, 1)
  nuevoGrupo.splice(hasta, 0, movida)

  let siguiente = 0
  const nuevoDia = delDia.map((actividad) =>
    claveDeHora(actividad) === clave ? nuevoGrupo[siguiente++] : actividad,
  )
  const ordenNuevo = new Map(nuevoDia.map((actividad, indice) => [actividad.id, indice]))

  return {
    actividades: actividades.map((actividad) =>
      ordenNuevo.has(actividad.id) ? { ...actividad, orden: ordenNuevo.get(actividad.id) as number } : actividad,
    ),
    grupo: nuevoGrupo.map((actividad) => actividad.id),
  }
}
