import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '../src/services/authApi'
import Itinerario from '../src/screens/Itinerario'

vi.mock('../src/components/MapaActividades', () => ({
  default: ({
    puntos,
    trazado,
    ampliado,
    alAlternarAmpliado,
  }: {
    puntos: { id: string; titulo: string }[]
    trazado?: number[][] | null
    ampliado?: boolean
    alAlternarAmpliado?: () => void
  }) => (
    <>
      <div data-testid="mapa" data-trazado={trazado ? trazado.length : 'ninguno'} data-ampliado={String(!!ampliado)}>
        {puntos.map((punto) => punto.titulo).join('|')}
      </div>
      <button type="button" onClick={alAlternarAmpliado}>
        {ampliado ? 'Reducir mapa' : 'Ampliar mapa'}
      </button>
    </>
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
  document.body.style.overflow = ''
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

  describe('enlace a Google Maps', () => {
    const enlace = () => screen.queryByRole('link', { name: 'Abrir en Google Maps' }) as HTMLAnchorElement | null


    it('se ofrece también si no se ha podido calcular la ruta por calles', async () => {
      simularBackend([conUbicacion('a1', 'Coliseo'), conUbicacion('a2', 'Foro', { latitud: 41.9 })])
      renderizar()

      expect(await screen.findByRole('link', { name: 'Abrir en Google Maps' })).toBeTruthy()
      expect(await screen.findByText(/No se ha podido calcular la ruta por calles/)).toBeTruthy()
    })

    it('no se ofrece con una sola actividad con ubicación ni sin ninguna', async () => {
      simularBackend([conUbicacion('a1', 'Coliseo'), actividad('a2', { titulo: 'Paseo sin lugar' })])
      renderizar()
      await screen.findByText('1 de 2 actividades con ubicación en el mapa')
      expect(enlace()).toBeNull()

      await userEvent.click(screen.getByRole('button', { name: 'Día 3 · 14 may' }))
      expect(enlace()).toBeNull()
    })

    it('con más de 11 paradas abre las 11 primeras y lo avisa', async () => {
      simularBackend(
        Array.from({ length: 12 }, (_, i) =>
          conUbicacion(`a${i}`, `Parada ${i}`, { hora_inicio: `${String(8 + i).padStart(2, '0')}:00:00`, latitud: 41 + i / 100 }),
        ),
      )
      renderizar()

      const boton = await screen.findByRole('link', { name: 'Abrir en Google Maps' })
      const datos = new URL((boton as HTMLAnchorElement).href).searchParams
      expect(datos.get('waypoints')?.split('|')).toHaveLength(9)
      expect(datos.get('destination')).toBe('41.1,12.49')
      expect(screen.getByText('Google Maps admite hasta 11 paradas: se abren las 11 primeras.')).toBeTruthy()
    })

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

    expect(screen.getByTestId('mapa').textContent).toBe('Trastevere|Vaticano')
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



  it('con Escape se reduce el mapa ampliado', async () => {
    const user = userEvent.setup()
    simularBackend([conUbicacion('a1', 'Coliseo')])
    renderizar()
    await user.click(await screen.findByRole('button', { name: 'Ampliar mapa' }))

    await user.keyboard('{Escape}')

    expect(screen.getByTestId('mapa').getAttribute('data-ampliado')).toBe('false')
    expect(document.body.style.overflow).toBe('')
  })

  it('otras teclas no reducen el mapa ampliado', async () => {
    const user = userEvent.setup()
    simularBackend([conUbicacion('a1', 'Coliseo')])
    renderizar()
    await user.click(await screen.findByRole('button', { name: 'Ampliar mapa' }))

    await user.keyboard('a{ArrowDown}{Tab}')

    expect(screen.getByTestId('mapa').getAttribute('data-ampliado')).toBe('true')
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


  it('sin fechas ni actividades no hay días y no se enseña el mapa', async () => {
    simularBackend([], { fecha_inicio: null, fecha_fin: null })
    renderizar()

    await screen.findByText(/Todavía no hay actividades ni fechas en este viaje/)
    expect(screen.queryByTestId('mapa')).toBeNull()
  })
})
