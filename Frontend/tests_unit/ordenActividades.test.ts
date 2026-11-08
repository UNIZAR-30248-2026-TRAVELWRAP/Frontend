import { describe, expect, it } from 'vitest'
import {
  claveDeHora,
  moverEnGrupo,
  ordenarAgenda,
  puedeReordenarse,
  segmentosPorHora,
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

describe('ordenarAgenda', () => {
  it('ordena por día, hora (las sin hora al final) y posición', () => {
    const lista = [
      actividad('sinHoraB', { orden: 4 }),
      actividad('tarde', { hora_inicio: '16:00:00', orden: 1 }),
      actividad('otroDia', { fecha: '2027-05-13', hora_inicio: '08:00:00' }),
      actividad('sinHoraA', { orden: 3 }),
      actividad('mañana', { hora_inicio: '09:00:00', orden: 2 }),
    ]

    expect(ids(ordenarAgenda(lista))).toEqual(['mañana', 'tarde', 'sinHoraA', 'sinHoraB', 'otroDia'])
  })

  it('desempata por la fecha de creación y por el identificador', () => {
    const lista = [
      actividad('c', { creado_en: '2026-10-24T12:00:00Z' }),
      actividad('b', { creado_en: '2026-10-24T11:00:00Z' }),
      actividad('a', { creado_en: '2026-10-24T11:00:00Z' }),
    ]

    expect(ids(ordenarAgenda(lista))).toEqual(['a', 'b', 'c'])
  })

  it('no modifica la lista original', () => {
    const lista = [actividad('b', { orden: 2 }), actividad('a', { orden: 1 })]

    ordenarAgenda(lista)

    expect(ids(lista)).toEqual(['b', 'a'])
  })
})

describe('segmentosPorHora', () => {
  it('agrupa las actividades consecutivas que empiezan a la misma hora y las que no tienen hora', () => {
    const delDia = ordenarAgenda([
      actividad('desayuno', { hora_inicio: '08:30:00' }),
      actividad('museoA', { hora_inicio: '10:00:00', orden: 1 }),
      actividad('museoB', { hora_inicio: '10:00:00', orden: 2 }),
      actividad('paseo', { orden: 3 }),
      actividad('compras', { orden: 4 }),
    ])

    const segmentos = segmentosPorHora(delDia)

    expect(segmentos.map((s) => [s.clave, ids(s.actividades)])).toEqual([
      ['08:30', ['desayuno']],
      ['10:00', ['museoA', 'museoB']],
      ['', ['paseo', 'compras']],
    ])
  })

  it('con una lista vacía no hay segmentos', () => {
    expect(segmentosPorHora([])).toEqual([])
  })
})

describe('puedeReordenarse', () => {
  const delDia = [
    actividad('desayuno', { hora_inicio: '08:30:00' }),
    actividad('museoA', { hora_inicio: '10:00:00' }),
    actividad('museoB', { hora_inicio: '10:00:00' }),
    actividad('paseo'),
    actividad('compras'),
    actividad('cena', { hora_inicio: '21:00:00' }),
  ]

  it('permite mover las que empatan en hora', () => {
    expect(puedeReordenarse(delDia, 'museoA')).toBe(true)
    expect(puedeReordenarse(delDia, 'museoB')).toBe(true)
  })

  it('permite mover las que no tienen hora si hay más de una', () => {
    expect(puedeReordenarse(delDia, 'paseo')).toBe(true)
    expect(puedeReordenarse(delDia, 'compras')).toBe(true)
  })

  it('no permite mover una actividad con una hora que no comparte nadie', () => {
    expect(puedeReordenarse(delDia, 'desayuno')).toBe(false)
    expect(puedeReordenarse(delDia, 'cena')).toBe(false)
  })

  it('una única actividad sin hora no se puede mover y un identificador desconocido tampoco', () => {
    expect(puedeReordenarse([actividad('solaSinHora')], 'solaSinHora')).toBe(false)
    expect(puedeReordenarse(delDia, 'fantasma')).toBe(false)
  })
})

describe('moverEnGrupo', () => {
  const base = [
    actividad('desayuno', { hora_inicio: '08:30:00', orden: 0 }),
    actividad('paseo', { orden: 1 }),
    actividad('compras', { orden: 2 }),
    actividad('cena', { orden: 3 }),
    actividad('otroDia', { fecha: '2027-05-13', orden: 0 }),
  ]

  it('mueve una actividad sin hora a la posición de otra del mismo grupo y devuelve el nuevo orden del grupo', () => {
    const resultado = moverEnGrupo(base, '2027-05-12', 'cena', 'paseo')

    expect(resultado?.grupo).toEqual(['cena', 'paseo', 'compras'])
    expect(ids(ordenarAgenda((resultado?.actividades ?? []).filter((a) => a.fecha === '2027-05-12')))).toEqual([
      'desayuno',
      'cena',
      'paseo',
      'compras',
    ])
  })

  it('mueve hacia abajo y hacia arriba', () => {
    const haciaAbajo = moverEnGrupo(base, '2027-05-12', 'paseo', 'cena')
    expect(haciaAbajo?.grupo).toEqual(['compras', 'cena', 'paseo'])

    const haciaArriba = moverEnGrupo(base, '2027-05-12', 'compras', 'paseo')
    expect(haciaArriba?.grupo).toEqual(['compras', 'paseo', 'cena'])
  })

  it('renumera el día entero y no toca los demás días', () => {
    const resultado = moverEnGrupo(base, '2027-05-12', 'cena', 'paseo')

    const ordenes = Object.fromEntries((resultado?.actividades ?? []).map((a) => [a.id, a.orden]))
    expect(ordenes).toEqual({ desayuno: 0, cena: 1, paseo: 2, compras: 3, otroDia: 0 })
  })

  it('mueve entre las actividades que empiezan a la misma hora', () => {
    const empate = [
      actividad('museoA', { hora_inicio: '10:00:00', orden: 0 }),
      actividad('museoB', { hora_inicio: '10:00:00', orden: 1 }),
      actividad('comida', { hora_inicio: '14:00:00', orden: 2 }),
    ]

    const resultado = moverEnGrupo(empate, '2027-05-12', 'museoB', 'museoA')

    expect(resultado?.grupo).toEqual(['museoB', 'museoA'])
    expect(ids(ordenarAgenda(resultado?.actividades ?? []))).toEqual(['museoB', 'museoA', 'comida'])
  })

  it('arregla las posiciones repetidas dejando un orden estable', () => {
    const repetidas = [actividad('a', { orden: 0 }), actividad('b', { orden: 0 }), actividad('c', { orden: 0 })]

    const resultado = moverEnGrupo(repetidas, '2027-05-12', 'c', 'a')

    expect(resultado?.grupo).toEqual(['c', 'a', 'b'])
    const ordenes = (resultado?.actividades ?? []).map((a) => a.orden).sort()
    expect(ordenes).toEqual([0, 1, 2])
  })

  it('no hace nada si se suelta sobre sí misma', () => {
    expect(moverEnGrupo(base, '2027-05-12', 'paseo', 'paseo')).toBeNull()
  })

  it('no permite mover entre actividades con distinta hora', () => {
    expect(moverEnGrupo(base, '2027-05-12', 'paseo', 'desayuno')).toBeNull()
    expect(moverEnGrupo(base, '2027-05-12', 'desayuno', 'paseo')).toBeNull()
  })

  it('no permite mover entre días ni con identificadores que no existen', () => {
    expect(moverEnGrupo(base, '2027-05-12', 'paseo', 'otroDia')).toBeNull()
    expect(moverEnGrupo(base, '2027-05-12', 'fantasma', 'paseo')).toBeNull()
    expect(moverEnGrupo(base, '2027-05-12', 'paseo', 'fantasma')).toBeNull()
  })

  it('no modifica la lista original', () => {
    moverEnGrupo(base, '2027-05-12', 'cena', 'paseo')

    expect(base.map((a) => a.orden)).toEqual([0, 1, 2, 3, 0])
  })
})
