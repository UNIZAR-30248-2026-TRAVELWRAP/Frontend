import { describe, expect, it } from 'vitest'
import {
  claveDeHora,
  horasEnOrden,
  moverActividad,
  ordenarAgenda,
  ordenarDia,
  puedeReordenarse,
  valoresDeOrden,
  type ActividadOrdenable,
} from '../src/utils/ordenActividades'

const actividad = (id: string, datos: Partial<ActividadOrdenable> = {}): ActividadOrdenable => ({
  id,
  fecha: '2027-05-12',
  hora_inicio: null,
  orden: 0,
  creado_en: '2026-10-24T10:00:00Z',
  ...datos,
})

const ids = (lista: ActividadOrdenable[]) => lista.map((a) => a.id)

describe('claveDeHora', () => {
  it('recorta los segundos y usa cadena vacía si no hay hora', () => {
    expect(claveDeHora({ hora_inicio: '10:30:00' })).toBe('10:30')
    expect(claveDeHora({ hora_inicio: '10:30' })).toBe('10:30')
    expect(claveDeHora({ hora_inicio: null })).toBe('')
  })
})

describe('ordenarDia · actividades que nadie ha movido', () => {
  it('las que tienen hora van por hora y las que no tienen van al final por su posición', () => {
    const lista = [
      actividad('sinHoraB', { orden: 4 }),
      actividad('tarde', { hora_inicio: '16:00:00', orden: 1 }),
      actividad('sinHoraA', { orden: 3 }),
      actividad('mañana', { hora_inicio: '09:00:00', orden: 2 }),
    ]

    expect(ids(ordenarDia(lista))).toEqual(['mañana', 'tarde', 'sinHoraA', 'sinHoraB'])
  })

  it('una sin hora creada antes que otras con hora sigue yendo al final aunque tenga la posición más baja', () => {
    const lista = [actividad('paseo', { orden: 0 }), actividad('cena', { hora_inicio: '21:00:00', orden: 1 })]

    expect(ids(ordenarDia(lista))).toEqual(['cena', 'paseo'])
  })

  it('las de la misma hora se desempatan por posición, por fecha de creación y por identificador', () => {
    const lista = [
      actividad('c', { hora_inicio: '10:00:00', orden: 1 }),
      actividad('b', { hora_inicio: '10:00:00', orden: 0, creado_en: '2026-10-24T12:00:00Z' }),
      actividad('a', { hora_inicio: '10:00:00', orden: 0, creado_en: '2026-10-24T11:00:00Z' }),
    ]

    expect(ids(ordenarDia(lista))).toEqual(['a', 'b', 'c'])
  })

  it('tolera posiciones no numéricas', () => {
    const lista = [actividad('a', { orden: Number.NaN }), actividad('b', { orden: 1 })]

    expect(ids(ordenarDia(lista))).toEqual(['a', 'b'])
  })

  it('no modifica la lista original', () => {
    const lista = [actividad('b', { orden: 2 }), actividad('a', { orden: 1 })]

    ordenarDia(lista)

    expect(ids(lista)).toEqual(['b', 'a'])
  })
})

describe('ordenarDia · actividades sin hora colocadas por el usuario', () => {
  const desayuno = actividad('desayuno', { hora_inicio: '08:30:00', orden: 0 })
  const comida = actividad('comida', { hora_inicio: '14:00:00', orden: 2 })
  const cena = actividad('cena', { hora_inicio: '21:00:00', orden: 4 })

  it('una sin hora colocada entre dos con hora se queda entre ellas', () => {
    const paseo = actividad('paseo', { orden: -3 })

    expect(ids(ordenarDia([cena, paseo, desayuno, comida]))).toEqual(['desayuno', 'comida', 'paseo', 'cena'])
  })

  it('se puede colocar la primera del día', () => {
    const paseo = actividad('paseo', { orden: -1 })

    expect(ids(ordenarDia([desayuno, comida, paseo]))).toEqual(['paseo', 'desayuno', 'comida'])
  })

  it('varias colocadas respetan sus posiciones y el orden entre ellas', () => {
    const a = actividad('a', { orden: -2 })
    const b = actividad('b', { orden: -4 })

    expect(ids(ordenarDia([desayuno, comida, cena, b, a]))).toEqual(['desayuno', 'a', 'comida', 'b', 'cena'])
  })

  it('dos colocadas en la misma posición no se pisan y mantienen el orden de creación', () => {
    const a = actividad('a', { orden: -2, creado_en: '2026-10-24T10:00:00Z' })
    const b = actividad('b', { orden: -2, creado_en: '2026-10-24T11:00:00Z' })

    expect(ids(ordenarDia([desayuno, comida, b, a]))).toEqual(['desayuno', 'a', 'b', 'comida'])
  })

  it('una posición mayor que el día la deja detrás de las que tienen hora pero delante de las no colocadas', () => {
    const colocada = actividad('colocada', { orden: -50 })
    const alFinal = actividad('alFinal', { orden: 7 })

    expect(ids(ordenarDia([alFinal, colocada, desayuno, comida]))).toEqual([
      'desayuno',
      'comida',
      'colocada',
      'alFinal',
    ])
  })

  it('las no colocadas siempre quedan al final aunque se añada después otra actividad con hora', () => {
    const paseo = actividad('paseo', { orden: 3 })
    const tardia = actividad('tardia', { hora_inicio: '23:00:00', orden: 4 })

    expect(ids(ordenarDia([desayuno, paseo, tardia]))).toEqual(['desayuno', 'tardia', 'paseo'])
  })
})

