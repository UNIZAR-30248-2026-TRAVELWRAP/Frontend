import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '../src/services/authApi'
import Itinerario from '../src/screens/Itinerario'

vi.mock('../src/components/MapaActividades', () => ({
  default: ({ puntos, trazado }: { puntos: { id: string; titulo: string }[]; trazado?: number[][] | null }) => (
    <div data-testid="mapa" data-trazado={trazado ? trazado.length : 'ninguno'}>
      {puntos.map((punto) => punto.titulo).join('|')}
    </div>
  ),
}))

configure({ asyncUtilTimeout: 5000 })

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

const conUbicacion = (id: string, titulo: string, datos: Record<string, unknown> = {}) =>
  actividad(id, { titulo, ubicacion_nombre: 'Roma', latitud: 41.89, longitud: 12.49, ...datos })

const RUTA_POR_DEFECTO = () =>
  respuesta(502, { error: { codigo: 'error_ruta', mensaje: 'No se ha podido calcular la ruta' } })

const rutaDelDia = (datos: Record<string, unknown> = {}) => ({
  puntos: [
    { id: 'a1', titulo: 'Coliseo', latitud: 41.89, longitud: 12.49 },
    { id: 'a2', titulo: 'Foro', latitud: 41.9, longitud: 12.5 },
  ],
  orden_sugerido: ['a1', 'a2'],
  ahorro_m: 0,
  ruta: {
    distancia_m: 3420,
    duracion_s: 2700,
    geometria: [
      [41.89, 12.49],
      [41.895, 12.495],
      [41.9, 12.5],
    ],
  },
  ...datos,
})

