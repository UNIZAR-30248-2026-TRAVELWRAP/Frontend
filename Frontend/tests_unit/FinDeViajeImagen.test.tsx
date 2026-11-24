import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FinDeViaje from '../src/screens/FinDeViaje'

const mocks = vi.hoisted(() => ({
  crearImagenResumen: vi.fn(),
  descargarArchivo: vi.fn(),
  compartirFichero: vi.fn(),
}))

vi.mock('../src/utils/imagenResumen', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../src/utils/imagenResumen')>()
  return { ...original, crearImagenResumen: mocks.crearImagenResumen }
})

vi.mock('../src/utils/compartir', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('../src/utils/compartir')>()
  return { ...original, descargarArchivo: mocks.descargarArchivo, compartirFichero: mocks.compartirFichero }
})

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const BERTA = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f'

const viaje = {
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  destino: 'Roma, Italia',
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-15',
  estado: 'finalizado',
  archivado: false,
  miembros: [{ usuario_id: BERTA, nombre: 'Berta', avatar_url: null, rol: 'creador' }],
}

const resumen = {
  dias: 4,
  actividad_mas_votada: { titulo: 'Coliseo', votos: 3 },
  alma_del_grupo: { usuario_id: BERTA, nombre: 'Berta', pagos: 2, planes_propuestos: 0, fotos_subidas: 1 },
}

const fotos = Array.from({ length: 8 }, (_, i) => ({
  id: `f${i}`,
  viaje_id: VIAJE_ID,
  nombre: `foto${i}.jpg`,
  tipo_mime: 'image/jpeg',
  tamano_bytes: 1,
  subido_por: BERTA,
  creado_en: `2027-05-1${i}T10:00:00Z`,
  url: `https://storage.test/foto${i}.jpg`,
}))

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const simular = (opciones: { resumen?: unknown; fotos?: unknown[]; datosViaje?: Record<string, unknown> } = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.endsWith('/sello')) return json(200, { sello: null })
      if (url.endsWith('/resumen')) return json(200, opciones.resumen ?? resumen)
      if (url.endsWith('/fotos')) return json(200, { fotos: opciones.fotos ?? fotos })
      return json(200, { ...viaje, ...opciones.datosViaje })
    }),
  )

