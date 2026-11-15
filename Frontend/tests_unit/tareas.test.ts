import { describe, expect, it } from 'vitest'
import { progresoDeTareas } from '../src/utils/tareas'

describe('progresoDeTareas', () => {
  it('sin tareas todo es 0 y el porcentaje no es NaN', () => {
    expect(progresoDeTareas([])).toEqual({ hechas: 0, total: 0, pendientes: 0, porcentaje: 0 })
  })

  it('cuenta las hechas, las pendientes y el porcentaje', () => {
    const progreso = progresoDeTareas([{ hecha: true }, { hecha: false }, { hecha: false }, { hecha: true }])
    expect(progreso).toEqual({ hechas: 2, total: 4, pendientes: 2, porcentaje: 50 })
  })

  it('redondea el porcentaje al entero más cercano', () => {
    expect(progresoDeTareas([{ hecha: true }, { hecha: false }, { hecha: false }]).porcentaje).toBe(33)
    expect(progresoDeTareas([{ hecha: true }, { hecha: true }, { hecha: false }]).porcentaje).toBe(67)
  })

  it('con todas hechas es el 100 % y no queda ninguna pendiente', () => {
    expect(progresoDeTareas([{ hecha: true }, { hecha: true }])).toEqual({ hechas: 2, total: 2, pendientes: 0, porcentaje: 100 })
  })
})
