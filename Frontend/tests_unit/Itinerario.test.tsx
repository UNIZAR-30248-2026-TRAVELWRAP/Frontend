import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Itinerario from '../src/screens/Itinerario'

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
  titulo: `Actividad ${id}`,
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

const ACTIVIDADES = [
  actividad('desayuno', { titulo: 'Desayuno', hora_inicio: '08:30:00', ubicacion_nombre: 'Hotel' }),
  actividad('coliseo', { titulo: 'Visita al Coliseo', hora_inicio: '10:00:00', ubicacion_nombre: 'Piazza del Colosseo' }),
  actividad('paseo', { titulo: 'Paseo sin hora' }),
  actividad('vaticano', { titulo: 'Vaticano', fecha: '2027-05-13', hora_inicio: '09:30:00' }),
]

const simularBackend = (datos: Record<string, unknown> = {}, actividades: unknown[] = ACTIVIDADES) => {
  const fetchMock = vi.fn((url: string) =>
    url.includes('/actividades') ? respuesta(200, { actividades }) : respuesta(200, viaje(datos)),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const renderizar = (props: Partial<Parameters<typeof Itinerario>[0]> = {}) =>
  render(<Itinerario viajeId={VIAJE_ID} tokenSesion="token-acceso" {...props} />)

const titulosDeLaAgenda = () =>
  within(screen.getByRole('list', { name: 'Agenda del día' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Itinerario', () => {
  it('pide el viaje y sus actividades con el token de la sesión', async () => {
    const fetchMock = simularBackend()
    renderizar()

    await screen.findByText('Visita al Coliseo')

    const urls = fetchMock.mock.calls.map(([url]) => url)
    expect(urls.some((url) => new RegExp(`/viajes/${VIAJE_ID}$`).test(url))).toBe(true)
    expect(urls.some((url) => new RegExp(`/viajes/${VIAJE_ID}/actividades$`).test(url))).toBe(true)
    for (const [, opciones] of fetchMock.mock.calls as unknown as [string, { headers: Record<string, string> }][]) {
      expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
    }
  })

  it('muestra una pastilla por día y las actividades del primer día en el orden recibido', async () => {
    simularBackend()
    renderizar()

    await screen.findByText('Visita al Coliseo')
    const dias = screen.getByRole('group', { name: 'Día del itinerario' })
    expect(dias.textContent).toContain('Día 1 · 12 may')
    expect(dias.textContent).toContain('Día 3 · 14 may')
    expect(screen.getByRole('button', { name: 'Día 1 · 12 may' }).getAttribute('aria-pressed')).toBe('true')
    expect(titulosDeLaAgenda()).toEqual([
      'DesayunoHotel08:30 h',
      'Visita al ColiseoPiazza del Colosseo10:00 h',
      'Paseo sin hora',
    ])
  })

  it('al elegir otro día muestra solo sus actividades', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Día 2 · 13 may' }))

    expect(titulosDeLaAgenda()).toEqual(['Vaticano09:30 h'])
    expect(screen.queryByText('Visita al Coliseo')).toBeNull()
    expect(screen.getByRole('button', { name: 'Día 2 · 13 may' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('avisa si el día elegido no tiene actividades', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Día 3 · 14 may' }))

    expect(screen.getByText('No hay actividades este día.')).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Agenda del día' })).toBeNull()
  })

  it('no muestra hora ni ubicación cuando la actividad no las tiene', async () => {
    simularBackend({}, [actividad('a1', { titulo: 'Paseo' })])
    renderizar()

    await screen.findByText('Paseo')

    expect(screen.queryByText(/ h$/)).toBeNull()
    expect(titulosDeLaAgenda()).toEqual(['Paseo'])
  })

  it('muestra el rango cuando la actividad tiene hora de fin', async () => {
    simularBackend({}, [actividad('a1', { titulo: 'Museo', hora_inicio: '10:00:00', hora_fin: '12:30:00' })])
    renderizar()

    expect(await screen.findByText('10:00 – 12:30 h')).toBeTruthy()
  })

  it('muestra el avatar de quien añadió la actividad', async () => {
    simularBackend(
      { miembros: [
        { usuario_id: 'u1', nombre: 'Adriana', avatar_url: null, rol: 'creador' },
        { usuario_id: 'u2', nombre: 'Berta', avatar_url: null, rol: 'miembro' },
      ] },
      [
        actividad('a1', { titulo: 'Cena', creado_por: 'u2' }),
        actividad('a2', { titulo: 'Museo', creado_por: 'u1' }),
      ],
    )
    renderizar()

    await screen.findByText('Cena')

    const berta = screen.getByRole('img', { name: 'Añadida por Berta' })
    expect(berta.textContent).toBe('B')
    expect(screen.getByRole('img', { name: 'Añadida por Adriana' }).textContent).toBe('A')
  })

  it('no muestra avatar si quien la añadió ya no es miembro del viaje', async () => {
    simularBackend({}, [actividad('a1', { titulo: 'Cena', creado_por: 'otro-usuario' }), actividad('a2', { titulo: 'Museo' })])
    renderizar()

    await screen.findByText('Cena')

    expect(screen.queryByRole('img')).toBeNull()
  })

  it('marca el tipo de la actividad en su icono', async () => {
    simularBackend({}, [
      actividad('a1', { titulo: 'Cena', categoria: 'comida' }),
      actividad('a2', { titulo: 'Paseo' }),
    ])
    renderizar()

    await screen.findByText('Cena')

    expect(screen.getByRole('img', { name: 'Comida' })).toBeTruthy()
    expect(screen.getAllByRole('img')).toHaveLength(1)
  })

  it('recorta los segundos de la hora', async () => {
    simularBackend({}, [actividad('a1', { titulo: 'Cena', hora_inicio: '20:15:00' })])
    renderizar()

    expect(await screen.findByText('20:15 h')).toBeTruthy()
  })

  it('sin fechas en el viaje saca los días de las actividades', async () => {
    simularBackend({ fecha_inicio: null, fecha_fin: null }, [
      actividad('a1', { titulo: 'Playa', fecha: '2027-06-02' }),
      actividad('a2', { titulo: 'Museo', fecha: '2027-06-01' }),
    ])
    renderizar()

    await screen.findByText('Museo')
    const dias = screen.getByRole('group', { name: 'Día del itinerario' })
    expect(within(dias).getAllByRole('button').map((boton) => boton.textContent)).toEqual(['1 jun', '2 jun'])
    expect(screen.queryByText('Playa')).toBeNull()
  })

  it('añade el día de una actividad que cae fuera de las fechas del viaje', async () => {
    simularBackend({}, [actividad('a1', { titulo: 'Antes de salir', fecha: '2027-05-10' })])
    renderizar()

    expect(await screen.findByText('Antes de salir')).toBeTruthy()
    expect(screen.getByRole('button', { name: '10 may' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Día 1 · 12 may' })).toBeTruthy()
  })

  it('sin fechas ni actividades invita a añadir la primera', async () => {
    simularBackend({ fecha_inicio: null, fecha_fin: null }, [])
    renderizar()

    expect(await screen.findByText(/Todavía no hay actividades ni fechas en este viaje/)).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Día del itinerario' })).toBeNull()
  })

  it('el botón de añadir actividad avisa a la ruta', async () => {
    const user = userEvent.setup()
    const onAnadirActividad = vi.fn()
    simularBackend()
    renderizar({ onAnadirActividad })

    await user.click(await screen.findByRole('button', { name: 'Añadir Actividad' }))

    expect(onAnadirActividad).toHaveBeenCalledTimes(1)
  })

  it('en un viaje archivado se consultan las actividades pero no se puede añadir', async () => {
    simularBackend({ estado: 'archivado' })
    renderizar()

    expect(await screen.findByText('Visita al Coliseo')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Añadir Actividad' })).toBeNull()
  })

  it('avisa si no se ha podido cargar el itinerario', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => respuesta(404, { error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe o no perteneces a él' } })),
    )
    renderizar()

    expect((await screen.findByRole('alert')).textContent).toContain('El viaje no existe o no perteneces a él')
    expect(screen.queryByRole('button', { name: 'Añadir Actividad' })).toBeNull()
  })

  it('marca Itinerario en la barra inferior y deja volver a Inicio', async () => {
    const user = userEvent.setup()
    const onCambiarSeccion = vi.fn()
    simularBackend()
    renderizar({ onCambiarSeccion })

    await screen.findByText('Visita al Coliseo')
    const barra = screen.getByRole('navigation', { name: 'Secciones del viaje' })
    expect(within(barra).getByRole('button', { name: 'Itinerario' }).getAttribute('aria-current')).toBe('page')
    await user.click(within(barra).getByRole('button', { name: 'Inicio' }))

    expect(onCambiarSeccion).toHaveBeenCalledWith('inicio')
  })

  it('el enlace de Mis Viajes avisa a la ruta', async () => {
    const user = userEvent.setup()
    const onVolver = vi.fn()
    simularBackend()
    renderizar({ onVolver })

    await user.click(await screen.findByRole('button', { name: 'Volver a Mis Viajes' }))

    expect(onVolver).toHaveBeenCalledTimes(1)
  })
})
