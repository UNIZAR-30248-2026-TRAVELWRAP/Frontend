import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { compartirArchivo, puedeCompartirArchivos } from '../src/utils/compartir'

const URL_ARCHIVO = 'https://storage.test/trevi.jpg'

const respuestaConArchivo = () => Promise.resolve(new Response('contenido', { status: 200, headers: { 'Content-Type': 'image/jpeg' } }))

const sinCompartir = () => ({ share: undefined, canShare: undefined })

const simularNavegador = (datos: { share?: unknown; canShare?: unknown }) => {
  for (const clave of ['share', 'canShare'] as const) {
    if (datos[clave]) Object.defineProperty(navigator, clave, { value: datos[clave], configurable: true, writable: true })
    else delete (navigator as unknown as Record<string, unknown>)[clave]
  }
}

let descargas: { nombre: string; enlace: string }[] = []

beforeEach(() => {
  descargas = []
  vi.stubGlobal('fetch', vi.fn(respuestaConArchivo))
  URL.createObjectURL = vi.fn(() => 'blob:archivo')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    descargas.push({ nombre: this.download, enlace: this.href })
  })
})

afterEach(() => {
  simularNavegador({})
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('compartir · puedeCompartirArchivos', () => {
  const archivo = new File(['x'], 'trevi.jpg', { type: 'image/jpeg' })

  it('es verdadero si el navegador sabe compartir y acepta ese archivo', () => {
    simularNavegador({ share: vi.fn(), canShare: vi.fn(() => true) })
    expect(puedeCompartirArchivos(archivo)).toBe(true)
  })

  it('es falso si no existe share, si no existe canShare o si canShare rechaza el archivo', () => {
    simularNavegador(sinCompartir())
    expect(puedeCompartirArchivos(archivo)).toBe(false)

    simularNavegador({ share: vi.fn() })
    expect(puedeCompartirArchivos(archivo)).toBe(false)

    simularNavegador({ share: vi.fn(), canShare: vi.fn(() => false) })
    expect(puedeCompartirArchivos(archivo)).toBe(false)
  })
})

describe('compartir · compartirArchivo', () => {
  it('descarga el archivo del enlace y abre el menú de compartir con él, con su nombre y su tipo', async () => {
    const share = vi.fn(async () => undefined)
    simularNavegador({ share, canShare: vi.fn(() => true) })

    const resultado = await compartirArchivo(URL_ARCHIVO, 'trevi.jpg', 'image/jpeg')

    expect(resultado).toBe('compartido')
    expect(fetch).toHaveBeenCalledWith(URL_ARCHIVO)
    const [datos] = share.mock.calls[0] as unknown as [{ files: File[]; title: string }]
    expect(datos.files).toHaveLength(1)
    expect(datos.files[0].name).toBe('trevi.jpg')
    expect(datos.files[0].type).toBe('image/jpeg')
    expect(datos.files[0].size).toBe('contenido'.length)
    expect(datos.title).toBe('trevi.jpg')
    expect(descargas).toEqual([])
  })

  it('si el usuario cancela el menú no hace nada más', async () => {
    simularNavegador({
      share: vi.fn(async () => {
        throw new DOMException('cancelado', 'AbortError')
      }),
      canShare: vi.fn(() => true),
    })

    const resultado = await compartirArchivo(URL_ARCHIVO, 'trevi.jpg', 'image/jpeg')

    expect(resultado).toBe('cancelado')
    expect(descargas).toEqual([])
  })

  it('si el navegador no puede compartir archivos lo descarga con su nombre', async () => {
    simularNavegador(sinCompartir())

    const resultado = await compartirArchivo(URL_ARCHIVO, 'trevi.jpg', 'image/jpeg')

    expect(resultado).toBe('descargado')
    expect(descargas).toEqual([{ nombre: 'trevi.jpg', enlace: 'blob:archivo' }])
  })

  it('si el navegador rechaza ese tipo de archivo lo descarga', async () => {
    const share = vi.fn()
    simularNavegador({ share, canShare: vi.fn(() => false) })

    const resultado = await compartirArchivo(URL_ARCHIVO, 'paseo.mp4', 'video/mp4')

    expect(resultado).toBe('descargado')
    expect(share).not.toHaveBeenCalled()
    expect(descargas[0].nombre).toBe('paseo.mp4')
  })

  it('si compartir falla por otro motivo (por ejemplo, por pasar demasiado tiempo) lo descarga', async () => {
    simularNavegador({
      share: vi.fn(async () => {
        throw new DOMException('sin permiso', 'NotAllowedError')
      }),
      canShare: vi.fn(() => true),
    })

    const resultado = await compartirArchivo(URL_ARCHIVO, 'trevi.jpg', 'image/jpeg')

    expect(resultado).toBe('descargado')
    expect(descargas).toHaveLength(1)
  })

  it('usa el tipo del archivo descargado si no se indica ninguno', async () => {
    const share = vi.fn(async () => undefined)
    simularNavegador({ share, canShare: vi.fn(() => true) })

    await compartirArchivo(URL_ARCHIVO, 'trevi', '')

    expect((share.mock.calls[0] as unknown as [{ files: File[] }])[0].files[0].type).toBe('image/jpeg')
  })

  it('lanza un error claro si no se puede obtener el archivo', async () => {
    simularNavegador(sinCompartir())
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(compartirArchivo(URL_ARCHIVO, 'trevi.jpg', 'image/jpeg')).rejects.toThrow('No se ha podido preparar el archivo para compartirlo')

    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('caducado', { status: 403 }))))
    await expect(compartirArchivo(URL_ARCHIVO, 'trevi.jpg', 'image/jpeg')).rejects.toThrow('No se ha podido preparar el archivo para compartirlo')
    expect(descargas).toEqual([])
  })
})
