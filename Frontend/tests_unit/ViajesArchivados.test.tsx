import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ViajesArchivados from '../src/screens/ViajesArchivados'
import { guardarItinerario, leerItinerario } from '../src/services/itinerarioGuardado'

const respuesta = (estado: number, cuerpo?: unknown) =>
  Promise.resolve(
    cuerpo === undefined
      ? new Response(null, { status: estado })
      : new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }),
  )

const viaje = (id: string, datos: Record<string, unknown> = {}) => ({
  id,
  nombre: `Viaje ${id}`,
  destino: 'París',
  descripcion: null,
  fecha_inicio: '2024-06-20',
  fecha_fin: '2024-06-24',
  moneda: 'EUR',
  presupuesto: 1240,
  estado: 'finalizado',
  creado_en: '2024-05-01T10:00:00Z',
  pendiente_destino: false,
  rol: 'creador',
  archivado: true,
  miembros: [
    { usuario_id: 'u1', nombre: 'Adriana', avatar_url: null, rol: 'creador' },
    { usuario_id: 'u2', nombre: 'Daniel', avatar_url: null, rol: 'miembro' },
  ],
  ...datos,
})

// GET devuelve los archivados y DELETE la respuesta indicada
const simularBackend = (viajes: unknown[], borrar = () => respuesta(204)) => {
  const fetchMock = vi.fn((_url: string, opciones?: RequestInit) =>
    opciones?.method === 'DELETE' ? borrar() : respuesta(200, { viajes }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const dialogo = () => screen.queryByRole('dialog')

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('ViajesArchivados', () => {
  it('pide solo los viajes archivados y los muestra con destino, fechas, viajeros e importe', async () => {
    const fetchMock = simularBackend([viaje('a', { nombre: 'París 2024' })])

    render(<ViajesArchivados tokenSesion="token-acceso" />)

    const tarjeta = await screen.findByRole('button', { name: /^París 2024/ })
    expect(tarjeta.textContent).toContain('París · 20–24 jun 2024')
    expect(tarjeta.textContent).toContain('2 viajeros')
    expect(tarjeta.textContent).toContain('1.240 €')
    expect(screen.getByText('1 viaje guardado')).toBeTruthy()
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toMatch(/\/viajes\?archivados=true$/)
  })

  it('muestra un estado vacío si no hay viajes archivados', async () => {
    simularBackend([])

    render(<ViajesArchivados tokenSesion="token-acceso" />)

    expect(await screen.findByText('No tienes viajes archivados')).toBeTruthy()
    expect(screen.getByText('Cuando archives un viaje finalizado aparecerá aquí.')).toBeTruthy()
  })

  it('avisa si no se pueden cargar', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))

    render(<ViajesArchivados tokenSesion="token-acceso" />)

    expect((await screen.findByRole('alert')).textContent).toContain('No se puede conectar con el servidor')
  })

  it('avisa del viaje que se quiere consultar y de volver', async () => {
    const user = userEvent.setup()
    simularBackend([viaje('a', { nombre: 'París 2024' })])
    const onVerViaje = vi.fn()
    const onVolver = vi.fn()
    render(<ViajesArchivados tokenSesion="token-acceso" onVerViaje={onVerViaje} onVolver={onVolver} />)

    await user.click(await screen.findByRole('button', { name: /^París 2024/ }))
    await user.click(screen.getByRole('button', { name: 'Volver' }))

    expect(onVerViaje).toHaveBeenCalledWith('a')
    expect(onVolver).toHaveBeenCalledTimes(1)
  })
})

