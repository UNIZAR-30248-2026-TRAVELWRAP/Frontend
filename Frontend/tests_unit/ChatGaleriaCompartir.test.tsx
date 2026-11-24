import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, configure, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatGaleria from '../src/screens/ChatGaleria'

configure({ asyncUtilTimeout: 5000 })

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const ADRIANA = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc'
const BERTA = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f'
const MENSAJE_DESCARGA = 'Tu dispositivo no permite compartir archivos desde el navegador, así que se ha descargado para que lo envíes tú.'

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

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const archivoCorrecto = () => Promise.resolve(new Response('x', { status: 200, headers: { 'Content-Type': 'image/png' } }))

type Opciones = {
  estado?: string
  fotos?: unknown[]
  archivo?: () => Promise<Response>
}

const simular = ({
  estado = 'activo',
  fotos = [foto({ id: 'f2', nombre: 'trevi.png', tipo_mime: 'image/png', url: 'https://storage.test/trevi.png' }), foto()],
  archivo = archivoCorrecto,
}: Opciones = {}) => {
  const descargados: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      if (url.startsWith('https://storage.test')) {
        descargados.push(url)
        return archivo()
      }
      if (url.endsWith('/fotos') && (init?.method ?? 'GET') === 'GET') return json(200, { fotos, almacenamiento: { usado_bytes: 1000, limite_bytes: 200000000 } })
      return json(200, { id: VIAJE_ID, nombre: 'Roma 2027', estado, miembros })
    }),
  )
  return descargados
}

const abrirFoto = async (nombre = 'trevi.png') => {
  render(<ChatGaleria viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
  await screen.findByText('Fotos compartidas')
  await userEvent.click(screen.getByRole('button', { name: nombre.endsWith('.mp4') ? `Reproducir ${nombre}` : `Ampliar ${nombre}` }))
}

const compartir = (etiqueta = 'Compartir foto') => userEvent.click(screen.getByRole('button', { name: etiqueta }))

let guardados: string[] = []

const conCompartir = (share: unknown) => {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true })
  Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true, writable: true })
}

beforeEach(() => {
  guardados = []
  URL.createObjectURL = vi.fn(() => 'blob:archivo')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    guardados.push(this.download)
  })
})

afterEach(() => {
  delete (navigator as unknown as Record<string, unknown>).share
  delete (navigator as unknown as Record<string, unknown>).canShare
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('ChatGaleria · compartir', () => {

  it('si el dispositivo no puede compartir archivos descarga la foto y lo explica, sin error', async () => {
    simular()
    await abrirFoto()

    await compartir()

    expect((await screen.findByRole('status')).textContent).toBe(MENSAJE_DESCARGA)
    expect(guardados).toEqual(['trevi.png'])
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('si el usuario cancela el menú no sale ningún aviso', async () => {
    const share = vi.fn(async () => {
      throw new DOMException('cancelado', 'AbortError')
    })
    simular()
    conCompartir(share)
    await abrirFoto()

    await compartir()

    await waitFor(() => expect((screen.getByRole('button', { name: 'Compartir foto' }) as HTMLButtonElement).disabled).toBe(false))
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(guardados).toEqual([])
  })


  it('si no se puede obtener el archivo avisa con una alerta y se puede volver a intentar', async () => {
    simular({ archivo: () => Promise.reject(new TypeError('Failed to fetch')) })
    await abrirFoto()

    await compartir()

    expect((await screen.findByRole('alert')).textContent).toBe('No se ha podido preparar el archivo para compartirlo')
    expect(guardados).toEqual([])
    expect((screen.getByRole('button', { name: 'Compartir foto' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('el aviso se quita al pasar a otra foto y al cerrar el visor', async () => {
    simular()
    await abrirFoto()
    await compartir()
    await screen.findByRole('status')

    await userEvent.click(screen.getByRole('button', { name: 'Foto siguiente' }))
    expect(screen.queryByRole('status')).toBeNull()

    await compartir()
    await screen.findByRole('status')
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar foto' }))
    await userEvent.click(screen.getByRole('button', { name: 'Ampliar trevi.png' }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('se puede compartir también con el viaje finalizado, aunque no se pueda borrar', async () => {
    const share = vi.fn(async () => undefined)
    simular({ estado: 'finalizado' })
    conCompartir(share)
    await abrirFoto()
    expect(screen.queryByRole('button', { name: 'Borrar foto' })).toBeNull()

    await compartir()

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
  })

  it('un vídeo se comparte con su tipo', async () => {
    const share = vi.fn(async () => undefined)
    simular({
      fotos: [foto({ id: 'v1', nombre: 'paseo.mp4', tipo_mime: 'video/mp4', url: 'https://storage.test/paseo.mp4' })],
      archivo: () => Promise.resolve(new Response('v', { status: 200, headers: { 'Content-Type': 'video/mp4' } })),
    })
    conCompartir(share)
    await abrirFoto('paseo.mp4')

    await compartir('Compartir vídeo')

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    expect((share.mock.calls[0] as unknown as [{ files: File[] }])[0].files[0].type).toBe('video/mp4')
  })
})
