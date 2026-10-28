// Test unitario de las funciones de reparto de gastos
import { describe, expect, it } from 'vitest'
import { conEuros, leerImporte, repartirAPartesIguales } from '../src/utils/gastos'

describe('leerImporte', () => {
  it.each([
    ['10', 10],
    ['12,5', 12.5],
    ['12.50', 12.5],
    ['  0,01 ', 0.01],
    ['9999999999,99', 9999999999.99],
  ])('lee "%s" como %d', (texto, importe) => {
    expect(leerImporte(texto)).toBe(importe)
  })

  it.each(['', '0', '0,00', '-5', '10,123', '1.000,50', 'diez', '12,', '99999999999'])(
    'rechaza "%s"',
    (texto) => {
      expect(leerImporte(texto)).toBeNull()
    },
  )
})

describe('repartirAPartesIguales', () => {
  it('reparte a partes iguales cuando la división es exacta', () => {
    expect(repartirAPartesIguales(60, 3)).toEqual([20, 20, 20])
  })

  it('da los céntimos que sobran, uno a uno, a los primeros participantes', () => {
    expect(repartirAPartesIguales(10, 3)).toEqual([3.34, 3.33, 3.33])
    expect(repartirAPartesIguales(0.05, 3)).toEqual([0.02, 0.02, 0.01])
  })

  it('las partes siempre suman el importe', () => {
    for (const [importe, personas] of [[10, 3], [100, 7], [0.01, 4], [12.34, 5]]) {
      const suma = repartirAPartesIguales(importe, personas).reduce((total, parte) => total + Math.round(parte * 100), 0)
      expect(suma).toBe(Math.round(importe * 100))
    }
  })

  it('con un solo participante le toca todo', () => {
    expect(repartirAPartesIguales(12.5, 1)).toEqual([12.5])
  })
})

describe('conEuros', () => {
  it('muestra dos decimales con coma y el símbolo del euro', () => {
    expect(conEuros(3.5)).toBe('3,50 €')
    expect(conEuros(3.34)).toBe('3,34 €')
  })
})
