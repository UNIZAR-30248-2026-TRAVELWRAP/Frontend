import { afterEach, describe, expect, it, vi } from 'vitest'
import { beforeEach as antesDeCadaPrueba } from 'vitest'
import { olvidarViajes } from '../src/services/viajesEnCache'
antesDeCadaPrueba(() => olvidarViajes())
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
  portada_url: null,
  rol: 'creador',
  miembros: [
    { usuario_id: 'u1', nombre: 'Adriana', avatar_url: null, rol: 'creador' },
    { usuario_id: 'u2', nombre: 'Berta', avatar_url: null, rol: 'miembro' },
  ],
  ...datos,
})

const tarea = (id: string, responsable: string | null, hecha = false) => ({
  id,
  texto: `Tarea ${id}`,
  hecha,
  hecha_en: hecha ? '2026-11-01T10:00:00Z' : null,
  creado_en: '2026-10-20T10:00:00Z',
  responsable: responsable ? { usuario_id: responsable, nombre: 'Alguien', avatar_url: null } : null,
})

const simularBackend = (
  datos: Record<string, unknown> = {},
  finalizar = () => respuesta(200, viaje({ ...datos, estado: 'finalizado' })),
  tareas: ReturnType<typeof tarea>[] = [],
) => {
  const fetchMock = vi.fn((url: string, opciones?: RequestInit) => {
    if (opciones?.method === 'POST' && url.endsWith('/finalizar')) return finalizar()
    if (url.endsWith('/tareas')) return respuesta(200, { tareas })
    if (url.endsWith('/playlist')) return respuesta(200, { playlist: null })
    if (url.endsWith('/resumen')) return respuesta(200, resumen())
    return respuesta(200, viaje(datos))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// Resumen del viaje con el presupuesto restante (1240 de presupuesto, 300 gastados)
const resumen = (presupuesto: Record<string, number> = { total: 1240, gastado: 300, restante: 940 }) => ({
  dias: 4,
  actividad_mas_votada: null,
  alma_del_grupo: null,
  presupuesto,
})

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
    const [url, opciones] = fetchMock.mock.calls.find(([u]) => !u.endsWith('/tareas')) as unknown as [string, RequestInit & { headers: Record<string, string> }]
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

  it('un miembro que no es el creador también puede editar el viaje', async () => {
    const user = userEvent.setup()
    simularBackend({ rol: 'miembro' })
    const onEditar = vi.fn()
    renderizar({ onEditar })

    expect(await screen.findByRole('button', { name: 'Invitar' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cambiar portada' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Editar viaje' }))
    expect(onEditar).toHaveBeenCalledTimes(1)
  })

  it('con portada la muestra de fondo de la cabecera, para el creador y para los miembros', async () => {
    const portada = 'https://storage.test/portadas/roma.jpg?token=abc'
    simularBackend({ portada_url: portada })
    const { unmount } = renderizar()
    expect((await screen.findByTestId('fondo-portada')).getAttribute('src')).toBe(portada)
    unmount()

    simularBackend({ portada_url: portada, rol: 'miembro' })
    renderizar()
    expect((await screen.findByTestId('fondo-portada')).getAttribute('src')).toBe(portada)
  })

  it('sin portada la cabecera se ve como siempre', async () => {
    simularBackend()
    renderizar()

    expect(await screen.findByText('Roma')).toBeTruthy()
    expect(screen.queryByTestId('fondo-portada')).toBeNull()
  })

  it('en un viaje finalizado nadie puede cambiar la portada', async () => {
    simularBackend({ estado: 'finalizado', rol: 'miembro' })
    renderizar()

    expect(await screen.findByText('Finalizado')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cambiar portada' })).toBeNull()
  })

  it('cualquier miembro puede finalizar el viaje, sea o no el creador', async () => {
    simularBackend()
    const { unmount } = renderizar()
    expect(await screen.findByRole('button', { name: 'Finalizar viaje' })).toBeTruthy()
    unmount()

    simularBackend({ rol: 'miembro' })
    renderizar()
    expect(await screen.findByRole('button', { name: 'Finalizar viaje' })).toBeTruthy()
  })

  it('un viaje finalizado es de solo lectura', async () => {
    simularBackend({ estado: 'finalizado' })
    renderizar()

    expect(await screen.findByText('Finalizado')).toBeTruthy()
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
    expect(within(ventana).queryByText('Esta acción no se puede deshacer.')).toBeNull()

    await user.click(within(ventana).getByRole('button', { name: 'Cancelar' }))

    expect(dialogo()).toBeNull()
    // Solo se cargan datos: ninguna petición de cambio (POST) hasta confirmar
    expect(fetchMock.mock.calls.some(([, opciones]) => opciones?.method === 'POST')).toBe(false)
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







  it('si no se puede comprobar el saldo lo explica y no abre ningún diálogo', async () => {
    simularAbandono({ balance: () => respuesta(502, { error: { codigo: 'error_gastos', mensaje: 'Fallo' } }) })
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Abandonar' }))

    expect((await screen.findByRole('alert')).textContent).toBe('No se ha podido comprobar tu saldo: Fallo')
    expect(dialogo()).toBeNull()
  })
})

