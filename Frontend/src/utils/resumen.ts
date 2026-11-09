export const listaDeNombres = (nombres: string[]) => {
  if (nombres.length <= 1) return nombres.join("")
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`
}

export const textoDeDias = (dias: number) => (dias === 1 ? "día de aventura" : "días de aventura")

export const textoDeVotos = (votos: number) => `${votos} ${votos === 1 ? "voto" : "votos"}`
