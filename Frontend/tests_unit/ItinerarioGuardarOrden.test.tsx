import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, configure, render, screen, waitFor, within } from '@testing-library/react'
import type { DragEndEvent } from '@dnd-kit/core'
import Itinerario from '../src/screens/Itinerario'
import { leerItinerario } from '../src/services/itinerarioGuardado'

configure({ asyncUtilTimeout: 5000 })

const soltar = vi.hoisted(() => ({ manejador: null as null | ((evento: DragEndEvent) => void | Promise<void>) }))

vi.mock('@dnd-kit/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@dnd-kit/core')>()
  return {
    ...original,
    DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: (evento: DragEndEvent) => void }) => {
      soltar.manejador = onDragEnd
      return <>{children}</>
    },
  }
})

vi.mock('../src/components/MapaActividades', () => ({
  default: () => <div data-testid="mapa" />,
}))

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(
    new Response(cuerpo === null ? null : JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

const viaje = () => ({
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

const AGENDA = [
  actividad('Desayuno', { hora_inicio: '08:30:00', orden: 0 }),
  actividad('Comida', { hora_inicio: '14:00:00', orden: 1 }),
  actividad('Paseo', { orden: 2 }),
  actividad('Compras', { orden: 3 }),
]

type Guardado = (url: string, init: RequestInit) => Promise<Response>

const simularBackend = (guardar: Guardado = () => respuesta(200, { actividades: [] })) => {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') return guardar(String(url), init)
    return String(url).includes('/actividades') ? respuesta(200, { actividades: AGENDA }) : respuesta(200, viaje())
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const llamadasPut = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'PUT') as unknown as [
    string,
    RequestInit & { headers: Record<string, string>; body: string },
  ][]

const renderizar = () => render(<Itinerario viajeId={VIAJE_ID} tokenSesion="token-acceso" />)

const titulosDeLaAgenda = () =>
  within(screen.getByRole('list', { name: 'Agenda del día' }))
    .getAllByRole('listitem')
    .map((item) => within(item).getAllByText(/./)[0]?.textContent)

const arrastrar = async (origen: string, destino: string) => {
  await act(async () => {
    await soltar.manejador?.({ active: { id: origen }, over: { id: destino } } as unknown as DragEndEvent)
  })
}

const arrastrarSinEsperar = async (origen: string, destino: string) => {
  await act(async () => {
    void soltar.manejador?.({ active: { id: origen }, over: { id: destino } } as unknown as DragEndEvent)
  })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
  soltar.manejador = null
})

describe('Itinerario · guardar el orden', () => {
  it('al soltar envía al servidor el orden de todo el día con la sesión', async () => {
    const fetchMock = simularBackend()
    renderizar()
    await screen.findByText('Paseo')

    await arrastrar('Compras', 'Paseo')

    await waitFor(() => expect(llamadasPut(fetchMock)).toHaveLength(1))
    const [url, init] = llamadasPut(fetchMock)[0]
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/actividades/orden$`))
    expect(init.headers.Authorization).toBe('Bearer token-acceso')
    expect(JSON.parse(init.body)).toEqual({
      fecha: '2027-05-12',
      actividades: ['Desayuno', 'Comida', 'Compras', 'Paseo'],
    })
  })

  it('muestra el nuevo orden sin esperar al servidor', async () => {
    let responder: (r: Response) => void = () => undefined
    simularBackend(() => new Promise<Response>((resolver) => (responder = resolver)))
    renderizar()
    await screen.findByText('Paseo')

    await arrastrarSinEsperar('Compras', 'Paseo')

    expect(titulosDeLaAgenda()).toEqual(['Desayuno', 'Comida', 'Compras', 'Paseo'])
    await act(async () => {
      responder(new Response(JSON.stringify({ actividades: [] }), { status: 200 }))
    })
  })

  it('colocar una sin hora entre las que tienen hora la deja entre ellas', async () => {
    const fetchMock = simularBackend()
    renderizar()
    await screen.findByText('Paseo')

    await arrastrar('Paseo', 'Comida')

    expect(titulosDeLaAgenda()).toEqual(['Desayuno', 'Paseo', 'Comida', 'Compras'])
    await waitFor(() => expect(llamadasPut(fetchMock)).toHaveLength(1))
    expect(JSON.parse(llamadasPut(fetchMock)[0][1].body).actividades).toEqual(['Desayuno', 'Paseo', 'Comida', 'Compras'])
  })

  it('al guardar actualiza lo que se verá sin conexión', async () => {
    simularBackend()
    renderizar()
    await screen.findByText('Paseo')

    await arrastrar('Compras', 'Paseo')

    await waitFor(() => {
      const guardado = leerItinerario(VIAJE_ID)
      expect(guardado?.actividades.find((a) => a.id === 'Compras')?.orden).toBe(2)
    })
  })

  it('usa las posiciones que devuelve el servidor', async () => {
    simularBackend(async () =>
      respuesta(200, {
        actividades: [
          actividad('Compras', { orden: 7 }),
          actividad('Paseo', { orden: 8 }),
        ],
      }),
    )
    renderizar()
    await screen.findByText('Paseo')

    await arrastrar('Compras', 'Paseo')

    await waitFor(() => {
      const guardado = leerItinerario(VIAJE_ID)
      expect(guardado?.actividades.find((a) => a.id === 'Compras')?.orden).toBe(7)
    })
    expect(titulosDeLaAgenda()).toEqual(['Desayuno', 'Comida', 'Compras', 'Paseo'])
  })

  it('si el servidor falla vuelve al orden anterior y avisa', async () => {
    simularBackend(() =>
      respuesta(502, { error: { codigo: 'error_actividad', mensaje: 'No se ha podido guardar el orden de las actividades' } }),
    )
    renderizar()
    await screen.findByText('Paseo')

    await arrastrar('Compras', 'Paseo')

    expect((await screen.findByRole('alert')).textContent).toBe('No se ha podido guardar el orden de las actividades')
    expect(titulosDeLaAgenda()).toEqual(['Desayuno', 'Comida', 'Paseo', 'Compras'])
  })

  it('si la agenda ha cambiado avisa, vuelve al orden anterior y recarga el día', async () => {
    let listados = 0
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        return respuesta(409, {
          error: { codigo: 'agenda_cambiada', mensaje: 'La agenda de ese día ha cambiado. Recárgala para ver las actividades actuales' },
        })
      }
      if (String(url).includes('/actividades')) {
        listados += 1
        return respuesta(200, { actividades: AGENDA })
      }
      return respuesta(200, viaje())
    })
    vi.stubGlobal('fetch', fetchMock)
    renderizar()
    await screen.findByText('Paseo')
    expect(listados).toBe(1)

    await arrastrar('Compras', 'Paseo')

    expect((await screen.findByRole('alert')).textContent).toMatch(/ha cambiado/)
    await waitFor(() => expect(listados).toBe(2))
    expect(titulosDeLaAgenda()).toEqual(['Desayuno', 'Comida', 'Paseo', 'Compras'])
  })

  it('no envía nada si el movimiento no es válido', async () => {
    const fetchMock = simularBackend()
    renderizar()
    await screen.findByText('Paseo')

    await arrastrar('Desayuno', 'Comida')
    await arrastrar('Paseo', 'Paseo')
    await arrastrar('Paseo', 'Fantasma')

    expect(llamadasPut(fetchMock)).toHaveLength(0)
    expect(titulosDeLaAgenda()).toEqual(['Desayuno', 'Comida', 'Paseo', 'Compras'])
  })

  it('no hace nada si se suelta fuera de la lista', async () => {
    const fetchMock = simularBackend()
    renderizar()
    await screen.findByText('Paseo')

    await act(async () => {
      await soltar.manejador?.({ active: { id: 'Paseo' }, over: null } as unknown as DragEndEvent)
    })

    expect(llamadasPut(fetchMock)).toHaveLength(0)
  })

  it('ignora un segundo movimiento mientras se guarda el primero', async () => {
    let responder: (r: Response) => void = () => undefined
    const fetchMock = simularBackend(() => new Promise<Response>((resolver) => (responder = resolver)))
    renderizar()
    await screen.findByText('Paseo')

    await arrastrarSinEsperar('Compras', 'Paseo')
    await arrastrarSinEsperar('Paseo', 'Comida')
    await act(async () => {
      responder(new Response(JSON.stringify({ actividades: [] }), { status: 200 }))
    })

    await waitFor(() => expect(llamadasPut(fetchMock)).toHaveLength(1))
    expect(titulosDeLaAgenda()).toEqual(['Desayuno', 'Comida', 'Compras', 'Paseo'])
  })

  it('después de un error se puede volver a intentar', async () => {
    let intento = 0
    const fetchMock = simularBackend(() =>
      intento++ === 0
        ? respuesta(502, { error: { codigo: 'error_actividad', mensaje: 'No se ha podido guardar el orden de las actividades' } })
        : respuesta(200, { actividades: [] }),
    )
    renderizar()
    await screen.findByText('Paseo')
    await arrastrar('Compras', 'Paseo')
    await screen.findByRole('alert')

    await arrastrar('Compras', 'Paseo')

    await waitFor(() => expect(llamadasPut(fetchMock)).toHaveLength(2))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(titulosDeLaAgenda()).toEqual(['Desayuno', 'Comida', 'Compras', 'Paseo'])
  })
})