describe('ViajesArchivados · eliminar con confirmación', () => {
  it('cualquier miembro ve el botón de eliminar, sea o no el creador', async () => {
    simularBackend([viaje('mio', { nombre: 'Mío' }), viaje('ajeno', { nombre: 'Ajeno', rol: 'miembro' })])

    render(<ViajesArchivados tokenSesion="token-acceso" />)

    expect(await screen.findByRole('button', { name: 'Eliminar Mío' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Eliminar Ajeno' })).toBeTruthy()
  })

  it('pide confirmación y al cancelar no borra nada', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend([viaje('a', { nombre: 'París 2024' })])
    render(<ViajesArchivados tokenSesion="token-acceso" />)

    await user.click(await screen.findByRole('button', { name: 'Eliminar París 2024' }))
    const ventana = dialogo()!
    expect(within(ventana).getByText('¿Eliminar este viaje para ti?')).toBeTruthy()
    expect(ventana.textContent).toContain('¿Quieres eliminar París 2024 para ti?')
    expect(ventana.textContent).toContain('Dejará de aparecer en tu cuenta y no podrás recuperarlo')

    await user.click(within(ventana).getByRole('button', { name: 'Cancelar' }))

    expect(dialogo()).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /^París 2024/ })).toBeTruthy()
  })

  it('al confirmar elimina el viaje en el backend, lo quita de la lista y borra su copia sin conexión', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend([viaje('a', { nombre: 'París 2024' }), viaje('b', { nombre: 'Lisboa 2023' })])
    guardarItinerario('a', { viaje: viaje('a') as never, actividades: [], guardadoEn: '2024-06-01T10:00:00.000Z' })
    guardarItinerario('b', { viaje: viaje('b') as never, actividades: [], guardadoEn: '2024-06-01T10:00:00.000Z' })
    render(<ViajesArchivados tokenSesion="token-acceso" />)

    await user.click(await screen.findByRole('button', { name: 'Eliminar París 2024' }))
    await user.click(within(dialogo()!).getByRole('button', { name: 'Eliminar viaje' }))

    await vi.waitFor(() => expect(screen.queryByText('París 2024')).toBeNull())
    expect(screen.getByText('Lisboa 2023')).toBeTruthy()
    expect(screen.getByText('1 viaje guardado')).toBeTruthy()
    expect(dialogo()).toBeNull()
    const [url, opciones] = fetchMock.mock.calls[1] as unknown as [string, RequestInit & { headers: Record<string, string> }]
    expect(url).toMatch(/\/viajes\/a$/)
    expect(opciones.method).toBe('DELETE')
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
    expect(leerItinerario('a')).toBeNull()
    expect(leerItinerario('b')?.viaje.id).toBe('b')
  })

  it('si el backend no lo borra muestra el error y mantiene el viaje', async () => {
    const user = userEvent.setup()
    simularBackend([viaje('a', { nombre: 'París 2024' })], () =>
      respuesta(502, { error: { codigo: 'error_viaje', mensaje: 'No se ha podido eliminar el viaje' } }),
    )
    render(<ViajesArchivados tokenSesion="token-acceso" />)

    await user.click(await screen.findByRole('button', { name: 'Eliminar París 2024' }))
    await user.click(within(dialogo()!).getByRole('button', { name: 'Eliminar viaje' }))

    expect((await within(dialogo()!).findByRole('alert')).textContent).toBe('No se ha podido eliminar el viaje')
    expect(screen.getByRole('button', { name: /^París 2024/ })).toBeTruthy()
  })

  it('si no se elimina conserva la copia sin conexión del viaje', async () => {
    const user = userEvent.setup()
    simularBackend([viaje('a', { nombre: 'París 2024' })], () =>
      respuesta(502, { error: { codigo: 'error_viaje', mensaje: 'No se ha podido eliminar el viaje' } }),
    )
    guardarItinerario('a', { viaje: viaje('a') as never, actividades: [], guardadoEn: '2024-06-01T10:00:00.000Z' })
    render(<ViajesArchivados tokenSesion="token-acceso" />)

    await user.click(await screen.findByRole('button', { name: 'Eliminar París 2024' }))
    await user.click(within(dialogo()!).getByRole('button', { name: 'Eliminar viaje' }))

    await within(dialogo()!).findByRole('alert')
    expect(leerItinerario('a')?.viaje.id).toBe('a')
  })
})

