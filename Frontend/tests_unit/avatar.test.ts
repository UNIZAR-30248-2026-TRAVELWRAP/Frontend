import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/services/authApi'
import {
  MAX_BYTES_AVATAR,
  MAX_BYTES_FOTO_ORIGINAL,
  mensajeErrorPerfil,
  prepararAvatar,
  validarFotoAvatar,
} from '../src/utils/avatar'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const foto = (bytes: number, tipo = 'image/png') => new File([new Uint8Array(bytes)], 'foto', { type: tipo })

describe('validarFotoAvatar', () => {
  it('acepta JPEG y PNG', () => {
    expect(validarFotoAvatar(foto(10, 'image/jpeg'))).toBeNull()
    expect(validarFotoAvatar(foto(10, 'image/png'))).toBeNull()
  })

  it('rechaza otros tipos', () => {
    expect(validarFotoAvatar(foto(10, 'image/gif'))).toBe('La foto debe ser JPEG o PNG')
    expect(validarFotoAvatar(foto(10, 'application/pdf'))).toBe('La foto debe ser JPEG o PNG')
    expect(validarFotoAvatar(foto(10, ''))).toBe('La foto debe ser JPEG o PNG')
  })

  it('rechaza un archivo vacío', () => {
    expect(validarFotoAvatar(foto(0))).toBe('El archivo está vacío')
  })

  it('rechaza una foto de más de 15 MB y acepta una de exactamente 15 MB', () => {
    expect(validarFotoAvatar(foto(MAX_BYTES_FOTO_ORIGINAL))).toBeNull()
    expect(validarFotoAvatar(foto(MAX_BYTES_FOTO_ORIGINAL + 1))).toBe('La foto no puede ocupar más de 15 MB')
  })
})

describe('prepararAvatar', () => {
  const simularNavegador = (ancho: number, alto: number, blob: Blob | null = new Blob(['jpeg'], { type: 'image/jpeg' })) => {
    const imagen = { width: ancho, height: alto, close: vi.fn() }
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(imagen))
    const dibujar = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: dibujar } as never)
    const aBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(blob))
    return { imagen, dibujar, aBlob }
  }

  it('recorta el cuadrado central y lo deja en 512×512 como JPEG de calidad 0,85', async () => {
    const { imagen, dibujar, aBlob } = simularNavegador(1000, 600)

    const resultado = await prepararAvatar(foto(5_000_000))

    expect(resultado.type).toBe('image/jpeg')
    expect(dibujar).toHaveBeenCalledWith(imagen, 200, 0, 600, 600, 0, 0, 512, 512)
    expect(aBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.85)
    expect(imagen.close).toHaveBeenCalled()
  })

  it('recorta bien una foto vertical', async () => {
    const { dibujar } = simularNavegador(600, 1000)

    await prepararAvatar(foto(10))

    expect(dibujar).toHaveBeenCalledWith(expect.anything(), 0, 200, 600, 600, 0, 0, 512, 512)
  })

  it('si el navegador no puede leer la imagen, sube la original cuando pesa poco', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('no soportado')))
    const original = foto(MAX_BYTES_AVATAR)

    expect(await prepararAvatar(original)).toBe(original)
  })

  it('si el navegador no puede y la original pesa más de 2 MB, falla con un mensaje', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('no soportado')))

    await expect(prepararAvatar(foto(MAX_BYTES_AVATAR + 1))).rejects.toThrow('No se ha podido preparar la foto')
  })

  it('si el lienzo no genera la imagen, usa la original cuando pesa poco', async () => {
    simularNavegador(100, 100, null)
    const original = foto(100)

    expect(await prepararAvatar(original)).toBe(original)
  })

  it('si no hay contexto 2D, usa la original y libera la imagen', async () => {
    const imagen = { width: 100, height: 100, close: vi.fn() }
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(imagen))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    const original = foto(100)

    expect(await prepararAvatar(original)).toBe(original)
    expect(imagen.close).toHaveBeenCalled()
  })
})

describe('mensajeErrorPerfil', () => {
  it('traduce los códigos conocidos', () => {
    expect(mensajeErrorPerfil(new ApiError(0, 'sin_conexion', 'x'))).toBe('No hay conexión con el servidor. Inténtalo de nuevo')
    expect(mensajeErrorPerfil(new ApiError(400, 'archivo_demasiado_grande', 'x'))).toBe('La foto es demasiado grande (máximo 2 MB)')
    expect(mensajeErrorPerfil(new ApiError(400, 'tipo_no_permitido', 'x'))).toBe('La foto debe ser JPEG o PNG')
    expect(mensajeErrorPerfil(new ApiError(401, 'sin_sesion', 'x'))).toBe('Tu sesión ha caducado. Vuelve a iniciar sesión')
  })

  it('con otro código usa el mensaje del servidor', () => {
    const error = new ApiError(400, 'datos_invalidos', 'El nombre debe tener entre 1 y 100 caracteres')

    expect(mensajeErrorPerfil(error)).toBe('El nombre debe tener entre 1 y 100 caracteres')
  })

  it('con un Error normal usa su mensaje y con otra cosa, un texto genérico', () => {
    expect(mensajeErrorPerfil(new Error('No se ha podido preparar la foto'))).toBe('No se ha podido preparar la foto')
    expect(mensajeErrorPerfil('algo')).toBe('Ha ocurrido un error')
  })
})
