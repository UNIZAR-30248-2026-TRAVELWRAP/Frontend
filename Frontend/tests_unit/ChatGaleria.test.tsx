import { afterEach, describe, expect, it, vi } from 'vitest'
import { beforeEach as antesDeCadaPrueba } from 'vitest'
import { olvidarViajes } from '../src/services/viajesEnCache'
antesDeCadaPrueba(() => olvidarViajes())
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
  borrado = (): Promise<Response> => Promise.resolve(new Response(null, { status: 204 })),
} = {}) => {
  const fetchMock = vi.fn((url: string, opciones?: RequestInit) => {
    if (opciones?.method === 'DELETE') return borrado()
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

const selector = () => screen.getByLabelText('Elegir las fotos o vídeos que se van a subir')
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

  it('la pestaña Chat abre la pantalla de chat', async () => {
    const user = userEvent.setup()
    const onAbrirChat = vi.fn()
    simularBackend()
    await abrir({ onAbrirChat })

    const chat = screen.getByRole('tab', { name: 'Chat' })
    expect(chat).toHaveProperty('disabled', false)
    expect(chat.getAttribute('aria-selected')).toBe('false')
    await user.click(chat)
    expect(onAbrirChat).toHaveBeenCalledTimes(1)
  })

  it('marca «Chat» como sección activa y cambia de sección desde la barra inferior', async () => {
    const onCambiarSeccion = vi.fn()
    simularBackend()
    await abrir({ onCambiarSeccion })

    expect(screen.getByRole('button', { name: 'Chat' }).getAttribute('aria-current')).toBe('page')
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

})

describe('ChatGaleria: subida', () => {

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







})

const VIDEO = (datos: Record<string, unknown> = {}) =>
  foto({ id: 'v1', nombre: 'paseo.mp4', tipo_mime: 'video/mp4', url: 'https://storage.test/paseo.mp4', ...datos })


describe('ChatGaleria: vídeos', () => {
  it('los vídeos salen con «Reproducir», se cuentan aparte y se abren con reproductor', async () => {
    simularBackend({ lista: () => json(200, { fotos: [VIDEO(), ...LISTA] }) })
    await abrir()

    expect(screen.getByText('2 fotos · 1 vídeo · 2 miembros')).toBeTruthy()
    await usuario().click(screen.getByRole('button', { name: 'Reproducir paseo.mp4' }))

    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Vídeo 1 de 3: paseo.mp4')
    expect(document.querySelector('video[controls]')?.getAttribute('src')).toBe('https://storage.test/paseo.mp4')
  })


})

describe('ChatGaleria: borrar', () => {
  const abrirVisor = async (nombre = 'Ampliar trevi.png') => {
    const user = usuario()
    await user.click(screen.getByRole('button', { name: nombre }))
    return user
  }
  const borrados = (fetchMock: ReturnType<typeof simularBackend>) => fetchMock.mock.calls.filter(([, opciones]) => opciones?.method === 'DELETE')

  it('pide confirmar, borra para el grupo y el visor pasa a la foto que queda', async () => {
    const fetchMock = simularBackend()
    await abrir()
    const user = await abrirVisor()

    await user.click(screen.getByRole('button', { name: 'Borrar foto' }))
    const dialogo = screen.getByRole('dialog', { name: '¿Borrar esta foto?' })
    expect(within(dialogo).getByText('trevi.png')).toBeTruthy()
    expect(borrados(fetchMock)).toHaveLength(0)
    await user.click(within(dialogo).getByRole('button', { name: 'Borrar foto' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: '¿Borrar esta foto?' })).toBeNull())
    const [[url, opciones]] = borrados(fetchMock) as [string, RequestInit][]
    expect(url).toContain(`/viajes/${VIAJE_ID}/fotos/f2`)
    expect(JSON.stringify(opciones.headers)).toContain('token-acceso')
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Foto 1 de 1: coliseo.jpg')
    expect(screen.getByText('1 foto · 2 miembros')).toBeTruthy()
  })

  it('cancelar no borra nada', async () => {
    const fetchMock = simularBackend()
    await abrir()
    const user = await abrirVisor()
    await user.click(screen.getByRole('button', { name: 'Borrar foto' }))

    await user.click(within(screen.getByRole('dialog', { name: '¿Borrar esta foto?' })).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog', { name: '¿Borrar esta foto?' })).toBeNull()
    expect(borrados(fetchMock)).toHaveLength(0)
    expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Foto 1 de 2: trevi.png')
  })


  it('al borrar la última foto se cierra el visor y vuelve el aviso de galería vacía', async () => {
    simularBackend({ lista: () => json(200, { fotos: [foto()] }) })
    await abrir()
    const user = await abrirVisor('Ampliar coliseo.jpg')
    await user.click(screen.getByRole('button', { name: 'Borrar foto' }))

    await user.click(within(screen.getByRole('dialog', { name: '¿Borrar esta foto?' })).getByRole('button', { name: 'Borrar foto' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByText('Aún no hay fotos en la galería del viaje.')).toBeTruthy()
  })

  it('borrar un vídeo lo dice en el diálogo', async () => {
    const fetchMock = simularBackend({ lista: () => json(200, { fotos: [VIDEO(), ...LISTA] }) })
    await abrir()
    const user = await abrirVisor('Reproducir paseo.mp4')
    await user.click(screen.getByRole('button', { name: 'Borrar vídeo' }))

    const dialogo = screen.getByRole('dialog', { name: '¿Borrar este vídeo?' })
    await user.click(within(dialogo).getByRole('button', { name: 'Borrar vídeo' }))

    await waitFor(() => expect(borrados(fetchMock)).toHaveLength(1))
    expect(screen.getByText('2 fotos · 2 miembros')).toBeTruthy()
  })

})

describe('ChatGaleria: espacio de almacenamiento', () => {
  const almacenamiento = (usado: number) => ({ usado_bytes: usado, limite_bytes: 200_000_000 })

  it('indica el espacio usado y lo actualiza al subir y al borrar', async () => {
    simularBackend({ lista: () => json(200, { fotos: LISTA, almacenamiento: almacenamiento(3_000_000) }) })
    await abrir()
    expect(screen.getByText('3 MB de 200 MB usados')).toBeTruthy()

    const user = usuario()
    await user.upload(selector(), imagen())
    expect(await screen.findByText('3,2 MB de 200 MB usados')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Ampliar trevi.png' }))
    await user.click(screen.getByRole('button', { name: 'Borrar foto' }))
    await user.click(within(screen.getByRole('dialog', { name: '¿Borrar esta foto?' })).getByRole('button', { name: 'Borrar foto' }))
    expect(await screen.findByText('3 MB de 200 MB usados')).toBeTruthy()
  })

})

