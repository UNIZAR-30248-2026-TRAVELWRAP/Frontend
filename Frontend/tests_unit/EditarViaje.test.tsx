import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  portada_url: null,
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
      respuesta(409, { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está finalizado y ya no se puede modificar' } }),
    )
    const onGuardado = vi.fn()
    renderizar({ onGuardado })

    await user.type(await screen.findByLabelText('Nombre del viaje'), ' bis')
    await user.click(botonGuardar())

    expect((await screen.findByRole('alert')).textContent).toBe('El viaje está finalizado y ya no se puede modificar')
    expect(botonGuardar()).toHaveProperty('disabled', false)
    expect(onGuardado).not.toHaveBeenCalled()
  })

  it('a quien no es el creador solo le muestra la portada, y en un viaje finalizado no muestra el formulario', async () => {
    simularBackend({ rol: 'miembro' })
    const { unmount } = renderizar()
    expect(await screen.findByRole('group', { name: 'Foto de portada' })).toBeTruthy()
    expect(screen.queryByLabelText('Nombre del viaje')).toBeNull()
    expect(screen.queryByLabelText('Presupuesto total (€)')).toBeNull()
    unmount()

    simularBackend({ estado: 'finalizado' })
    renderizar()
    expect((await screen.findByRole('alert')).textContent).toBe('El viaje está finalizado y ya no se puede modificar')
    expect(screen.queryByRole('group', { name: 'Foto de portada' })).toBeNull()
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

// ─── Foto de portada ──────────────────────────────────────────────────────────
const PORTADA_ACTUAL = 'https://storage.test/portadas/actual.jpg?token=abc'
const PORTADA_NUEVA = 'https://storage.test/portadas/nueva.jpg?token=def'

const foto = (nombre = 'roma.jpg', tipo = 'image/jpeg') => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], nombre, { type: tipo })