// GET devuelve los archivados y POST /desarchivar la respuesta indicada
const simularBackendDesarchivar = (viajes: unknown[], desarchivar = () => respuesta(200, viaje('a', { archivado: false }))) => {
  const fetchMock = vi.fn((_url: string, opciones?: RequestInit) =>
    opciones?.method === 'POST' ? desarchivar() : respuesta(200, { viajes }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('ViajesArchivados · desarchivar con confirmación', () => {
  it('cualquier miembro ve el botón de desarchivar, sea o no el creador', async () => {
    simularBackendDesarchivar([viaje('mio', { nombre: 'Mío' }), viaje('ajeno', { nombre: 'Ajeno', rol: 'miembro' })])

    render(<ViajesArchivados tokenSesion="token-acceso" />)

    expect(await screen.findByRole('button', { name: 'Desarchivar Mío' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Desarchivar Ajeno' })).toBeTruthy()
  })

  it('pide confirmación y al cancelar no desarchiva nada', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackendDesarchivar([viaje('a', { nombre: 'París 2024' })])
    render(<ViajesArchivados tokenSesion="token-acceso" />)

    await user.click(await screen.findByRole('button', { name: 'Desarchivar París 2024' }))
    const ventana = dialogo()!
    expect(within(ventana).getByText('¿Desarchivar este viaje?')).toBeTruthy()
    expect(ventana.textContent).toContain('París 2024 volverá a Viajes anteriores, solo para ti')
    expect(ventana.textContent).not.toContain('activo')

    await user.click(within(ventana).getByRole('button', { name: 'Cancelar' }))

    expect(dialogo()).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /^París 2024/ })).toBeTruthy()
  })

  it('al confirmar desarchiva en el backend, lo quita de la lista y no navega', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackendDesarchivar([viaje('a', { nombre: 'París 2024' }), viaje('b', { nombre: 'Lisboa 2023' })])
    const onVolver = vi.fn()
    const onVerViaje = vi.fn()
    render(<ViajesArchivados tokenSesion="token-acceso" onVolver={onVolver} onVerViaje={onVerViaje} />)

    await user.click(await screen.findByRole('button', { name: 'Desarchivar París 2024' }))
    await user.click(within(dialogo()!).getByRole('button', { name: 'Desarchivar viaje' }))

    await vi.waitFor(() => expect(screen.queryByText('París 2024')).toBeNull())
    expect(screen.getByText('Lisboa 2023')).toBeTruthy()
    expect(screen.getByText('1 viaje guardado')).toBeTruthy()
    expect(dialogo()).toBeNull()
    const [url, opciones] = fetchMock.mock.calls[1] as unknown as [string, RequestInit & { headers: Record<string, string> }]
    expect(url).toMatch(/\/viajes\/a\/desarchivar$/)
    expect(opciones.method).toBe('POST')
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
    expect(onVolver).not.toHaveBeenCalled()
    expect(onVerViaje).not.toHaveBeenCalled()
  })

  it('si el backend no lo desarchiva muestra el error y mantiene el viaje', async () => {
    const user = userEvent.setup()
    simularBackendDesarchivar([viaje('a', { nombre: 'París 2024' })], () =>
      respuesta(502, { error: { codigo: 'error_viaje', mensaje: 'No se ha podido desarchivar el viaje' } }),
    )
    render(<ViajesArchivados tokenSesion="token-acceso" />)

    await user.click(await screen.findByRole('button', { name: 'Desarchivar París 2024' }))
    await user.click(within(dialogo()!).getByRole('button', { name: 'Desarchivar viaje' }))

    expect((await within(dialogo()!).findByRole('alert')).textContent).toBe('No se ha podido desarchivar el viaje')
    expect(screen.getByRole('button', { name: /^París 2024/ })).toBeTruthy()
  })
})
