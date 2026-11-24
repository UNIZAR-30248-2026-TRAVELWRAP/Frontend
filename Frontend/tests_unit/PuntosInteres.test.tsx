import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PuntosInteres from '../src/components/PuntosInteres'
import type { ViajeDelUsuario } from '../src/services/viajesApi'

vi.mock('../src/components/MapaPuntosInteres', () => ({
  default: ({
    puntos,
    elegida,
    seleccionado,
    enfocado,
    alTocarMapa,
    alElegirPunto,
    ampliado,
    alAlternarAmpliado,
  }: {
    puntos: { id: string; nombre: string }[]
    elegida: { latitud: number; longitud: number } | null
    seleccionado: string | null
    enfocado: { id: string } | null
    alTocarMapa: (u: { latitud: number; longitud: number }) => void
    alElegirPunto: (id: string) => void
    ampliado?: boolean
    alAlternarAmpliado?: () => void
  }) => (
    <div data-testid="mapa" data-elegida={elegida ? `${elegida.latitud},${elegida.longitud}` : ''} data-seleccionado={seleccionado ?? ''} data-enfocado={enfocado?.id ?? ''} data-ampliado={String(!!ampliado)}>
      <span data-testid="nombres-en-mapa">{puntos.map((p) => p.nombre).join('|')}</span>
      <button type="button" onClick={() => alTocarMapa({ latitud: 41.9, longitud: 12.5 })}>
        Tocar el mapa
      </button>
      {puntos.map((p) => (
        <button type="button" key={p.id} onClick={() => alElegirPunto(p.id)}>
          {`Marcador ${p.nombre}`}
        </button>
      ))}
      <button type="button" onClick={alAlternarAmpliado}>
        {ampliado ? 'Reducir mapa' : 'Ampliar mapa'}
      </button>
    </div>
  ),
}))

configure({ asyncUtilTimeout: 5000 })

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const viaje: ViajeDelUsuario = {
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
  archivado: false,
  miembros: [
    { usuario_id: 'u1', nombre: 'Adriana', avatar_url: null, rol: 'creador' },
    { usuario_id: 'u2', nombre: 'Berta', avatar_url: null, rol: 'miembro' },
  ],
} as unknown as ViajeDelUsuario

const punto = (id: string, datos: Record<string, unknown> = {}) => ({
  id,
  viaje_id: VIAJE_ID,
  nombre: `Punto ${id}`,
  nota: null,
  categoria: null,
  latitud: 41.89,
  longitud: 12.49,
  lugar_externo_id: null,
  direccion: null,
  creado_por: 'u1',
  creado_en: '2026-11-22T10:00:00Z',
  ...datos,
})