const abrirUltima = async () => {
  render(<FinDeViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
  await screen.findByText('TravelWrap · Resumen')
  const usuario = userEvent.setup()
  for (let i = 0; i < 5; i++) await usuario.keyboard('{ArrowRight}')
  return usuario
}

beforeEach(() => {
  mocks.crearImagenResumen.mockReset()
  mocks.descargarArchivo.mockReset()
  mocks.compartirFichero.mockReset()
  mocks.compartirFichero.mockResolvedValue('compartido')
  mocks.crearImagenResumen.mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  URL.createObjectURL = vi.fn(() => 'blob:resumen')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('FinDeViaje: resumen final y descarga de la imagen', () => {
  it('la última diapositiva enseña la imagen creada y el botón de descargar', async () => {
    simular()
    await abrirUltima()

    const imagen = await screen.findByAltText('Resumen del viaje a Roma, Italia')
    expect(imagen.getAttribute('src')).toBe('blob:resumen')
    expect(screen.getByRole('button', { name: 'Descargar imagen' })).toBeTruthy()
    expect(mocks.crearImagenResumen).toHaveBeenCalledTimes(1)
  })

  it('el botón no aparece antes de la última diapositiva y la imagen no se crea antes de llegar', async () => {
    simular()
    render(<FinDeViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    await screen.findByText('TravelWrap · Resumen')
    const usuario = userEvent.setup()
    for (let i = 0; i < 4; i++) await usuario.keyboard('{ArrowRight}')
    expect(screen.queryByRole('button', { name: 'Descargar imagen' })).toBeNull()
    expect(mocks.crearImagenResumen).not.toHaveBeenCalled()

    await usuario.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: 'Descargar imagen' })).toBeTruthy()
  })

  it('descarga la imagen ya creada con los datos del viaje y el nombre TravelWrap-lugar-año.png', async () => {
    simular()
    const usuario = await abrirUltima()
    await screen.findByAltText('Resumen del viaje a Roma, Italia')

    await usuario.click(screen.getByRole('button', { name: 'Descargar imagen' }))

    await waitFor(() => expect(mocks.descargarArchivo).toHaveBeenCalledTimes(1))
    expect(mocks.crearImagenResumen).toHaveBeenCalledTimes(1)
    const datos = mocks.crearImagenResumen.mock.calls[0][0]
    expect(datos.lugar).toBe('Roma, Italia')
    expect(datos.anio).toBe('2027')
    expect(datos.dias).toEqual({ numero: 4, texto: 'días de aventura' })
    expect(datos.estrella).toEqual({ titulo: 'Coliseo', votos: '3 votos' })
    expect(datos.alma.nombre).toBe('Berta')
    expect(datos.alma.estadisticas).toHaveLength(2)
    expect(datos.fotos).toHaveLength(6)
    expect(datos.totalFotos).toBe(8)

    const archivo = mocks.descargarArchivo.mock.calls[0][0] as File
    expect(archivo.name).toBe('TravelWrap-Roma-Italia-2027.png')
    expect(archivo.type).toBe('image/png')
  })

  it('lo que no tiene datos viaja como null', async () => {
    simular({ resumen: { dias: 0, actividad_mas_votada: null, alma_del_grupo: null }, fotos: [fotos[0]] })
    render(<FinDeViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    await screen.findByText('TravelWrap · Resumen')
    const usuario = userEvent.setup()
    await usuario.keyboard('{ArrowRight}')
    await usuario.keyboard('{ArrowRight}')

    await screen.findByAltText('Resumen del viaje a Roma, Italia')
    const datos = mocks.crearImagenResumen.mock.calls[0][0]
    expect(datos.dias).toBeNull()
    expect(datos.estrella).toBeNull()
    expect(datos.alma).toBeNull()
    expect(datos.fotos).toEqual(['https://storage.test/foto0.jpg'])
  })

  it('mientras se crea enseña «Creando tu resumen...» y el botón se bloquea', async () => {
    simular()
    let terminar: (blob: Blob) => void = () => {}
    mocks.crearImagenResumen.mockImplementation(() => new Promise<Blob>((resolver) => (terminar = resolver)))
    const usuario = await abrirUltima()

    expect(await screen.findByText('Creando tu resumen...')).toBeTruthy()
    const ocupado = screen.getByRole('button', { name: 'Creando la imagen...' })
    expect(ocupado.getAttribute('aria-busy')).toBe('true')
    expect((ocupado as HTMLButtonElement).disabled).toBe(true)
    await usuario.click(ocupado)
    expect(mocks.crearImagenResumen).toHaveBeenCalledTimes(1)

    terminar(new Blob(['png'], { type: 'image/png' }))
    await screen.findByAltText('Resumen del viaje a Roma, Italia')
    expect(screen.getByRole('button', { name: 'Descargar imagen' })).toBeTruthy()
    expect(mocks.descargarArchivo).not.toHaveBeenCalled()
  })

  it('si una foto no se puede cargar crea el resumen sin fotos y lo avisa', async () => {
    simular()
    const { ErrorDeImagen } = await import('../src/utils/imagenResumen')
    mocks.crearImagenResumen.mockRejectedValueOnce(new ErrorDeImagen('No se ha podido cargar alguna de las fotos para crear la imagen'))
    const usuario = await abrirUltima()

    await screen.findByAltText('Resumen del viaje a Roma, Italia')
    expect((await screen.findByRole('status')).textContent).toBe('No se han podido incluir las fotos en la imagen')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(mocks.crearImagenResumen.mock.calls[1][0].fotos).toEqual([])

    await usuario.click(screen.getByRole('button', { name: 'Descargar imagen' }))
    await waitFor(() => expect(mocks.descargarArchivo).toHaveBeenCalledTimes(1))
  })







  it('si compartir falla enseña un error', async () => {
    simular()
    mocks.compartirFichero.mockRejectedValue(new Error('boom'))
    const usuario = await abrirUltima()
    await screen.findByAltText('Resumen del viaje a Roma, Italia')

    await usuario.click(screen.getByRole('button', { name: 'Compartir' }))

    expect((await screen.findByRole('alert')).textContent).toBe('No se ha podido compartir la imagen')
  })


  it('un viaje sin datos también enseña el resumen y se descarga', async () => {
    simular({ resumen: { dias: 0, actividad_mas_votada: null, alma_del_grupo: null }, fotos: [] })
    render(<FinDeViaje viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    await screen.findByText('TravelWrap · Resumen')
    const usuario = userEvent.setup()
    await usuario.keyboard('{ArrowRight}')
    expect(await screen.findByAltText('Resumen del viaje a Roma, Italia')).toBeTruthy()
    const datos = mocks.crearImagenResumen.mock.calls[0][0]
    expect(datos.dias).toBeNull()
    expect(datos.estrella).toBeNull()
    expect(datos.alma).toBeNull()
    expect(datos.fotos).toEqual([])

    await usuario.click(screen.getByRole('button', { name: 'Descargar imagen' }))

    await waitFor(() => expect(mocks.descargarArchivo).toHaveBeenCalledTimes(1))
    expect(mocks.crearImagenResumen).toHaveBeenCalledTimes(1)
  })
})
