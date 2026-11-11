export const listaDeNombres = (nombres: string[]) => {
  if (nombres.length <= 1) return nombres.join("")
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`
}

export const textoDeDias = (dias: number) => (dias === 1 ? "día de aventura" : "días de aventura")

export const textoDeVotos = (votos: number) => `${votos} ${votos === 1 ? "voto" : "votos"}`

export type Transferencia = { de: string; a: string; importe: number }

export const calcularTransferencias = (saldos: { nombre: string | null; saldo: number }[]): Transferencia[] => {
  const nombre = (saldo: { nombre: string | null }) => saldo.nombre ?? "Antiguo miembro"
  const deudores = saldos
    .map((s) => ({ nombre: nombre(s), centimos: Math.round(-s.saldo * 100) }))
    .filter((s) => s.centimos > 0)
    .sort((x, y) => y.centimos - x.centimos)
  const acreedores = saldos
    .map((s) => ({ nombre: nombre(s), centimos: Math.round(s.saldo * 100) }))
    .filter((s) => s.centimos > 0)
    .sort((x, y) => y.centimos - x.centimos)

  const transferencias: Transferencia[] = []
  let i = 0
  let j = 0
  while (i < deudores.length && j < acreedores.length) {
    const centimos = Math.min(deudores[i].centimos, acreedores[j].centimos)
    transferencias.push({ de: deudores[i].nombre, a: acreedores[j].nombre, importe: centimos / 100 })
    deudores[i].centimos -= centimos
    acreedores[j].centimos -= centimos
    if (deudores[i].centimos === 0) i += 1
    if (acreedores[j].centimos === 0) j += 1
  }
  return transferencias
}