// GET devuelve el viaje; PATCH, PUT y DELETE de la portada actualizan el viaje que se devuelve
const simularBackendPortada = (datos: Record<string, unknown> = {}, respuestaPortada?: () => Promise<Response>) => {
  let actual = viaje(datos)
  const fetchMock = vi.fn((url: string, opciones?: RequestInit) => {
    const metodo = opciones?.method ?? 'GET'
    if (url.endsWith('/portada') && respuestaPortada) return respuestaPortada()
    if (metodo === 'PATCH') actual = { ...actual, ...JSON.parse(opciones?.body as string) }
    if (url.endsWith('/portada') && metodo === 'PUT') actual = { ...actual, portada_url: PORTADA_NUEVA }
    if (url.endsWith('/portada') && metodo === 'DELETE') actual = { ...actual, portada_url: null }
    return respuesta(200, actual)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const llamadas = (fetchMock: ReturnType<typeof vi.fn>, metodo: string) =>
  fetchMock.mock.calls.filter(([, opciones]) => (opciones as RequestInit)?.method === metodo)

const elegirFoto = (archivo: File) =>
  fireEvent.change(screen.getByLabelText('Elegir foto de portada'), { target: { files: [archivo] } })

describe('EditarViaje: foto de portada', () => {
  const crearVista = vi.fn(() => 'blob:vista-previa')
  const liberarVista = vi.fn()

  beforeEach(() => {
    URL.createObjectURL = crearVista
    URL.revokeObjectURL = liberarVista
  })

  afterEach(() => {
    crearVista.mockClear()
    liberarVista.mockClear()
  })

  it('sin portada invita a seleccionar una foto y no muestra «Quitar foto»', async () => {
    simularBackendPortada()
    renderizar()

    expect(await screen.findByText('Añade una foto de portada')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Seleccionar foto' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Quitar foto' })).toBeNull()
    expect(screen.queryByTestId('fondo-portada')).toBeNull()
  })

  it('con portada la muestra aclarada de fondo y ofrece cambiarla o quitarla', async () => {
    simularBackendPortada({ portada_url: PORTADA_ACTUAL })
    renderizar()

    expect((await screen.findByTestId('fondo-portada')).getAttribute('src')).toBe(PORTADA_ACTUAL)
    expect(screen.getByRole('button', { name: 'Cambiar foto' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Quitar foto' })).toBeTruthy()
  })

  it('al elegir una foto la ve de vista previa y no sube nada hasta guardar', async () => {
    const fetchMock = simularBackendPortada()
    renderizar()

    await screen.findByText('Añade una foto de portada')
    expect(botonGuardar()).toHaveProperty('disabled', true)
    elegirFoto(foto())

    expect((await screen.findByTestId('fondo-portada')).getAttribute('src')).toBe('blob:vista-previa')
    expect(botonGuardar()).toHaveProperty('disabled', false)
    expect(llamadas(fetchMock, 'PUT')).toHaveLength(0)
  })

  it('al guardar sube la foto en el campo «archivo» y avisa con el viaje devuelto, sin enviar un PATCH', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackendPortada()
    const onGuardado = vi.fn()
    renderizar({ onGuardado })

    await screen.findByText('Añade una foto de portada')
    elegirFoto(foto())
    await user.click(botonGuardar())

    await vi.waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1))
    const [url, opciones] = llamadas(fetchMock, 'PUT')[0] as [string, RequestInit]
    expect(url).toContain(`/viajes/${VIAJE_ID}/portada`)
    expect((opciones.body as FormData).get('archivo')).toBeInstanceOf(Blob)
    expect(llamadas(fetchMock, 'PATCH')).toHaveLength(0)
    expect(onGuardado.mock.calls[0][0].portada_url).toBe(PORTADA_NUEVA)
  })

  it('si también cambian los datos, guarda primero los datos y después la portada', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackendPortada()
    const onGuardado = vi.fn()
    renderizar({ onGuardado })

    await user.type(await screen.findByLabelText('Nombre del viaje'), ' bis')
    elegirFoto(foto('roma.png', 'image/png'))
    await user.click(botonGuardar())

    await vi.waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1))
    const metodos = fetchMock.mock.calls.map(([, opciones]) => (opciones as RequestInit)?.method ?? 'GET')
    expect(metodos.indexOf('PATCH')).toBeLessThan(metodos.indexOf('PUT'))
    expect(onGuardado.mock.calls[0][0]).toMatchObject({ nombre: 'Roma 2027 bis', portada_url: PORTADA_NUEVA })
  })

  it('rechaza una foto de otro tipo con un mensaje y la portada no cambia', async () => {
    simularBackendPortada({ portada_url: PORTADA_ACTUAL })
    renderizar()

    await screen.findByTestId('fondo-portada')
    elegirFoto(foto('animacion.gif', 'image/gif'))

    expect((await screen.findByRole('alert')).textContent).toBe('La portada debe ser una foto JPEG o PNG')
    expect(screen.getByTestId('fondo-portada').getAttribute('src')).toBe(PORTADA_ACTUAL)
    expect(botonGuardar()).toHaveProperty('disabled', true)
  })

  it('rechaza una foto de más de 15 MB con un mensaje', async () => {
    simularBackendPortada()
    renderizar()

    await screen.findByText('Añade una foto de portada')
    const enorme = foto()
    Object.defineProperty(enorme, 'size', { value: 16 * 1024 * 1024 })
    elegirFoto(enorme)

    expect((await screen.findByRole('alert')).textContent).toBe('La foto no puede ocupar más de 15 MB')
    expect(screen.queryByTestId('fondo-portada')).toBeNull()
  })

  it('quita la portada actual al guardar con DELETE', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackendPortada({ portada_url: PORTADA_ACTUAL })
    const onGuardado = vi.fn()
    renderizar({ onGuardado })

    await user.click(await screen.findByRole('button', { name: 'Quitar foto' }))
    expect(screen.getByText('Añade una foto de portada')).toBeTruthy()
    await user.click(botonGuardar())

    await vi.waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1))
    expect(llamadas(fetchMock, 'DELETE')).toHaveLength(1)
    expect(onGuardado.mock.calls[0][0].portada_url).toBeNull()
  })

  it('descartar la foto elegida antes de guardar deja la portada como estaba, sin llamar al servidor', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackendPortada()
    renderizar()

    await screen.findByText('Añade una foto de portada')
    elegirFoto(foto())
    await user.click(await screen.findByRole('button', { name: 'Quitar foto' }))

    expect(screen.getByText('Añade una foto de portada')).toBeTruthy()
    expect(botonGuardar()).toHaveProperty('disabled', true)
    expect(llamadas(fetchMock, 'PUT')).toHaveLength(0)
    expect(llamadas(fetchMock, 'DELETE')).toHaveLength(0)
  })

  it('muestra el error del servidor y deja volver a intentarlo conservando la foto elegida', async () => {
    const user = userEvent.setup()
    simularBackendPortada({}, () =>
      respuesta(400, { error: { codigo: 'archivo_demasiado_grande', mensaje: 'La portada no puede ocupar más de 5 MB' } }),
    )
    const onGuardado = vi.fn()
    renderizar({ onGuardado })

    await screen.findByText('Añade una foto de portada')
    elegirFoto(foto())
    await user.click(botonGuardar())

    expect((await screen.findByRole('alert')).textContent).toBe('La foto es demasiado grande (máximo 5 MB)')
    expect(botonGuardar()).toHaveProperty('disabled', false)
    expect(screen.getByTestId('fondo-portada').getAttribute('src')).toBe('blob:vista-previa')
    expect(onGuardado).not.toHaveBeenCalled()
  })

  it('un miembro que no es el creador cambia la portada sin enviar los datos del viaje', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackendPortada({ rol: 'miembro' })
    const onGuardado = vi.fn()
    renderizar({ onGuardado })

    expect(await screen.findByText('Cambiar portada')).toBeTruthy()
    elegirFoto(foto())
    await user.click(botonGuardar())

    await vi.waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1))
    expect(llamadas(fetchMock, 'PUT')).toHaveLength(1)
    expect(llamadas(fetchMock, 'PATCH')).toHaveLength(0)
  })

  it('libera la vista previa al cambiar de foto', async () => {
    simularBackendPortada()
    renderizar()

    await screen.findByText('Añade una foto de portada')
    elegirFoto(foto('uno.jpg'))
    await screen.findByTestId('fondo-portada')
    elegirFoto(foto('dos.jpg'))

    await vi.waitFor(() => expect(liberarVista).toHaveBeenCalledWith('blob:vista-previa'))
  })
})
