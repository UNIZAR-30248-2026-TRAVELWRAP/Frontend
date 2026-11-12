import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatGaleria from '../src/screens/ChatGaleria'

configure({ asyncUtilTimeout: 5000 })

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const ADRIANA = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc'
const BERTA = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f'

const miembros = [
  { usuario_id: BERTA, nombre: 'Berta', avatar_url: null, rol: 'creador' },
  { usuario_id: ADRIANA, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
]

const foto = (datos: Record<string, unknown> = {}) => ({
  id: 'f1',
  viaje_id: VIAJE_ID,
  nombre: 'coliseo.jpg',
  tipo_mime: 'image/jpeg',
  tamano_bytes: 248731,
  subido_por: BERTA,
  creado_en: '2027-05-12T10:00:00Z',
  url: 'https://storage.test/coliseo.jpg',
  ...datos,
})

const LISTA = [foto({ id: 'f2', nombre: 'trevi.png', tipo_mime: 'image/png', url: 'https://storage.test/trevi.png' }), foto()]

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const simularBackend = ({
  viaje = (): Promise<Response> => json(200, { id: VIAJE_ID, nombre: 'Roma 2027', estado: 'activo', miembros }),
  lista = (): Promise<Response> => json(200, { fotos: LISTA }),
  subida = (): Promise<Response> => json(201, foto({ id: 'f3', nombre: 'plaza.webp', url: 'https://storage.test/plaza.webp' })),
} = {}) => {
  const fetchMock = vi.fn((url: string, opciones?: RequestInit) => {
    if (url.endsWith('/fotos')) return opciones?.method === 'POST' ? subida() : lista()
    return viaje()
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const subidas = (fetchMock: ReturnType<typeof simularBackend>) =>
  fetchMock.mock.calls.filter(([, opciones]) => opciones?.method === 'POST')

const abrir = async (props = {}) => {
  render(<ChatGaleria viajeId={VIAJE_ID} tokenSesion="token-acceso" {...props} />)
  await screen.findByText('Fotos compartidas')
}

const selector = () => screen.getByLabelText('Elegir la foto que se va a subir')
const imagen = (nombre = 'plaza.webp', tipo = 'image/webp') => new File(['x'], nombre, { type: tipo })
const usuario = () => userEvent.setup({ applyAccept: false })
const miniaturas = () => within(screen.getByRole('list', { name: 'Fotos del viaje' })).getAllByRole('listitem')

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ChatGaleria: cabecera y pestañas', () => {
  it('muestra el título, el nombre del viaje y las pestañas con Galería seleccionada', async () => {
    simularBackend()
    await abrir()

    expect(screen.getByText('Chat y Galería')).toBeTruthy()
    expect(screen.getByText('Roma 2027')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Galería' }).getAttribute('aria-selected')).toBe('true')
  })

  it('deja la pestaña Chat desactivada y avisa de que llegará más adelante', async () => {
    simularBackend()
    await abrir()

    const chat = screen.getByRole('tab', { name: 'Chat' })
    expect(chat).toHaveProperty('disabled', true)
    expect(chat.getAttribute('title')).toBe('Disponible próximamente')
    expect(chat.getAttribute('aria-selected')).toBe('false')
  })

  it('marca «Más» como sección activa y cambia de sección desde la barra inferior', async () => {
    const onCambiarSeccion = vi.fn()
    simularBackend()
    await abrir({ onCambiarSeccion })

    expect(screen.getByRole('button', { name: 'Más' }).getAttribute('aria-current')).toBe('page')
    await usuario().click(screen.getByRole('button', { name: 'Inicio' }))
    expect(onCambiarSeccion).toHaveBeenCalledWith('inicio')
  })

  it('el botón de volver avisa a quien muestra la pantalla', async () => {
    const onVolver = vi.fn()
    simularBackend()
    await abrir({ onVolver })

    await usuario().click(screen.getByRole('button', { name: /Volver/ }))
    expect(onVolver).toHaveBeenCalledTimes(1)
  })
})

describe('ChatGaleria: listado', () => {
  it('muestra las fotos del viaje en el orden del servidor y el recuento con los miembros', async () => {
    const fetchMock = simularBackend()
    await abrir()

    const filas = miniaturas()
    expect(filas).toHaveLength(2)
    expect(within(filas[0]).getByRole('button', { name: 'Ampliar trevi.png' })).toBeTruthy()
    expect(within(filas[1]).getByRole('button', { name: 'Ampliar coliseo.jpg' })).toBeTruthy()
    expect(filas[0].querySelector('img')?.getAttribute('src')).toBe('https://storage.test/trevi.png')
    expect(screen.getByText('2 fotos · 2 miembros')).toBeTruthy()

    const [urlFotos, opcionesFotos] = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/fotos')) as [string, RequestInit]
    expect(urlFotos).toContain(`/viajes/${VIAJE_ID}/fotos`)
    expect(JSON.stringify(opcionesFotos.headers)).toContain('token-acceso')
  })

  it('usa el singular con una foto y un miembro', async () => {
    simularBackend({
      viaje: () => json(200, { id: VIAJE_ID, nombre: 'Roma 2027', estado: 'activo', miembros: [miembros[0]] }),
      lista: () => json(200, { fotos: [foto()] }),
    })
    await abrir()
    expect(screen.getByText('1 foto · 1 miembro')).toBeTruthy()
  })

  it('no muestra las fotos cuya URL no se ha podido generar', async () => {
    simularBackend({ lista: () => json(200, { fotos: [foto({ url: null }), foto({ id: 'f2', nombre: 'trevi.png' })] }) })
    await abrir()

    expect(miniaturas()).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Ampliar trevi.png' })).toBeTruthy()
    expect(screen.getByText('1 foto · 2 miembros')).toBeTruthy()
  })

  it('muestra el estado vacío si el viaje no tiene fotos', async () => {
    simularBackend({ lista: () => json(200, { fotos: [] }) })
    await abrir()

    expect(screen.getByText('Aún no hay fotos en la galería del viaje.')).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Fotos del viaje' })).toBeNull()
    expect(screen.getByText('0 fotos · 2 miembros')).toBeTruthy()
  })

  it('mientras carga lo indica', async () => {
    simularBackend({ lista: () => new Promise<Response>(() => undefined) })
    render(<ChatGaleria viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    expect(screen.getByText('Cargando galería...')).toBeTruthy()
  })

  it('muestra el error si no se pueden cargar las fotos', async () => {
    simularBackend({
      lista: () => json(502, { error: { codigo: 'error_foto', mensaje: 'No se han podido obtener las fotos' } }),
    })
    render(<ChatGaleria viajeId={VIAJE_ID} tokenSesion="token-acceso" />)

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No se ha podido cargar la galería: No se han podido obtener las fotos',
    )
    expect(screen.queryByRole('button', { name: 'Subir' })).toBeNull()
  })
})

describe('ChatGaleria: subida', () => {
  it('una subida correcta añade la foto al principio y la envía al servidor con la sesión', async () => {
    const fetchMock = simularBackend()
    await abrir()

    await usuario().upload(selector(), imagen())

    await waitFor(() => expect(miniaturas()).toHaveLength(3))
    expect(within(miniaturas()[0]).getByRole('button', { name: 'Ampliar plaza.webp' })).toBeTruthy()
    expect(screen.getByText('3 fotos · 2 miembros')).toBeTruthy()

    const [[url, opciones]] = subidas(fetchMock) as [string, RequestInit][]
    expect(url).toContain(`/viajes/${VIAJE_ID}/fotos`)
    expect(opciones.body).toBeInstanceOf(FormData)
    expect(((opciones.body as FormData).get('archivo') as File).name).toBe('plaza.webp')
    expect(JSON.stringify(opciones.headers)).toContain('token-acceso')
  })

  it('mientras sube, el botón queda desactivado y lo indica', async () => {
    let terminar: (r: Response) => void = () => undefined
    simularBackend({ subida: () => new Promise<Response>((resolver) => (terminar = resolver)) })
    await abrir()

    await usuario().upload(selector(), imagen())

    const boton = await screen.findByRole('button', { name: 'Subiendo...' })
    expect(boton).toHaveProperty('disabled', true)
    terminar(new Response(JSON.stringify(foto({ id: 'f3', nombre: 'plaza.webp' })), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    expect(await screen.findByRole('button', { name: 'Subir' })).toHaveProperty('disabled', false)
  })

  it('el selector permite elegir varias fotos y se suben todas, la última elegida más arriba', async () => {
    let numero = 0
    const fetchMock = simularBackend({
      subida: () => {
        numero += 1
        return json(201, foto({ id: `n${numero}`, nombre: `subida${numero}.jpg`, url: `https://storage.test/subida${numero}.jpg` }))
      },
    })
    await abrir()
    expect(selector().hasAttribute('multiple')).toBe(true)

    await usuario().upload(selector(), [imagen('a.jpg', 'image/jpeg'), imagen('b.png', 'image/png'), imagen('c.webp')])

    await waitFor(() => expect(miniaturas()).toHaveLength(5))
    expect(subidas(fetchMock)).toHaveLength(3)
    expect(within(miniaturas()[0]).getByRole('button', { name: 'Ampliar subida3.jpg' })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('con varias fotos indica el progreso mientras sube', async () => {
    const resolvers: ((r: Response) => void)[] = []
    simularBackend({ subida: () => new Promise<Response>((resolver) => resolvers.push(resolver)) })
    await abrir()

    await usuario().upload(selector(), [imagen('a.jpg', 'image/jpeg'), imagen('b.png', 'image/png')])

    expect(await screen.findByRole('button', { name: 'Subiendo 1 de 2...' })).toHaveProperty('disabled', true)
    resolvers[0](new Response(JSON.stringify(foto({ id: 'n1', nombre: 'a.jpg' })), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    expect(await screen.findByRole('button', { name: 'Subiendo 2 de 2...' })).toBeTruthy()
    resolvers[1](new Response(JSON.stringify(foto({ id: 'n2', nombre: 'b.png' })), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    expect(await screen.findByRole('button', { name: 'Subir' })).toBeTruthy()
  })

  it('si alguna falla, sube las demás y avisa de cuáles no se han subido', async () => {
    let llamadas = 0
    const fetchMock = simularBackend({
      subida: () => {
        llamadas += 1
        return llamadas === 1
          ? json(201, foto({ id: 'n1', nombre: 'buena.jpg', url: 'https://storage.test/buena.jpg' }))
          : json(502, { error: { codigo: 'error_foto', mensaje: 'No se ha podido guardar la foto' } })
      },
    })
    await abrir()

    await usuario().upload(selector(), [
      imagen('buena.jpg', 'image/jpeg'),
      imagen('billete.pdf', 'application/pdf'),
      imagen('rota.png', 'image/png'),
    ])

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toBe(
      'No se han podido subir 2 de 3 fotos: billete.pdf (Solo se pueden subir fotos JPEG, PNG o WebP); rota.png (No se ha podido guardar la foto)',
    )
    expect(subidas(fetchMock)).toHaveLength(2)
    expect(miniaturas()).toHaveLength(3)
    expect(within(miniaturas()[0]).getByRole('button', { name: 'Ampliar buena.jpg' })).toBeTruthy()
  })

  it('rechaza en el cliente un tipo no permitido, sin llamar al servidor', async () => {
    const fetchMock = simularBackend()
    await abrir()

    await usuario().upload(selector(), imagen('billete.pdf', 'application/pdf'))

    expect((await screen.findByRole('alert')).textContent).toBe('Solo se pueden subir fotos JPEG, PNG o WebP')
    expect(subidas(fetchMock)).toHaveLength(0)
    expect(miniaturas()).toHaveLength(2)
  })

  it('rechaza en el cliente una foto de más de 8 MB, sin llamar al servidor', async () => {
    const fetchMock = simularBackend()
    await abrir()

    await usuario().upload(selector(), new File([new Uint8Array(8_000_001)], 'enorme.jpg', { type: 'image/jpeg' }))

    expect((await screen.findByRole('alert')).textContent).toBe('La foto no puede ocupar más de 8 MB')
    expect(subidas(fetchMock)).toHaveLength(0)
  })

  it('muestra el error del servidor y la galería no cambia', async () => {
    simularBackend({
      subida: () => json(400, { error: { codigo: 'tipo_no_permitido', mensaje: 'Solo se pueden subir fotos JPEG, PNG o WebP' } }),
    })
    await abrir()

    await usuario().upload(selector(), imagen('falsa.jpg', 'image/jpeg'))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No se ha podido subir la foto: Solo se pueden subir fotos JPEG, PNG o WebP',
    )
    expect(miniaturas()).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Subir' })).toHaveProperty('disabled', false)
  })

  it('el error desaparece al elegir una foto válida', async () => {
    simularBackend()
    await abrir()
    const user = usuario()
    await user.upload(selector(), imagen('billete.pdf', 'application/pdf'))
    await screen.findByRole('alert')

    await user.upload(selector(), imagen())

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(await screen.findByRole('button', { name: 'Ampliar plaza.webp' })).toBeTruthy()
  })

  it('se puede volver a elegir la misma foto después de un error', async () => {
    let intento = 0
    simularBackend({
      subida: () =>
        intento++ === 0
          ? json(502, { error: { codigo: 'error_foto', mensaje: 'No se ha podido subir la foto' } })
          : json(201, foto({ id: 'f3', nombre: 'plaza.webp' })),
    })
    await abrir()
    const user = usuario()
    await user.upload(selector(), imagen())
    await screen.findByRole('alert')

    await user.upload(selector(), imagen())

    expect(await screen.findByRole('button', { name: 'Ampliar plaza.webp' })).toBeTruthy()
  })
})

describe('ChatGaleria: viaje finalizado', () => {
  it('se ven las fotos pero no se puede subir ninguna', async () => {
    simularBackend({ viaje: () => json(200, { id: VIAJE_ID, nombre: 'Roma 2026', estado: 'archivado', miembros }) })
    await abrir()

    expect(miniaturas()).toHaveLength(2)
    expect(screen.getByText(/ya no se pueden subir/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Subir' })).toBeNull()
    expect(screen.queryByLabelText('Elegir la foto que se va a subir')).toBeNull()
  })
})