const TREVI = punto('p1', {
  nombre: 'Fontana di Trevi',
  nota: 'Ir temprano',
  categoria: 'cultura',
  direccion: 'Fontana di Trevi, Piazza di Trevi, Roma',
  lugar_externo_id: 'way/1',
  latitud: 41.900932,
  longitud: 12.483313,
})
const HELADERIA = punto('p2', { nombre: 'Heladería', categoria: 'comida', creado_por: 'u2' })
const MIRADOR = punto('p3', { nombre: 'Mirador', latitud: 41.89, longitud: 12.47 })

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const simularBackend = (iniciales: unknown[], opciones: { falloListar?: boolean; falloCrear?: boolean; falloBorrar?: boolean } = {}) => {
  let vigentes = [...iniciales] as { id: string }[]
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const metodo = init?.method ?? 'GET'
    if (metodo === 'GET') {
      if (opciones.falloListar) return respuesta(502, { error: { codigo: 'error_punto_interes', mensaje: 'No se han podido obtener los puntos de interés' } })
      return respuesta(200, { puntos_interes: vigentes })
    }
    if (metodo === 'POST') {
      if (opciones.falloCrear) return respuesta(400, { error: { codigo: 'datos_invalidos', mensaje: 'El nombre es obligatorio y tiene un máximo de 120 caracteres' } })
      const creado = { id: 'nuevo', viaje_id: VIAJE_ID, creado_por: 'u1', creado_en: 'x', ...JSON.parse(String(init?.body)) }
      vigentes = [...vigentes, creado]
      return respuesta(201, creado)
    }
    if (opciones.falloBorrar) return respuesta(409, { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está finalizado y ya no se puede modificar' } })
    vigentes = vigentes.filter((p) => p.id !== url.split('/').pop())
    return new Response(null, { status: 204 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const cuerpoDe = (fetchMock: ReturnType<typeof vi.fn>, metodo: string) => {
  const llamada = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === metodo)
  return llamada ? JSON.parse(String((llamada[1] as RequestInit).body)) : null
}

const DIRECCION = {
  nombre: 'Pantheon, Piazza della Rotonda, Roma',
  titulo: 'Pantheon',
  detalle: 'Roma, Italia',
  latitud: 41.8986,
  longitud: 12.4769,
  lugar_externo_id: 'way/9',
}

const renderizar = (opciones: { editable?: boolean; buscar?: (c: string) => Promise<unknown[]> } = {}) =>
  render(
    <PuntosInteres
      viajeId={VIAJE_ID}
      tokenSesion="token-acceso"
      viaje={viaje}
      editable={opciones.editable ?? true}
      onBuscarDirecciones={(opciones.buscar ?? (async () => [DIRECCION])) as never}
    />,
  )


beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
})

afterEach(() => {
  document.body.style.overflow = ''
  cleanup()
  vi.unstubAllGlobals()
})

describe('PuntosInteres · lista y mapa', () => {
  it('muestra los puntos del viaje en el mapa y en la lista, con su tipo, dirección y nota', async () => {
    simularBackend([TREVI, HELADERIA])
    renderizar()

    expect(await screen.findByText('Puntos de interés (2)')).toBeTruthy()
    expect(screen.getByTestId('nombres-en-mapa').textContent).toBe('Fontana di Trevi|Heladería')
    const lista = screen.getByRole('list', { name: 'Puntos de interés' })
    expect(within(lista).getByText('Fontana di Trevi, Piazza di Trevi, Roma')).toBeTruthy()
    expect(within(lista).getByText('Ir temprano')).toBeTruthy()
    expect(within(lista).getByText('Cultura')).toBeTruthy()
    expect(within(lista).getByRole('img', { name: 'Añadido por Berta' })).toBeTruthy()
  })

  it('sin puntos explica cómo añadir el primero, y en solo lectura no lo sugiere', async () => {
    simularBackend([])
    renderizar()
    expect(await screen.findByText(/Todavía no hay puntos de interés en este viaje\. Toca el mapa o busca un sitio/)).toBeTruthy()
    cleanup()

    simularBackend([])
    renderizar({ editable: false })
    expect((await screen.findByText(/Todavía no hay puntos de interés en este viaje\./)).textContent).not.toContain('Toca el mapa')
  })

  it('avisa si no se pueden cargar y permite reintentar', async () => {
    const fetchMock = simularBackend([], { falloListar: true })
    renderizar()

    expect(await screen.findByText(/No se han podido cargar los puntos de interés: No se han podido obtener los puntos de interés/)).toBeTruthy()
    const llamadas = fetchMock.mock.calls.length
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(llamadas))
  })

  it('el mapa se puede ampliar y reducir', async () => {
    simularBackend([TREVI])
    renderizar()
    await screen.findByText('Puntos de interés (1)')

    await userEvent.click(screen.getByRole('button', { name: 'Ampliar mapa' }))
    expect(screen.getByTestId('mapa').getAttribute('data-ampliado')).toBe('true')
    expect(document.body.style.overflow).toBe('hidden')

    await userEvent.keyboard('{Escape}')
    expect(screen.getByTestId('mapa').getAttribute('data-ampliado')).toBe('false')
    expect(document.body.style.overflow).toBe('')
  })
})

describe('PuntosInteres · ficha de un punto', () => {
  it('al pulsar un punto de la lista centra el mapa en él y abre su ficha', async () => {
    simularBackend([TREVI, HELADERIA])
    renderizar()
    await screen.findByText('Puntos de interés (2)')

    await userEvent.click(screen.getByRole('button', { name: 'Ver Fontana di Trevi en el mapa' }))

    const mapa = screen.getByTestId('mapa')
    expect(mapa.getAttribute('data-seleccionado')).toBe('p1')
    expect(mapa.getAttribute('data-enfocado')).toBe('p1')
    const dialogo = screen.getByRole('dialog', { name: 'Fontana di Trevi' })
    expect(within(dialogo).getByText('Fontana di Trevi, Piazza di Trevi, Roma')).toBeTruthy()
    expect(within(dialogo).getByText('Ir temprano')).toBeTruthy()
    expect(within(dialogo).getByText('Cultura')).toBeTruthy()
    expect(within(dialogo).getByText('Añadido por Adriana')).toBeTruthy()
  })

  it('al tocar un marcador del mapa abre la ficha, y cambiar de punto no cierra la ficha', async () => {
    simularBackend([TREVI, HELADERIA])
    renderizar()
    await screen.findByText('Puntos de interés (2)')

    await userEvent.click(screen.getByRole('button', { name: 'Marcador Heladería' }))
    expect(screen.getByRole('dialog', { name: 'Heladería' })).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: 'Marcador Fontana di Trevi' }))
    expect(screen.getByRole('dialog', { name: 'Fontana di Trevi' })).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Heladería' })).toBeNull()
  })

  it('un punto sin dirección muestra sus coordenadas', async () => {
    simularBackend([MIRADOR])
    renderizar()
    await screen.findByText('Puntos de interés (1)')

    await userEvent.click(screen.getByRole('button', { name: 'Ver Mirador en el mapa' }))

    expect(within(screen.getByRole('dialog', { name: 'Mirador' })).getByText('Sin dirección · 41,89000, 12,47000')).toBeTruthy()
    expect(within(screen.getByRole('dialog', { name: 'Mirador' })).getByText('Sin tipo')).toBeTruthy()
  })

  it('ofrece abrir el punto en Google Maps en una pestaña nueva', async () => {
    simularBackend([TREVI])
    renderizar()
    await screen.findByText('Puntos de interés (1)')

    await userEvent.click(screen.getByRole('button', { name: 'Ver Fontana di Trevi en el mapa' }))

    const enlace = screen.getByRole('link', { name: 'Abrir en Google Maps' }) as HTMLAnchorElement
    const datos = new URL(enlace.href)
    expect(datos.origin + datos.pathname).toBe('https://www.google.com/maps/search/')
    expect(datos.searchParams.get('query')).toBe('41.900932,12.483313')
    expect(enlace.getAttribute('target')).toBe('_blank')
    expect(enlace.getAttribute('rel')).toContain('noopener')
  })

  it('se cierra con su botón y tocando otra parte del mapa, y no añade un punto nuevo al hacerlo', async () => {
    simularBackend([TREVI])
    renderizar()
    await screen.findByText('Puntos de interés (1)')

    await userEvent.click(screen.getByRole('button', { name: 'Ver Fontana di Trevi en el mapa' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }))
    expect(screen.queryByRole('dialog', { name: 'Fontana di Trevi' })).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Ver Fontana di Trevi en el mapa' }))
    await userEvent.click(screen.getByRole('button', { name: 'Tocar el mapa' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('mapa').getAttribute('data-elegida')).toBe('')
  })

  it('con las animaciones activas el panel baja antes de desaparecer', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
    simularBackend([TREVI])
    renderizar()
    await screen.findByText('Puntos de interés (1)')
    await userEvent.click(screen.getByRole('button', { name: 'Ver Fontana di Trevi en el mapa' }))
    expect(screen.getByRole('dialog', { name: 'Fontana di Trevi' }).className).toBe('pi-panel')

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }))

    expect(screen.getByRole('dialog', { name: 'Fontana di Trevi' }).className).toBe('pi-panel-saliendo')
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Fontana di Trevi' })).toBeNull())
  })
})

