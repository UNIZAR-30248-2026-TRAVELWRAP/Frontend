// Cálculos de las votaciones, compartidos por «Votaciones» y «Elegir destino»

export type OpcionConVotos = {
  id: string
  texto: string
  votos: number
}

// Porcentaje de cada opción sobre el total de votos emitidos
export const conPorcentajes = <T extends OpcionConVotos>(opciones: T[]) => {
  const total = opciones.reduce((suma, o) => suma + o.votos, 0)
  return opciones.map((o) => ({ ...o, porcentaje: total === 0 ? 0 : Math.round((o.votos / total) * 100) }))
}

// Opciones con más votos. Más de una significa empate; ninguna, que aún no hay votos
export const opcionesGanadoras = <T extends OpcionConVotos>(opciones: T[]) => {
  const maximo = Math.max(0, ...opciones.map((o) => o.votos))
  return maximo === 0 ? [] : opciones.filter((o) => o.votos === maximo)
}

// ["Lisboa", "Praga", "Roma"] → "Lisboa, Praga y Roma"
export const enumerar = (textos: string[]) =>
  textos.length <= 1 ? (textos[0] ?? "") : `${textos.slice(0, -1).join(", ")} y ${textos[textos.length - 1]}`
