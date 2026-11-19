import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InicioViaje from '../src/screens/InicioViaje'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

const viaje = (datos: Record<string, unknown> = {}) => ({
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  destino: 'Roma',
  descripcion: null,
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-15',
  moneda: 'EUR',
  presupuesto: 1240,
  estado: 'activo',
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  rol: 'creador',
  miembros: [
    { usuario_id: 'u1', nombre: 'Adriana', avatar_url: null, rol: 'creador' },
    { usuario_id: 'u2', nombre: 'Berta', avatar_url: null, rol: 'miembro' },
  ],
  ...datos,
})

// GET devuelve el viaje y POST /finalizar lo devuelve finalizado (o la respuesta indicada)
const simularBackend = (datos: Record<string, unknown> = {}, finalizar = () => respuesta(200, viaje({ ...datos, estado: 'finalizado' }))) => {
  const fetchMock = vi.fn((url: string, opciones?: RequestInit) =>
    opciones?.method === 'POST' && url.endsWith('/finalizar') ? finalizar() : respuesta(200, viaje(datos)),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const renderizar = (props: Partial<Parameters<typeof InicioViaje>[0]> = {}) =>
  render(<InicioViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" usuarioId="u1" {...props} />)

const dialogo = () => screen.queryByRole('dialog')

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('InicioViaje', () => {
  it('pide el viaje de la URL con el token y muestra destino, fechas, presupuesto y viajeros', async () => {
    const fetchMock = simularBackend()
    renderizar()

    expect(await screen.findByText('Roma')).toBeTruthy()
    expect(screen.getByText('Roma 2027')).toBeTruthy()
    expect(screen.getByText('12 – 15 may · 4 días')).toBeTruthy()
    expect(screen.getByText('1.240 €')).toBeTruthy()
    expect(screen.getByRole('group', { name: '2 viajeros' })).toBeTruthy()
    const [url, opciones] = fetchMock.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }]
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}$`))
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
  })

  it('incluye la barra inferior con «Inicio» activo', async () => {
    simularBackend()
    renderizar()

    const barra = await screen.findByRole('navigation', { name: 'Secciones del viaje' })
    expect(within(barra).getByRole('button', { name: 'Inicio' }).getAttribute('aria-current')).toBe('page')
  })

  it('avisa al pulsar «Invitar» y al volver a Mis Viajes', async () => {
    const user = userEvent.setup()
    simularBackend()
    const avisos = { onInvitar: vi.fn(), onVolver: vi.fn() }
    renderizar(avisos)

    await user.click(await screen.findByRole('button', { name: 'Invitar' }))
    await user.click(screen.getByRole('button', { name: 'Volver a Mis Viajes' }))

    expect(avisos.onInvitar).toHaveBeenCalledTimes(1)
    expect(avisos.onVolver).toHaveBeenCalledTimes(1)
  })

  it('al creador le deja editar el viaje', async () => {
    const user = userEvent.setup()
    simularBackend()
    const onEditar = vi.fn()
    renderizar({ onEditar })

    await user.click(await screen.findByRole('button', { name: /Editar viaje/ }))

    expect(onEditar).toHaveBeenCalledTimes(1)
  })

  it('a un miembro que no es el creador no le deja editar el viaje', async () => {
    simularBackend({ rol: 'miembro' })
    renderizar()

    expect(await screen.findByRole('button', { name: 'Invitar' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Editar viaje/ })).toBeNull()
  })

  it('solo el creador puede finalizar el viaje', async () => {
    simularBackend()
    const { unmount } = renderizar()
    expect(await screen.findByRole('button', { name: 'Finalizar viaje' })).toBeTruthy()
    unmount()

    simularBackend({ rol: 'miembro' })
    renderizar()
    expect(await screen.findByRole('button', { name: 'Invitar' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Finalizar viaje' })).toBeNull()
  })

  it('un viaje finalizado es de solo lectura', async () => {
    simularBackend({ estado: 'finalizado' })
    renderizar()

    expect(await screen.findByText(/Este viaje está finalizado/)).toBeTruthy()
    expect(screen.getByText('Finalizado')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Editar viaje/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Finalizar viaje' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Invitar' })).toBeNull()
  })

  it('un viaje pendiente de destino lleva a la votación del destino sin mostrar el inicio', async () => {
    simularBackend({ destino: null, pendiente_destino: true })
    const onPendienteDestino = vi.fn()
    const { container } = renderizar({ onPendienteDestino })

    await vi.waitFor(() => expect(onPendienteDestino).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })

  it('cualquier miembro puede abrir las votaciones', async () => {
    const user = userEvent.setup()
    simularBackend({ rol: 'miembro' })
    const onVotaciones = vi.fn()
    renderizar({ onVotaciones })

    await user.click(await screen.findByRole('button', { name: /Votaciones/ }))

    expect(onVotaciones).toHaveBeenCalledTimes(1)
  })

  it('avisa si no se puede cargar el viaje', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      respuesta(404, { error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe o no perteneces a él' } }),
    ))
    renderizar()

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No se ha podido cargar el viaje: El viaje no existe o no perteneces a él',
    )
  })
})

describe('InicioViaje · finalizar viaje con confirmación', () => {
  it('pide confirmación antes de cerrar y se puede cancelar sin llamar al backend', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Finalizar viaje' }))
    const ventana = dialogo()!
    expect(within(ventana).getByText('¿Finalizar este viaje?')).toBeTruthy()
    expect(within(ventana).getByText(/pasará a «Viajes anteriores»/)).toBeTruthy()
    expect(within(ventana).getByText('Esta acción no se puede deshacer.')).toBeTruthy()

    await user.click(within(ventana).getByRole('button', { name: 'Cancelar' }))

    expect(dialogo()).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('al confirmar finaliza el viaje y avisa con el viaje finalizado', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    const onFinalizado = vi.fn()
    renderizar({ onFinalizado })

    await user.click(await screen.findByRole('button', { name: 'Finalizar viaje' }))
    await user.click(within(dialogo()!).getByRole('button', { name: 'Finalizar viaje' }))

    await vi.waitFor(() => expect(onFinalizado).toHaveBeenCalledTimes(1))
    expect(onFinalizado.mock.calls[0][0].estado).toBe('finalizado')
    const [url, opciones] = fetchMock.mock.calls[1] as unknown as [string, RequestInit]
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/finalizar$`))
    expect(opciones.method).toBe('POST')
    expect(dialogo()).toBeNull()
  })

  it('si el backend no lo finaliza muestra el error en el diálogo', async () => {
    const user = userEvent.setup()
    simularBackend({}, () =>
      respuesta(403, { error: { codigo: 'no_creador', mensaje: 'Solo el creador del viaje puede hacerlo' } }),
    )
    const onFinalizado = vi.fn()
    renderizar({ onFinalizado })

    await user.click(await screen.findByRole('button', { name: 'Finalizar viaje' }))
    await user.click(within(dialogo()!).getByRole('button', { name: 'Finalizar viaje' }))

    expect((await within(dialogo()!).findByRole('alert')).textContent).toBe('Solo el creador del viaje puede hacerlo')
    expect(onFinalizado).not.toHaveBeenCalled()
  })
})

