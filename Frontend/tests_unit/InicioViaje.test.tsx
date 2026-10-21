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

// GET devuelve el viaje y POST /archivar lo devuelve archivado (o la respuesta indicada)
const simularBackend = (datos: Record<string, unknown> = {}, archivar = () => respuesta(200, viaje({ ...datos, estado: 'archivado' }))) => {
  const fetchMock = vi.fn((url: string, opciones?: RequestInit) =>
    opciones?.method === 'POST' && url.endsWith('/archivar') ? archivar() : respuesta(200, viaje(datos)),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const renderizar = (props: Partial<Parameters<typeof InicioViaje>[0]> = {}) =>
  render(<InicioViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" {...props} />)

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
    expect(screen.getByText('2 viajeros')).toBeTruthy()
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

  it('solo el creador puede cerrar el viaje', async () => {
    simularBackend()
    const { unmount } = renderizar()
    expect(await screen.findByRole('button', { name: 'Cerrar viaje' })).toBeTruthy()
    unmount()

    simularBackend({ rol: 'miembro' })
    renderizar()
    expect(await screen.findByRole('button', { name: 'Invitar' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cerrar viaje' })).toBeNull()
  })

  it('un viaje archivado es de solo lectura', async () => {
    simularBackend({ estado: 'archivado' })
    renderizar()

    expect(await screen.findByText(/Este viaje está archivado/)).toBeTruthy()
    expect(screen.getByText('Archivado')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Editar viaje/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cerrar viaje' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Invitar' })).toBeNull()
  })

  it('un viaje pendiente de destino lo indica', async () => {
    simularBackend({ destino: null, pendiente_destino: true })
    renderizar()

    expect(await screen.findByText('Destino por decidir')).toBeTruthy()
    expect(screen.getByText(/El destino se decidirá por votación/)).toBeTruthy()
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

describe('InicioViaje · cerrar viaje con confirmación', () => {
  it('pide confirmación antes de cerrar y se puede cancelar sin llamar al backend', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Cerrar viaje' }))
    const ventana = dialogo()!
    expect(within(ventana).getByText('¿Cerrar este viaje?')).toBeTruthy()
    expect(within(ventana).getByText('Esta acción no se puede deshacer.')).toBeTruthy()

    await user.click(within(ventana).getByRole('button', { name: 'Cancelar' }))

    expect(dialogo()).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('al confirmar archiva el viaje y avisa con el viaje archivado', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    const onArchivado = vi.fn()
    renderizar({ onArchivado })

    await user.click(await screen.findByRole('button', { name: 'Cerrar viaje' }))
    await user.click(within(dialogo()!).getByRole('button', { name: 'Cerrar viaje' }))

    await vi.waitFor(() => expect(onArchivado).toHaveBeenCalledTimes(1))
    expect(onArchivado.mock.calls[0][0].estado).toBe('archivado')
    const [url, opciones] = fetchMock.mock.calls[1] as unknown as [string, RequestInit]
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/archivar$`))
    expect(opciones.method).toBe('POST')
    expect(dialogo()).toBeNull()
  })

  it('si el backend no lo archiva muestra el error en el diálogo', async () => {
    const user = userEvent.setup()
    simularBackend({}, () =>
      respuesta(403, { error: { codigo: 'no_creador', mensaje: 'Solo el creador del viaje puede hacerlo' } }),
    )
    const onArchivado = vi.fn()
    renderizar({ onArchivado })

    await user.click(await screen.findByRole('button', { name: 'Cerrar viaje' }))
    await user.click(within(dialogo()!).getByRole('button', { name: 'Cerrar viaje' }))

    expect((await within(dialogo()!).findByRole('alert')).textContent).toBe('Solo el creador del viaje puede hacerlo')
    expect(onArchivado).not.toHaveBeenCalled()
  })
})
