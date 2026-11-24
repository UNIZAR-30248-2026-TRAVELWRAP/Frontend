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

const ficha = () => screen.queryAllByRole('dialog').find((d) => !d.textContent?.includes('Se eliminará')) ?? null

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
})

afterEach(() => {
  document.body.style.overflow = ''
  cleanup()
  vi.unstubAllGlobals()
})

describe('PuntosInteres · lista y mapa', () => {

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

  it('buscar una dirección y elegirla rellena el nombre y envía su dirección y su lugar', async () => {
    const buscar = vi.fn(async () => [DIRECCION])
    const fetchMock = simularBackend([])
    renderizar({ buscar })
    await screen.findByText(/Todavía no hay puntos/)

    await userEvent.type(screen.getByLabelText('Buscar una dirección'), 'Pantheon')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar dirección' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Pantheon, Roma, Italia' }))

    expect(buscar).toHaveBeenCalledWith('Pantheon')
    const dialogo = screen.getByRole('dialog', { name: 'Nuevo punto de interés' })
    expect(within(dialogo).getByText('Pantheon, Piazza della Rotonda, Roma')).toBeTruthy()
    expect((within(dialogo).getByLabelText('Nombre del punto') as HTMLInputElement).value).toBe('Pantheon')
    expect(screen.queryByRole('list', { name: 'Resultados de la búsqueda' })).toBeNull()

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Guardar punto' }))

    expect(cuerpoDe(fetchMock, 'POST')).toMatchObject({
      nombre: 'Pantheon',
      latitud: 41.8986,
      longitud: 12.4769,
      lugar_externo_id: 'way/9',
      direccion: 'Pantheon, Piazza della Rotonda, Roma',
    })
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


  it('muestra el error del servidor al guardar y deja el formulario abierto', async () => {
    simularBackend([], { falloCrear: true })
    renderizar()
    await screen.findByText(/Todavía no hay puntos/)
    await userEvent.click(screen.getByRole('button', { name: 'Tocar el mapa' }))
    const dialogo = screen.getByRole('dialog', { name: 'Nuevo punto de interés' })
    await userEvent.type(within(dialogo).getByLabelText('Nombre del punto'), 'Mirador')

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Guardar punto' }))

    expect((await within(dialogo).findByRole('alert')).textContent).toBe('El nombre es obligatorio y tiene un máximo de 120 caracteres')
    expect(screen.getByRole('dialog', { name: 'Nuevo punto de interés' })).toBeTruthy()
  })

  it('cancelar descarta el punto elegido sin guardar nada', async () => {
    const fetchMock = simularBackend([])
    renderizar()
    await screen.findByText(/Todavía no hay puntos/)
    await userEvent.click(screen.getByRole('button', { name: 'Tocar el mapa' }))

    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('mapa').getAttribute('data-elegida')).toBe('')
    expect(cuerpoDe(fetchMock, 'POST')).toBeNull()
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

describe('PuntosInteres · borrar un punto', () => {
  it('pide confirmación desde la lista y lo borra para todos', async () => {
    const fetchMock = simularBackend([TREVI, HELADERIA])
    renderizar()
    await screen.findByText('Puntos de interés (2)')

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar Heladería' }))
    const dialogo = screen.getByRole('dialog', { name: '¿Eliminar este punto de interés?' })
    expect(dialogo.textContent).toContain('Heladería')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Eliminar punto' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByText('Puntos de interés (1)')).toBeTruthy()
    const borrado = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'DELETE')
    expect(String(borrado?.[0])).toMatch(/puntos-de-interes\/p2$/)
  })

  it('se puede borrar desde la ficha, que se cierra al borrar', async () => {
    simularBackend([TREVI])
    renderizar()
    await screen.findByText('Puntos de interés (1)')
    await userEvent.click(screen.getByRole('button', { name: 'Ver Fontana di Trevi en el mapa' }))

    await userEvent.click(within(screen.getByRole('dialog', { name: 'Fontana di Trevi' })).getByRole('button', { name: 'Borrar' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: '¿Eliminar este punto de interés?' })).getByRole('button', { name: 'Eliminar punto' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByTestId('mapa').getAttribute('data-seleccionado')).toBe('')
    expect(screen.getByText(/Todavía no hay puntos/)).toBeTruthy()
  })

  it('cancelar no borra nada y un fallo del servidor se avisa en el diálogo', async () => {
    simularBackend([TREVI], { falloBorrar: true })
    renderizar()
    await screen.findByText('Puntos de interés (1)')

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar Fontana di Trevi' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar Fontana di Trevi' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar punto' }))
    expect((await within(screen.getByRole('dialog')).findByRole('alert')).textContent).toBe('El viaje está finalizado y ya no se puede modificar')
    expect(screen.getByText('Puntos de interés (1)')).toBeTruthy()
  })
})

describe('PuntosInteres · filtros', () => {
  const todos = () => simularBackend([TREVI, HELADERIA, MIRADOR])
  const grupo = (nombre: string) => screen.getByRole('group', { name: nombre })


  it('filtrar por tipo cambia la lista, el mapa y el contador, y «Todos» lo quita', async () => {
    todos()
    renderizar()
    await screen.findByText('Puntos de interés (3)')

    await userEvent.click(within(grupo('Filtrar por tipo')).getByRole('button', { name: 'Comida' }))

    expect(screen.getByText('Puntos de interés (1 de 3)')).toBeTruthy()
    expect(screen.getByTestId('nombres-en-mapa').textContent).toBe('Heladería')
    expect(within(screen.getByRole('list', { name: 'Puntos de interés' })).getAllByRole('listitem')).toHaveLength(1)

    await userEvent.click(within(grupo('Filtrar por tipo')).getByRole('button', { name: 'Sin tipo' }))
    expect(screen.getByTestId('nombres-en-mapa').textContent).toBe('Mirador')

    await userEvent.click(within(grupo('Filtrar por tipo')).getByRole('button', { name: 'Todos' }))
    expect(screen.getByText('Puntos de interés (3)')).toBeTruthy()
  })

  it('filtrar por quién lo añadió, y combinado con el tipo', async () => {
    todos()
    renderizar()
    await screen.findByText('Puntos de interés (3)')

    await userEvent.click(within(grupo('Filtrar por quién lo añadió')).getByRole('button', { name: /Adriana/ }))
    expect(screen.getByTestId('nombres-en-mapa').textContent).toBe('Fontana di Trevi|Mirador')

    await userEvent.click(within(grupo('Filtrar por tipo')).getByRole('button', { name: 'Cultura' }))
    expect(screen.getByTestId('nombres-en-mapa').textContent).toBe('Fontana di Trevi')
    expect(screen.getByText('Puntos de interés (1 de 3)')).toBeTruthy()

    await userEvent.click(within(grupo('Filtrar por quién lo añadió')).getByRole('button', { name: /Berta/ }))
    expect(screen.getByText('Ningún punto coincide con el filtro.')).toBeTruthy()
  })


})