// Abandonar: el saldo de quien usa la app viene de GET /gastos/balance; POST /abandonar responde lo indicado
const simularAbandono = ({
  rol = 'miembro',
  saldo = 0,
  abandonar = () => Promise.resolve(new Response(null, { status: 204 })),
  balance = () => respuesta(200, { saldos: [{ usuario_id: 'u1', nombre: 'Adriana', pagado: 0, parte: 0, saldo }] }),
}: {
  rol?: string
  saldo?: number
  abandonar?: () => Promise<Response>
  balance?: () => Promise<Response>
} = {}) => {
  const fetchMock = vi.fn((url: string, opciones?: RequestInit) => {
    if (opciones?.method === 'POST' && url.endsWith('/abandonar')) return abandonar()
    if (url.endsWith('/gastos/balance')) return balance()
    return respuesta(200, viaje({ rol }))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('InicioViaje · abandonar el viaje', () => {
  it('el creador no ve «Abandonar viaje»', async () => {
    simularAbandono({ rol: 'creador' })
    renderizar()

    await screen.findByRole('button', { name: 'Editar viaje' })
    expect(screen.queryByRole('button', { name: 'Abandonar' })).toBeNull()
  })

  it('a un miembro que no es el creador le aparece «Abandonar» en la cabecera', async () => {
    simularAbandono()
    renderizar()

    expect(await screen.findByRole('button', { name: 'Abandonar' })).toBeTruthy()
  })

  it('con el saldo a cero pide confirmación y, al confirmar, abandona y avisa a la pantalla', async () => {
    const fetchMock = simularAbandono({ saldo: 0 })
    const onAbandonado = vi.fn()
    renderizar({ onAbandonado })

    await userEvent.click(await screen.findByRole('button', { name: 'Abandonar' }))
    expect(screen.getByRole('dialog').textContent).toContain('¿Abandonar este viaje?')
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Abandonar viaje' }))

    await vi.waitFor(() => expect(onAbandonado).toHaveBeenCalledTimes(1))
    const [url] = fetchMock.mock.calls.find(([, opciones]) => opciones?.method === 'POST') as unknown as [string]
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/abandonar$`))
  })

  it('cancelar la confirmación no abandona el viaje', async () => {
    const fetchMock = simularAbandono({ saldo: 0 })
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Abandonar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(dialogo()).toBeNull()
    expect(fetchMock.mock.calls.some(([, opciones]) => opciones?.method === 'POST')).toBe(false)
  })

  it('con deudas avisa de lo que debe y no abandona; el botón lleva a Control de Gastos', async () => {
    const fetchMock = simularAbandono({ saldo: -30 })
    const onCambiarSeccion = vi.fn()
    renderizar({ onCambiarSeccion })

    await userEvent.click(await screen.findByRole('button', { name: 'Abandonar' }))
    expect(screen.getByRole('dialog').textContent).toContain('Debes 30,00 € en este viaje.')
    await userEvent.click(screen.getByRole('button', { name: 'Ir a Control de Gastos' }))

    expect(onCambiarSeccion).toHaveBeenCalledWith('gastos')
    expect(fetchMock.mock.calls.some(([, opciones]) => opciones?.method === 'POST')).toBe(false)
  })

  it('si le deben dinero, el aviso lo dice', async () => {
    simularAbandono({ saldo: 12.5 })
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Abandonar' }))
    expect(screen.getByRole('dialog').textContent).toContain('Te deben 12,50 € en este viaje.')
  })

  it('si el backend rechaza el abandono, el motivo sale en el diálogo y el viaje sigue', async () => {
    const onAbandonado = vi.fn()
    simularAbandono({
      saldo: 0,
      abandonar: () => respuesta(409, { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está finalizado y ya no se puede modificar' } }),
    })
    renderizar({ onAbandonado })

    await userEvent.click(await screen.findByRole('button', { name: 'Abandonar' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Abandonar viaje' }))

    expect((await within(screen.getByRole('dialog')).findByRole('alert')).textContent).toBe(
      'El viaje está finalizado y ya no se puede modificar',
    )
    expect(onAbandonado).not.toHaveBeenCalled()
  })

  it('si no se puede comprobar el saldo lo explica y no abre ningún diálogo', async () => {
    simularAbandono({ balance: () => respuesta(502, { error: { codigo: 'error_gastos', mensaje: 'Fallo' } }) })
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Abandonar' }))

    expect((await screen.findByRole('alert')).textContent).toBe('No se ha podido comprobar tu saldo: Fallo')
    expect(dialogo()).toBeNull()
  })
})