const simularBackend = (
  actividades: unknown[],
  datosViaje: Record<string, unknown> = {},
  ruta: (url: string) => Promise<Response> = RUTA_POR_DEFECTO,
) => {
  let vigentes = actividades as { id: string }[]
  const fetchMock = vi.fn(async (url: string, opciones?: RequestInit) => {
    if (opciones?.method === 'DELETE') {
      vigentes = vigentes.filter((actividad) => actividad.id !== url.split('/').pop())
      return new Response(null, { status: 204 })
    }
    if (url.includes('/ruta')) return ruta(url)
    return url.includes('/actividades') ? respuesta(200, { actividades: vigentes }) : respuesta(200, viaje(datosViaje))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const peticionesDeRuta = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('/ruta'))

const renderizar = () => render(<Itinerario viajeId={VIAJE_ID} tokenSesion="token-acceso" />)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Itinerario · mapa', () => {
  it('muestra el mapa solo con las actividades del día que tienen ubicación, en el orden de la agenda', async () => {
    simularBackend([
      conUbicacion('a1', 'Desayuno', { hora_inicio: '08:30:00' }),
      actividad('a2', { titulo: 'Paseo sin lugar', hora_inicio: '09:30:00' }),
      conUbicacion('a3', 'Coliseo', { hora_inicio: '10:00:00' }),
      conUbicacion('a4', 'Vaticano', { fecha: '2027-05-13' }),
    ])
    renderizar()

    expect((await screen.findByTestId('mapa')).textContent).toBe('Desayuno|Coliseo')
  })

  it('indica cuántas actividades del día están en el mapa', async () => {
    simularBackend([conUbicacion('a1', 'Coliseo'), actividad('a2', { titulo: 'Paseo sin lugar' })])
    renderizar()

    expect(await screen.findByText('1 de 2 actividades con ubicación en el mapa')).toBeTruthy()
  })

  it('usa el singular cuando el día tiene una sola actividad', async () => {
    simularBackend([conUbicacion('a1', 'Coliseo')])
    renderizar()

    expect(await screen.findByText('1 de 1 actividad con ubicación en el mapa')).toBeTruthy()
  })

  it('si ninguna actividad del día tiene ubicación sigue enseñando el mapa y lo explica', async () => {
    simularBackend([actividad('a1', { titulo: 'Paseo', ubicacion_nombre: 'Trastevere' })])
    renderizar()

    expect((await screen.findByTestId('mapa')).textContent).toBe('')
    expect(screen.getByText(/Ninguna actividad de este día tiene ubicación en el mapa/)).toBeTruthy()
  })

  it('un día sin actividades también enseña el mapa, vacío, con el aviso', async () => {
    simularBackend([conUbicacion('a1', 'Coliseo')])
    renderizar()
    await screen.findByText('1 de 1 actividad con ubicación en el mapa')

    await userEvent.click(screen.getByRole('button', { name: 'Día 3 · 14 may' }))

    expect(screen.getByTestId('mapa').textContent).toBe('')
    expect(screen.getByText(/Ninguna actividad de este día tiene ubicación en el mapa/)).toBeTruthy()
    expect(screen.getByText('No hay actividades este día.')).toBeTruthy()
  })

  it('al cambiar de día el mapa pasa a mostrar las actividades de ese día', async () => {
    simularBackend([
      conUbicacion('a1', 'Coliseo'),
      conUbicacion('a2', 'Vaticano', { fecha: '2027-05-13' }),
      conUbicacion('a3', 'Trastevere', { fecha: '2027-05-13', hora_inicio: '20:00:00' }),
    ])
    renderizar()
    expect((await screen.findByTestId('mapa')).textContent).toBe('Coliseo')

    await userEvent.click(screen.getByRole('button', { name: 'Día 2 · 13 may' }))

    expect(screen.getByTestId('mapa').textContent).toBe('Vaticano|Trastevere')
    expect(screen.getByText('2 de 2 actividades con ubicación en el mapa')).toBeTruthy()
  })

  it('al eliminar una actividad desaparece su marcador del mapa y se actualiza el recuento', async () => {
    const user = userEvent.setup()
    simularBackend([conUbicacion('a1', 'Coliseo', { hora_inicio: '10:00:00' }), conUbicacion('a2', 'Foro', { hora_inicio: '12:00:00' })])
    renderizar()
    expect((await screen.findByTestId('mapa')).textContent).toBe('Coliseo|Foro')

    await user.click(screen.getByRole('button', { name: 'Eliminar Coliseo' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar actividad' }))

    await waitFor(() => expect(screen.getByTestId('mapa').textContent).toBe('Foro'))
    expect(screen.getByText('1 de 1 actividad con ubicación en el mapa')).toBeTruthy()
  })

  it('al eliminar la última actividad con ubicación el mapa se queda sin marcadores', async () => {
    const user = userEvent.setup()
    simularBackend([conUbicacion('a1', 'Coliseo')])
    renderizar()
    await screen.findByText('1 de 1 actividad con ubicación en el mapa')

    await user.click(screen.getByRole('button', { name: 'Eliminar Coliseo' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar actividad' }))

    await waitFor(() => expect(screen.getByTestId('mapa').textContent).toBe(''))
    expect(screen.getByText(/Ninguna actividad de este día tiene ubicación en el mapa/)).toBeTruthy()
  })

  it('con dos actividades con ubicación pide la ruta del día con la sesión y se la pasa al mapa', async () => {
    const fetchMock = simularBackend(
      [conUbicacion('a1', 'Coliseo', { hora_inicio: '10:00:00' }), conUbicacion('a2', 'Foro', { hora_inicio: '12:00:00' })],
      {},
      async () => respuesta(200, rutaDelDia()),
    )
    renderizar()

    expect(await screen.findByText('Ruta a pie por calles: 3,4 km · 45 min')).toBeTruthy()
    expect(screen.getByTestId('mapa').getAttribute('data-trazado')).toBe('3')
    const [url] = peticionesDeRuta(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/ruta\\?fecha=2027-05-12$`))
    const [, opciones] = fetchMock.mock.calls.find(([u]) => String(u).includes('/ruta')) as [string, RequestInit]
    expect((opciones.headers as Record<string, string>).Authorization).toBe('Bearer token-acceso')
  })

  it('si el servicio de rutas falla avisa y deja la línea recta', async () => {
    simularBackend([conUbicacion('a1', 'Coliseo'), conUbicacion('a2', 'Foro')])
    renderizar()

    expect(await screen.findByText('No se ha podido calcular la ruta por calles; se muestra una línea recta.')).toBeTruthy()
    expect(screen.getByTestId('mapa').getAttribute('data-trazado')).toBe('ninguno')
  })

  it('no pide la ruta con menos de dos actividades con ubicación', async () => {
    const fetchMock = simularBackend([conUbicacion('a1', 'Coliseo'), actividad('a2', { titulo: 'Paseo' })])
    renderizar()
    await screen.findByText('1 de 2 actividades con ubicación en el mapa')

    expect(peticionesDeRuta(fetchMock)).toHaveLength(0)
    expect(screen.queryByText(/Ruta a pie por calles/)).toBeNull()
  })

  it('sugiere un orden más corto cuando el ahorro es de 100 m o más', async () => {
    simularBackend(
      [conUbicacion('a1', 'Coliseo'), conUbicacion('a2', 'Foro'), conUbicacion('a3', 'Vaticano')],
      {},
      async () =>
        respuesta(
          200,
          rutaDelDia({
            puntos: [
              { id: 'a1', titulo: 'Coliseo', latitud: 41.89, longitud: 12.49 },
              { id: 'a2', titulo: 'Foro', latitud: 41.9, longitud: 12.5 },
              { id: 'a3', titulo: 'Vaticano', latitud: 41.91, longitud: 12.51 },
            ],
            orden_sugerido: ['a1', 'a3', 'a2'],
            ahorro_m: 1240,
          }),
        ),
    )
    renderizar()

    expect(await screen.findByText(/Orden más corto: «Coliseo» → «Vaticano» → «Foro»/)).toBeTruthy()
    expect(screen.getByText(/unos 1,2 km menos en línea recta/)).toBeTruthy()
  })

  it('no sugiere ningún orden si el ahorro es menor de 100 m', async () => {
    simularBackend(
      [conUbicacion('a1', 'Coliseo'), conUbicacion('a2', 'Foro')],
      {},
      async () => respuesta(200, rutaDelDia({ orden_sugerido: ['a2', 'a1'], ahorro_m: 40 })),
    )
    renderizar()

    await screen.findByText(/Ruta a pie por calles/)
    expect(screen.queryByText(/Orden más corto/)).toBeNull()
  })

  it('al cambiar a un día con una sola ubicación quita la ruta y no vuelve a pedirla', async () => {
    const fetchMock = simularBackend(
      [
        conUbicacion('a1', 'Coliseo'),
        conUbicacion('a2', 'Foro'),
        conUbicacion('a3', 'Vaticano', { fecha: '2027-05-13' }),
      ],
      {},
      async () => respuesta(200, rutaDelDia()),
    )
    renderizar()
    await screen.findByText(/Ruta a pie por calles/)

    await userEvent.click(screen.getByRole('button', { name: 'Día 2 · 13 may' }))

    expect(screen.queryByText(/Ruta a pie por calles/)).toBeNull()
    expect(screen.getByTestId('mapa').getAttribute('data-trazado')).toBe('ninguno')
    expect(peticionesDeRuta(fetchMock)).toHaveLength(1)
  })

  it('tras eliminar una actividad vuelve a pedir la ruta con las que quedan', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend(
      [
        conUbicacion('a1', 'Coliseo', { hora_inicio: '10:00:00' }),
        conUbicacion('a2', 'Foro', { hora_inicio: '12:00:00' }),
        conUbicacion('a3', 'Vaticano', { hora_inicio: '16:00:00' }),
      ],
      {},
      async () => respuesta(200, rutaDelDia()),
    )
    renderizar()
    await screen.findByText(/Ruta a pie por calles/)
    expect(peticionesDeRuta(fetchMock)).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Eliminar Foro' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar actividad' }))

    await waitFor(() => expect(peticionesDeRuta(fetchMock)).toHaveLength(2))
    expect(await screen.findByText(/Ruta a pie por calles/)).toBeTruthy()
  })

  it('ignora la respuesta tardía de la ruta de otro día', async () => {
    let entregarLaDelPrimerDia: (r: Response) => void = () => undefined
    const user = userEvent.setup()
    simularBackend(
      [
        conUbicacion('a1', 'Coliseo'),
        conUbicacion('a2', 'Foro'),
        conUbicacion('a3', 'Vaticano', { fecha: '2027-05-13' }),
        conUbicacion('a4', 'Trastevere', { fecha: '2027-05-13' }),
      ],
      {},
      (url) =>
        url.includes('fecha=2027-05-12')
          ? new Promise<Response>((resolver) => {
              entregarLaDelPrimerDia = resolver
            })
          : respuesta(200, rutaDelDia({ ruta: { distancia_m: 5000, duracion_s: 3600, geometria: [[41, 12], [42, 13]] } })),
    )
    renderizar()
    await screen.findByText('2 de 2 actividades con ubicación en el mapa')

    await user.click(screen.getByRole('button', { name: 'Día 2 · 13 may' }))
    expect(await screen.findByText('Ruta a pie por calles: 5,0 km · 1 h')).toBeTruthy()
    entregarLaDelPrimerDia(new Response(JSON.stringify(rutaDelDia()), { status: 200, headers: { 'Content-Type': 'application/json' } }))

    await waitFor(() => expect(screen.queryByText('Ruta a pie por calles: 3,4 km · 45 min')).toBeNull())
    expect(screen.getByText('Ruta a pie por calles: 5,0 km · 1 h')).toBeTruthy()
  })

  it('no pide la ruta cuando se está viendo lo guardado sin conexión', async () => {
    const fetchMock = simularBackend([conUbicacion('a1', 'Coliseo'), conUbicacion('a2', 'Foro')])
    renderizar()
    await screen.findByText(/No se ha podido calcular la ruta/)
    cleanup()
    const llamadas = peticionesDeRuta(fetchMock).length
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('/ruta')) throw new Error('no debería pedirse')
        throw new ApiError('Sin conexión', 0)
      }),
    )

    renderizar()

    expect(await screen.findByText('2 de 2 actividades con ubicación en el mapa')).toBeTruthy()
    expect(peticionesDeRuta(fetchMock)).toHaveLength(llamadas)
    expect(screen.queryByText(/Ruta a pie por calles/)).toBeNull()
  })

  it('en un viaje archivado el mapa también se ve', async () => {
    simularBackend([conUbicacion('a1', 'Coliseo')], { estado: 'archivado' })
    renderizar()

    expect((await screen.findByTestId('mapa')).textContent).toBe('Coliseo')
  })

  it('sin fechas ni actividades no hay días y no se enseña el mapa', async () => {
    simularBackend([], { fecha_inicio: null, fecha_fin: null })
    renderizar()

    await screen.findByText(/Todavía no hay actividades ni fechas en este viaje/)
    expect(screen.queryByTestId('mapa')).toBeNull()
  })
})
