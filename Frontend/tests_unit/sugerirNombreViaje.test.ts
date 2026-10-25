import { describe, expect, it } from 'vitest'
import { sugerirNombreViaje } from '../src/utils/formatoViaje'

describe('sugerirNombreViaje', () => {
  it('usa el destino y el año de las fechas', () => {
    expect(sugerirNombreViaje('Roma', '2027-05-12', '2027-05-15')).toBe('Roma 2027')
  })

  it('si el viaje cruza de año, pone los dos años', () => {
    expect(sugerirNombreViaje('Praga', '2027-12-28', '2028-01-03')).toBe('Praga 2027-2028')
  })

  it('con solo una fecha usa su año', () => {
    expect(sugerirNombreViaje('Roma', '2027-05-12', '')).toBe('Roma 2027')
    expect(sugerirNombreViaje('Roma', '', '2028-01-03')).toBe('Roma 2028')
  })

  it('sin fechas deja solo el destino, sin inventar el año', () => {
    expect(sugerirNombreViaje('Roma', '', '')).toBe('Roma')
  })

  it('con la fecha de fin anterior a la de inicio usa solo el año de inicio', () => {
    expect(sugerirNombreViaje('Roma', '2027-05-12', '2026-05-15')).toBe('Roma 2027')
  })

  it('quita los espacios del destino', () => {
    expect(sugerirNombreViaje('  Roma  ', '2027-05-12', '2027-05-15')).toBe('Roma 2027')
  })

  it('sin destino no sugiere nada', () => {
    expect(sugerirNombreViaje('', '2027-05-12', '2027-05-15')).toBe('')
    expect(sugerirNombreViaje('   ', '2027-05-12', '2027-05-15')).toBe('')
  })

  it('recorta el destino para que el nombre no pase de 100 caracteres', () => {
    const nombre = sugerirNombreViaje('a'.repeat(150), '2027-05-12', '2027-05-15')

    expect(nombre).toHaveLength(100)
    expect(nombre.endsWith(' 2027')).toBe(true)
  })

  it('recorta también el destino largo cuando no hay fechas', () => {
    expect(sugerirNombreViaje('a'.repeat(150), '', '')).toHaveLength(100)
  })
})
