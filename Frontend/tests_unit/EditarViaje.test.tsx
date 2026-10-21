import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditarViaje from '../src/screens/EditarViaje'

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
  presupuesto: 850,
  estado: 'activo',
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  rol: 'creador',
  miembros: [{ usuario_id: 'u1', nombre: 'Adriana', avatar_url: null, rol: 'creador' }],
  ...datos,
})

// GET devuelve el viaje y PATCH la respuesta indicada
const simularBackend = (datos: Record<string, unknown> = {}, patch = (cuerpo: Record<string, unknown>) => respuesta(200, viaje({ ...datos, ...cuerpo }))) => {
  const fetchMock = vi.fn((_url: string, opciones?: RequestInit) =>
    opciones?.method === 'PATCH' ? patch(JSON.parse(opciones.body as string)) : respuesta(200, viaje(datos)),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const renderizar = (props: Partial<Parameters<typeof EditarViaje>[0]> = {}) =>
  render(<EditarViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" {...props} />)

const botonGuardar = () => screen.getByRole('button', { name: /Guardar cambios|Guardando/ })

const cuerpoDelPatch = (fetchMock: ReturnType<typeof vi.fn>) => {
  const llamada = fetchMock.mock.calls.find(([, opciones]) => (opciones as RequestInit)?.method === 'PATCH')
  return llamada ? JSON.parse((llamada[1] as RequestInit).body as string) : undefined
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('EditarViaje', () => {
  it('rellena el formulario con los datos actuales del viaje', async () => {
    simularBackend()
    renderizar()

    expect(((await screen.findByLabelText('Nombre del viaje')) as HTMLInputElement).value).toBe('Roma 2027')
    expect((screen.getByLabelText('Destino') as HTMLInputElement).value).toBe('Roma')
    expect((screen.getByLabelText('Fecha de inicio') as HTMLInputElement).value).toBe('2027-05-12')
    expect((screen.getByLabelText('Fecha de fin') as HTMLInputElement).value).toBe('2027-05-15')
    expect((screen.getByLabelText('Presupuesto total (€)') as HTMLInputElement).value).toBe('850')
  })

  it('no deja guardar mientras no haya cambios', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizar()

    await screen.findByLabelText('Nombre del viaje')
    expect(botonGuardar()).toHaveProperty('disabled', true)
    await user.type(screen.getByLabelText('Nombre del viaje'), ' bis')
    expect(botonGuardar()).toHaveProperty('disabled', false)
  })

  it('envía solo los campos cambiados y avisa con el viaje guardado', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    const onGuardado = vi.fn()
    renderizar({ onGuardado })

    const nombre = await screen.findByLabelText('Nombre del viaje')
    await user.clear(nombre)
    await user.type(nombre, '  Roma y Florencia  ')
    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: '2027-05-18' } })
    await user.clear(screen.getByLabelText('Presupuesto total (€)'))
    await user.type(screen.getByLabelText('Presupuesto total (€)'), '1100')
    await user.click(botonGuardar())

    await vi.waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1))
    expect(cuerpoDelPatch(fetchMock)).toEqual({ nombre: 'Roma y Florencia', fecha_fin: '2027-05-18', presupuesto: 1100 })
    expect(onGuardado.mock.calls[0][0].nombre).toBe('Roma y Florencia')
  })

  it('permite quitar una fecha enviándola como null', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    renderizar({ onGuardado: vi.fn() })

    fireEvent.change(await screen.findByLabelText('Fecha de fin'), { target: { value: '' } })
    await user.click(botonGuardar())

    await vi.waitFor(() => expect(cuerpoDelPatch(fetchMock)).toEqual({ fecha_fin: null }))
  })

  it('no deja guardar con el nombre o el destino vacíos, o con las fechas al revés', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizar()

    const nombre = await screen.findByLabelText('Nombre del viaje')
    await user.clear(nombre)
    expect(botonGuardar()).toHaveProperty('disabled', true)
    await user.type(nombre, 'Roma')

    await user.clear(screen.getByLabelText('Destino'))
    expect(botonGuardar()).toHaveProperty('disabled', true)
    await user.type(screen.getByLabelText('Destino'), 'Florencia')
    expect(botonGuardar()).toHaveProperty('disabled', false)

    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: '2027-05-01' } })
    expect(screen.getByRole('alert').textContent).toBe('La fecha de fin no puede ser anterior a la de inicio')
    expect(botonGuardar()).toHaveProperty('disabled', true)
  })

  it('en un viaje pendiente de votación no muestra el destino', async () => {
    simularBackend({ destino: null, pendiente_destino: true })
    renderizar()

    await screen.findByLabelText('Nombre del viaje')
    expect(screen.queryByLabelText('Destino')).toBeNull()
  })

  it('muestra el error del backend y deja volver a intentarlo', async () => {
    const user = userEvent.setup()
    simularBackend({}, () =>
      respuesta(409, { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está cerrado y ya no se puede modificar' } }),
    )
    const onGuardado = vi.fn()
    renderizar({ onGuardado })

    await user.type(await screen.findByLabelText('Nombre del viaje'), ' bis')
    await user.click(botonGuardar())

    expect((await screen.findByRole('alert')).textContent).toBe('El viaje está cerrado y ya no se puede modificar')
    expect(botonGuardar()).toHaveProperty('disabled', false)
    expect(onGuardado).not.toHaveBeenCalled()
  })

  it('no muestra el formulario a quien no es el creador ni en un viaje archivado', async () => {
    simularBackend({ rol: 'miembro' })
    const { unmount } = renderizar()
    expect((await screen.findByRole('alert')).textContent).toBe('Solo el creador del viaje puede editar sus datos')
    expect(screen.queryByLabelText('Nombre del viaje')).toBeNull()
    unmount()

    simularBackend({ estado: 'archivado' })
    renderizar()
    expect((await screen.findByRole('alert')).textContent).toBe('El viaje está cerrado y ya no se puede modificar')
  })

  it('vuelve atrás al pulsar el botón de volver', async () => {
    const user = userEvent.setup()
    simularBackend()
    const onVolver = vi.fn()
    renderizar({ onVolver })

    await user.click(screen.getByRole('button', { name: 'Volver' }))

    expect(onVolver).toHaveBeenCalledTimes(1)
  })
})
