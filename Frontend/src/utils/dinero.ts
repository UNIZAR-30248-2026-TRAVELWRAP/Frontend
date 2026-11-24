// Importes en formato español: miles con punto, decimales con coma. Los céntimos solo aparecen si los hay:
// 850 → "850 €", 42,5 → "42,50 €", 1234567.8 → "1.234.567,80 €". Se calcula en céntimos para no arrastrar errores
// de coma flotante
export const formatearDinero = (cantidad: number, simbolo = "€") => {
  const centimos = Math.round(Math.abs(cantidad) * 100)
  const enteros = Math.floor(centimos / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  const decimales = centimos % 100
  const negativo = cantidad < 0 && centimos > 0 ? "-" : ""
  return `${negativo}${decimales ? `${enteros},${String(decimales).padStart(2, "0")}` : enteros} ${simbolo}`
}
