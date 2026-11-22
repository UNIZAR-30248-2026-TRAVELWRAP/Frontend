import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/services/authApi'
import {
  MAX_BYTES_PORTADA,
  MAX_BYTES_PORTADA_ORIGINAL,
  mensajeErrorPortada,
  prepararPortada,
  validarFotoPortada,
} from '../src/utils/portada'

const archivo = (tipo = 'image/jpeg', bytes = 4) => new File([new Uint8Array(bytes)], 'roma', { type: tipo })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('validarFotoPortada', () => {
  it('acepta fotos JPEG y PNG', () => {
    expect(validarFotoPortada(archivo('image/jpeg'))).toBeNull()
    expect(validarFotoPortada(archivo('image/png'))).toBeNull()
  })

  it('rechaza otros tipos, aunque lleven extensión de foto', () => {
    const gif = new File([new Uint8Array(4)], 'roma.jpg', { type: 'image/gif' })
    expect(validarFotoPortada(gif)).toBe('La portada debe ser una foto JPEG o PNG')
    expect(validarFotoPortada(archivo('application/pdf'))).toBe('La portada debe ser una foto JPEG o PNG')
    expect(validarFotoPortada(archivo('image/webp'))).toBe('La portada debe ser una foto JPEG o PNG')
  })

  it('rechaza un archivo vacío o de más de 15 MB', () => {
    expect(validarFotoPortada(archivo('image/jpeg', 0))).toBe('El archivo está vacío')
    expect(validarFotoPortada(archivo('image/jpeg', MAX_BYTES_PORTADA_ORIGINAL))).toBeNull()
    expect(validarFotoPortada(archivo('image/jpeg', MAX_BYTES_PORTADA_ORIGINAL + 1))).toBe('La foto no puede ocupar más de 15 MB')
  })
})

describe('prepararPortada', () => {
  // Navegador simulado: createImageBitmap da una imagen del tamaño indicado y el lienzo devuelve un JPEG
  const simularNavegador = (ancho: number, alto: number, blob: Blob | null = new Blob(['jpeg'], { type: 'image/jpeg' })) => {
    const dibujar = vi.fn()
    const cerrar = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: ancho, height: alto, close: cerrar })))
    const lienzo = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: dibujar }),
      toBlob: (resolver: (b: Blob | null) => void, tipo: string, calidad: number) => {
        lienzo.tipo = tipo
        lienzo.calidad = calidad
        resolver(blob)
      },
      tipo: '',
      calidad: 0,
    }
    vi.spyOn(document, 'createElement').mockImplementation(((etiqueta: string) =>
      etiqueta === 'canvas' ? lienzo : document.createElementNS('http://www.w3.org/1999/xhtml', etiqueta)) as never)
    return { lienzo, dibujar, cerrar }
  }

  it('reduce una foto grande a 1280 px de lado como máximo y la convierte a JPEG', async () => {
    const { lienzo, dibujar, cerrar } = simularNavegador(4000, 3000)

    const resultado = await prepararPortada(archivo('image/png'))

    expect([lienzo.width, lienzo.height]).toEqual([1280, 960])
    expect(lienzo.tipo).toBe('image/jpeg')
    expect(dibujar).toHaveBeenCalledWith(expect.anything(), 0, 0, 1280, 960)
    expect(cerrar).toHaveBeenCalled()
    expect(resultado.type).toBe('image/jpeg')
  })

  it('no agranda una foto pequeña', async () => {
    const { lienzo } = simularNavegador(800, 600)

    await prepararPortada(archivo())

    expect([lienzo.width, lienzo.height]).toEqual([800, 600])
  })

  it('si el navegador no puede procesar la foto, sube la original si el servidor la admite', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => {
      throw new Error('no soportado')
    }))
    const original = archivo('image/jpeg', 1000)

    expect(await prepararPortada(original)).toBe(original)
  })

  it('si no puede procesarla y la original pesa más de 5 MB, falla con un mensaje', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => {
      throw new Error('no soportado')
    }))

    await expect(prepararPortada(archivo('image/jpeg', MAX_BYTES_PORTADA + 1))).rejects.toThrow(
      'No se ha podido preparar la foto. Prueba con una más pequeña',
    )
  })

  it('si el lienzo no devuelve imagen, recurre a la original', async () => {
    simularNavegador(2000, 1000, null)
    const original = archivo('image/png', 1000)

    expect(await prepararPortada(original)).toBe(original)
  })
})

describe('mensajeErrorPortada', () => {
  it('traduce los códigos de la API a mensajes comprensibles', () => {
    expect(mensajeErrorPortada(new ApiError(400, 'archivo_demasiado_grande', 'x'))).toBe('La foto es demasiado grande (máximo 5 MB)')
    expect(mensajeErrorPortada(new ApiError(400, 'tipo_no_permitido', 'x'))).toBe('La portada debe ser una foto JPEG o PNG')
    expect(mensajeErrorPortada(new ApiError(0, 'sin_conexion', 'x'))).toBe('No hay conexión con el servidor. Inténtalo de nuevo')
  })

  it('usa el mensaje del servidor si no conoce el código, y uno genérico si no es un error', () => {
    expect(mensajeErrorPortada(new ApiError(409, 'viaje_no_activo', 'El viaje está finalizado'))).toBe('El viaje está finalizado')
    expect(mensajeErrorPortada(new Error('boom'))).toBe('boom')
    expect(mensajeErrorPortada('raro')).toBe('Ha ocurrido un error')
  })
})