describe('ordenarAgenda', () => {
  it('ordena los días por fecha y cada día con su regla', () => {
    const lista = [
      actividad('martesSin', { fecha: '2027-05-13', orden: 0 }),
      actividad('lunesCena', { hora_inicio: '21:00:00', orden: 1 }),
      actividad('martesDesayuno', { fecha: '2027-05-13', hora_inicio: '08:00:00', orden: 1 }),
      actividad('lunesSin', { orden: 0 }),
    ]

    expect(ids(ordenarAgenda(lista))).toEqual(['lunesCena', 'lunesSin', 'martesDesayuno', 'martesSin'])
  })

  it('con una lista vacía devuelve una lista vacía', () => {
    expect(ordenarAgenda([])).toEqual([])
  })
})

describe('puedeReordenarse', () => {
  const delDia = [
    actividad('desayuno', { hora_inicio: '08:30:00' }),
    actividad('museoA', { hora_inicio: '10:00:00' }),
    actividad('museoB', { hora_inicio: '10:00:00' }),
    actividad('paseo'),
    actividad('cena', { hora_inicio: '21:00:00' }),
  ]

  it('una actividad sin hora se puede mover aunque sea la única sin hora', () => {
    expect(puedeReordenarse(delDia, 'paseo')).toBe(true)
  })

  it('las que empiezan a la misma hora se pueden mover entre sí', () => {
    expect(puedeReordenarse(delDia, 'museoA')).toBe(true)
    expect(puedeReordenarse(delDia, 'museoB')).toBe(true)
  })

  it('una con una hora que no comparte nadie no se puede mover', () => {
    expect(puedeReordenarse(delDia, 'desayuno')).toBe(false)
    expect(puedeReordenarse(delDia, 'cena')).toBe(false)
  })


  it('un identificador desconocido no se puede mover', () => {
    expect(puedeReordenarse(delDia, 'fantasma')).toBe(false)
  })
})

describe('horasEnOrden', () => {
  it('acepta horas crecientes o repetidas y no tiene en cuenta las que no tienen hora', () => {
    expect(
      horasEnOrden([
        actividad('a', { hora_inicio: '08:00:00' }),
        actividad('b'),
        actividad('c', { hora_inicio: '08:00:00' }),
        actividad('d', { hora_inicio: '09:00:00' }),
      ]),
    ).toBe(true)
  })

  it('rechaza una hora anterior a la que ya había', () => {
    expect(
      horasEnOrden([actividad('a', { hora_inicio: '09:00:00' }), actividad('b', { hora_inicio: '08:00:00' })]),
    ).toBe(false)
  })
})

describe('valoresDeOrden', () => {
  it('las de hora y las sin hora del final guardan su posición y las sin hora intercaladas, una posición negativa', () => {
    const lista = [
      actividad('desayuno', { hora_inicio: '08:30:00' }),
      actividad('paseo'),
      actividad('cena', { hora_inicio: '21:00:00' }),
      actividad('fotos'),
      actividad('compras'),
    ]

    expect(Object.fromEntries(valoresDeOrden(lista))).toEqual({
      desayuno: 0,
      paseo: -2,
      cena: 2,
      fotos: 3,
      compras: 4,
    })
  })

  it('un día sin actividades con hora deja todas las posiciones normales', () => {
    expect(Object.fromEntries(valoresDeOrden([actividad('a'), actividad('b')]))).toEqual({ a: 0, b: 1 })
  })

  it('una sin hora colocada la primera guarda -1', () => {
    expect(
      Object.fromEntries(valoresDeOrden([actividad('a'), actividad('b', { hora_inicio: '10:00:00' })])),
    ).toEqual({ a: -1, b: 1 })
  })

})

describe('moverActividad', () => {
  const base = [
    actividad('desayuno', { hora_inicio: '08:30:00', orden: 0 }),
    actividad('comida', { hora_inicio: '14:00:00', orden: 1 }),
    actividad('cena', { hora_inicio: '21:00:00', orden: 2 }),
    actividad('paseo', { orden: 3 }),
    actividad('compras', { orden: 4 }),
    actividad('otroDia', { fecha: '2027-05-13', orden: 0 }),
  ]












  it('el orden devuelto es el del día entero, listo para guardarlo en el servidor', () => {
    const resultado = moverActividad(base, '2027-05-12', 'paseo', 'comida')

    expect(resultado?.orden).toHaveLength(5)
    expect(resultado?.orden).not.toContain('otroDia')
  })
})