describe('PuntosInteres · añadir un punto', () => {
  it('tocar el mapa abre el formulario con las coordenadas y guarda el punto sin dirección', async () => {
    const fetchMock = simularBackend([])
    renderizar()
    await screen.findByText(/Todavía no hay puntos/)

    await userEvent.click(screen.getByRole('button', { name: 'Tocar el mapa' }))

    const dialogo = screen.getByRole('dialog', { name: 'Nuevo punto de interés' })
    expect(within(dialogo).getByText('Sin dirección · 41,90000, 12,50000')).toBeTruthy()
    expect(screen.getByTestId('mapa').getAttribute('data-elegida')).toBe('41.9,12.5')
    const guardar = within(dialogo).getByRole('button', { name: 'Guardar punto' }) as HTMLButtonElement
    expect(guardar.disabled).toBe(true)

    await userEvent.type(within(dialogo).getByLabelText('Nombre del punto'), '  Mirador  ')
    await userEvent.type(within(dialogo).getByLabelText('Nota (opcional)'), 'Al atardecer')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cultura' }))
    await userEvent.click(guardar)

    expect(cuerpoDe(fetchMock, 'POST')).toEqual({
      nombre: 'Mirador',
      nota: 'Al atardecer',
      categoria: 'cultura',
      latitud: 41.9,
      longitud: 12.5,
      lugar_externo_id: null,
      direccion: null,
    })
    expect(await screen.findByText('Puntos de interés (1)')).toBeTruthy()
    expect(await screen.findByRole('dialog', { name: 'Mirador' })).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Nuevo punto de interés' })).toBeNull()
  })



  it('avisa si la búsqueda no encuentra nada o falla', async () => {
    simularBackend([])
    renderizar({ buscar: async () => [] })
    await screen.findByText(/Todavía no hay puntos/)
    await userEvent.type(screen.getByLabelText('Buscar una dirección'), 'xyz abc')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar dirección' }))
    expect(await screen.findByText(/No se han encontrado resultados/)).toBeTruthy()
    cleanup()

    simularBackend([])
    renderizar({
      buscar: async () => {
        throw new Error('caído')
      },
    })
    await screen.findByText(/Todavía no hay puntos/)
    await userEvent.type(screen.getByLabelText('Buscar una dirección'), 'Pantheon')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar dirección' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Ha ocurrido un error')
  })




  it('con el viaje finalizado no hay buscador y tocar el mapa no abre nada', async () => {
    simularBackend([TREVI])
    renderizar({ editable: false })
    await screen.findByText('Puntos de interés (1)')

    expect(screen.queryByLabelText('Buscar una dirección')).toBeNull()
    expect(screen.getByText('Solo se pueden añadir puntos mientras el viaje está activo.')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Tocar el mapa' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Eliminar Fontana di Trevi' })).toBeNull()
  })
})


