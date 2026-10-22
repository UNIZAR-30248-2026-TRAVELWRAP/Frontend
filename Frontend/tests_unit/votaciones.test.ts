import { describe, expect, it } from 'vitest'
import { conPorcentajes, elegirAlAzar, enumerar, opcionesGanadoras } from '../src/utils/votaciones'

const opciones = (votos: number[]) => votos.map((v, i) => ({ id: `o${i}`, texto: `Opción ${i}`, votos: v }))

describe('utilidades de votaciones', () => {
  it('calcula el porcentaje de cada opción sobre los votos emitidos', () => {
    expect(conPorcentajes(opciones([2, 1, 0])).map((o) => o.porcentaje)).toEqual([67, 33, 0])
    expect(conPorcentajes(opciones([0, 0])).map((o) => o.porcentaje)).toEqual([0, 0])
  })

  it('la ganadora es la más votada, y sin votos no hay ninguna', () => {
    expect(opcionesGanadoras(opciones([1, 3, 2])).map((o) => o.id)).toEqual(['o1'])
    expect(opcionesGanadoras(opciones([0, 0]))).toEqual([])
  })

  it('si hay empate devuelve todas las empatadas y se elige una al azar entre ellas', () => {
    const empatadas = opcionesGanadoras(opciones([2, 2, 1]))
    expect(empatadas.map((o) => o.id)).toEqual(['o0', 'o1'])
    expect(elegirAlAzar(empatadas, () => 0).id).toBe('o0')
    expect(elegirAlAzar(empatadas, () => 0.99).id).toBe('o1')
  })

  it('enumera las opciones empatadas para el aviso', () => {
    expect(enumerar(['Lisboa'])).toBe('Lisboa')
    expect(enumerar(['Lisboa', 'Praga', 'Roma'])).toBe('Lisboa, Praga y Roma')
  })
})
