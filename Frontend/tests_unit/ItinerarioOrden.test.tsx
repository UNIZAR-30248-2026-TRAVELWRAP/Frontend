import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, configure, render, screen, within } from '@testing-library/react'
import Itinerario from '../src/screens/Itinerario'

configure({ asyncUtilTimeout: 5000 })

vi.mock('../src/components/MapaActividades', () => ({
  default: () => <div data-testid="mapa" />,
}))

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }),
  )

const viaje = (datos: Record<string, unknown> = {}) => ({
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  destino: 'Roma',
  descripcion: null,
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-14',
  moneda: 'EUR',
  presupuesto: 850,
  estado: 'activo',
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  rol: 'miembro',
  miembros: [{ usuario_id: 'u1', nombre: 'Adriana', avatar_url: null, rol: 'creador' }],
  ...datos,
})

const actividad = (id: string, datos: Record<string, unknown> = {}) => ({
  id,
  viaje_id: VIAJE_ID,
  titulo: id,
  descripcion: null,
  fecha: '2027-05-12',
  hora_inicio: null,
  hora_fin: null,
  orden: 0,
  ubicacion_nombre: null,
  latitud: null,
  longitud: null,
  lugar_externo_id: null,
  categoria: null,
  creado_por: null as string | null,
  creado_en: '2026-10-24T10:00:00Z',
  actualizado_en: '2026-10-24T10:00:00Z',
  ...datos,
})

const simularBackend = (actividades: unknown[], datosViaje: Record<string, unknown> = {}) => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      String(url).includes('/actividades') ? respuesta(200, { actividades }) : respuesta(200, viaje(datosViaje)),
    ),
  )
}

const renderizar = () => render(<Itinerario viajeId={VIAJE_ID} tokenSesion="token-acceso" />)

const titulosDeLaAgenda = () =>
  within(screen.getByRole('list', { name: 'Agenda del día' }))
    .getAllByRole('listitem')
    .map((item) => within(item).getAllByText(/./)[0]?.textContent)

const AVISO =
  'Las actividades sin hora se pueden colocar donde quieras arrastrando el asa; las que empiezan a la misma hora, entre sí.'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Itinerario · asas para reordenar', () => {
  it('muestra el asa solo en las actividades sin hora cuando hay más de una', async () => {
    simularBackend([
      actividad('Desayuno', { hora_inicio: '08:30:00' }),
      actividad('Paseo', { orden: 1 }),
      actividad('Compras', { orden: 2 }),
    ])
    renderizar()

    expect(await screen.findByRole('button', { name: 'Mover Paseo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mover Compras' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mover Desayuno' })).toBeNull()
    expect(screen.getByText(AVISO)).toBeTruthy()
  })

  it('muestra el asa en las actividades que empiezan a la misma hora', async () => {
    simularBackend([
      actividad('Museo', { hora_inicio: '10:00:00', orden: 0 }),
      actividad('Tienda', { hora_inicio: '10:00:00', orden: 1 }),
      actividad('Comida', { hora_inicio: '14:00:00', orden: 2 }),
    ])
    renderizar()

    expect(await screen.findByRole('button', { name: 'Mover Museo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mover Tienda' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mover Comida' })).toBeNull()
  })

  it('una única actividad sin hora tiene asa si hay otras con hora entre las que colocarla', async () => {
    simularBackend([actividad('Desayuno', { hora_inicio: '08:30:00' }), actividad('Museo', { hora_inicio: '10:00:00' }), actividad('Paseo')])
    renderizar()

    expect(await screen.findByRole('button', { name: 'Mover Paseo' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mover Desayuno' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Mover Museo' })).toBeNull()
    expect(screen.getByText(AVISO)).toBeTruthy()
  })

  it('no muestra asas ni aviso si todas tienen una hora distinta', async () => {
    simularBackend([
      actividad('Desayuno', { hora_inicio: '08:30:00' }),
      actividad('Museo', { hora_inicio: '10:00:00' }),
      actividad('Cena', { hora_inicio: '21:00:00' }),
    ])
    renderizar()

    await screen.findByText('Desayuno')
    expect(screen.queryByRole('button', { name: /^Mover / })).toBeNull()
    expect(screen.queryByText(AVISO)).toBeNull()
  })

  it('una sin hora colocada entre las de hora se muestra entre ellas', async () => {
    simularBackend([
      actividad('Desayuno', { hora_inicio: '08:30:00', orden: 0 }),
      actividad('Comida', { hora_inicio: '14:00:00', orden: 2 }),
      actividad('Paseo', { orden: -2 }),
      actividad('Cena', { hora_inicio: '21:00:00', orden: 3 }),
      actividad('Fotos', { orden: 4 }),
    ])
    renderizar()
    await screen.findByText('Desayuno')

    expect(titulosDeLaAgenda()).toEqual(['Desayuno', 'Paseo', 'Comida', 'Cena', 'Fotos'])
  })

  it('si es la única actividad del día no se puede mover', async () => {
    simularBackend([actividad('Paseo')])
    renderizar()

    await screen.findByText('Paseo')
    expect(screen.queryByRole('button', { name: /^Mover / })).toBeNull()
  })

  it('en un viaje archivado no hay asas ni aviso', async () => {
    simularBackend([actividad('Paseo', { orden: 1 }), actividad('Compras', { orden: 2 })], { estado: 'archivado' })
    renderizar()

    await screen.findByText('Paseo')
    expect(screen.queryByRole('button', { name: /^Mover / })).toBeNull()
    expect(screen.queryByText(AVISO)).toBeNull()
  })

  it('el asa es un botón enfocable con el nombre de la actividad y de al menos 36 px de ancho', async () => {
    simularBackend([actividad('Paseo', { orden: 1 }), actividad('Compras', { orden: 2 })])
    renderizar()

    const asa = await screen.findByRole('button', { name: 'Mover Paseo' })

    expect(asa.getAttribute('tabindex')).toBe('0')
    expect(asa.style.width).toBe('36px')
    expect(asa.style.touchAction).toBe('none')
  })

  it('ordena la agenda por hora y por posición aunque el servidor la envíe desordenada', async () => {
    simularBackend([
      actividad('Compras', { orden: 3 }),
      actividad('Cena', { hora_inicio: '21:00:00', orden: 9 }),
      actividad('Paseo', { orden: 2 }),
      actividad('Desayuno', { hora_inicio: '08:30:00', orden: 8 }),
    ])
    renderizar()
    await screen.findByText('Desayuno')

    expect(titulosDeLaAgenda()).toEqual(['Desayuno', 'Cena', 'Paseo', 'Compras'])
  })

  it('dentro de las que no tienen hora respeta la posición guardada', async () => {
    simularBackend([actividad('B', { orden: 1 }), actividad('C', { orden: 2 }), actividad('A', { orden: 0 })])
    renderizar()
    await screen.findByText('A')

    expect(titulosDeLaAgenda()).toEqual(['A', 'B', 'C'])
  })
})
