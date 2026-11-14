// Tests unitarios de abrir y descargar documentos: el diálogo de vista previa (imagen y PDF) y su uso desde la Cartera.
// pdfjs-dist se simula: aquí se comprueba qué hace la pantalla con él, no el dibujado real de las páginas
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CarteraDocumentos from '../src/screens/CarteraDocumentos'
import VistaPreviaDocumento from '../src/components/VistaPreviaDocumento'

const pdfjsSimulado = vi.hoisted(() => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: {},
}))

vi.mock('../src/services/pdfjs', () => ({ cargarPdfjs: async () => pdfjsSimulado }))

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const BERTA = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f'
const URL_FIRMADA = 'https://storage.test/firmada?token=abc'

const PDF = {
  id: 'd1',
  viaje_id: VIAJE_ID,
  nombre: 'Billete de tren.pdf',
  tipo_mime: 'application/pdf' as const,
  tamano_bytes: 248731,
  subido_por: BERTA,
  creado_en: '2026-11-08T10:00:00Z',
}
const IMAGEN = { ...PDF, id: 'd2', nombre: 'Foto del hotel.png', tipo_mime: 'image/png' as const }

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const enlace = (documento = PDF) => ({
  url: URL_FIRMADA,
  expira_en: '2026-11-08T10:05:00Z',
  nombre: documento.nombre,
  tipo_mime: documento.tipo_mime,
})

// PDF falso de `paginas` páginas, con las llamadas que se le hacen
const simularPdf = (paginas: number) => {
  const render = vi.fn(() => ({ promise: Promise.resolve() }))
  const destroy = vi.fn(() => Promise.resolve())
  const pagina = {
    getViewport: ({ scale }: { scale: number }) => ({ width: 100 * scale, height: 140 * scale }),
    render,
  }
  pdfjsSimulado.getDocument.mockReturnValue({
    promise: Promise.resolve({ numPages: paginas, getPage: async () => pagina }),
    destroy,
  })
  return { render, destroy }
}

// Backend simulado: GET .../url con la respuesta indicada (y, aparte, el viaje y la lista de la Cartera)
const simularBackend = (respuestaUrl: () => Promise<Response> = () => json(200, enlace())) => {
  const fetchMock = vi.fn((url: string) => {
    if (url.includes('/url')) return respuestaUrl()
    if (url.endsWith('/documentos')) return json(200, { documentos: [IMAGEN, PDF] })
    return json(200, {
      id: VIAJE_ID,
      nombre: 'Roma 2027',
      estado: 'activo',
      miembros: [{ usuario_id: BERTA, nombre: 'Berta', avatar_url: null, rol: 'creador' }],
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const llamadasUrl = (fetchMock: ReturnType<typeof simularBackend>) =>
  fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('/url'))

const abrirDialogo = (documento = PDF, onCerrar = vi.fn()) => {
  render(<VistaPreviaDocumento viajeId={VIAJE_ID} documento={documento} tokenSesion="token-acceso" onCerrar={onCerrar} />)
  return onCerrar
}

const asignarUbicacion = vi.fn()

beforeEach(() => {
  pdfjsSimulado.getDocument.mockReset()
  asignarUbicacion.mockReset()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as unknown as CanvasRenderingContext2D)
  vi.stubGlobal('location', { ...window.location, assign: asignarUbicacion })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('VistaPreviaDocumento: imagen', () => {
  it('muestra «Cargando...» y después la imagen ampliada con la URL firmada', async () => {
    simularBackend(() => json(200, enlace(IMAGEN)))
    abrirDialogo(IMAGEN)

    expect(screen.getByText('Cargando...')).toBeTruthy()
    const imagen = await screen.findByRole('img', { name: 'Foto del hotel.png' })
    expect(imagen.getAttribute('src')).toBe(URL_FIRMADA)
    expect(screen.getByRole('dialog', { name: 'Documento: Foto del hotel.png' })).toBeTruthy()
    expect(pdfjsSimulado.getDocument).not.toHaveBeenCalled()
  })

  it('si la imagen no se puede cargar, muestra el error con «Reintentar»', async () => {
    simularBackend(() => json(200, enlace(IMAGEN)))
    abrirDialogo(IMAGEN)

    fireEvent.error(await screen.findByRole('img', { name: 'Foto del hotel.png' }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/No se ha podido mostrar el documento/)
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })
})

describe('VistaPreviaDocumento: PDF', () => {
  it('carga el PDF con pdf.js desde la URL firmada y dibuja todas las páginas', async () => {
    simularBackend()
    const { render: dibujar, destroy } = simularPdf(3)
    abrirDialogo()

    await waitFor(() => expect(dibujar).toHaveBeenCalledTimes(3))
    expect(pdfjsSimulado.getDocument).toHaveBeenCalledWith({ url: URL_FIRMADA })
    expect(screen.getAllByLabelText(/^Página \d del documento$/)).toHaveLength(3)
    expect(screen.getByRole('status').textContent).toBe('Página 1 de 3')

    cleanup()
    expect(destroy).toHaveBeenCalled()
  })

  it('el indicador cambia de página al desplazarse', async () => {
    simularBackend()
    const { render: dibujar } = simularPdf(3)
    abrirDialogo()
    await waitFor(() => expect(dibujar).toHaveBeenCalledTimes(3))

    const paginas = screen.getAllByLabelText(/^Página \d del documento$/)
    // jsdom no hace maquetación: se fijan a mano las posiciones de cada página
    paginas.forEach((pagina, indice) => Object.defineProperty(pagina, 'offsetTop', { value: indice * 200, configurable: true }))
    const zona = paginas[0].parentElement as HTMLElement
    Object.defineProperty(zona, 'clientHeight', { value: 400, configurable: true })
    zona.scrollTop = 100
    fireEvent.scroll(zona)

    expect(screen.getByRole('status').textContent).toBe('Página 2 de 3')
  })

  it('si pdf.js no puede leer el PDF, muestra el error con «Reintentar» y reintenta pidiendo otra URL', async () => {
    const fetchMock = simularBackend()
    pdfjsSimulado.getDocument.mockImplementationOnce(() => ({ promise: Promise.reject(new Error('CORS')), destroy: vi.fn(() => Promise.resolve()) }))
    abrirDialogo()

    expect((await screen.findByRole('alert')).textContent).toMatch(/No se ha podido mostrar el documento/)

    simularPdf(1)
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await screen.findByLabelText('Página 1 del documento')
    expect(llamadasUrl(fetchMock)).toHaveLength(2)
  })
})

describe('VistaPreviaDocumento: errores, descarga y cierre', () => {
  it('si el servidor falla, muestra el motivo y «Reintentar» vuelve a pedir la URL', async () => {
    let intentos = 0
    const fetchMock = simularBackend(() =>
      ++intentos === 1 ? json(502, { error: { codigo: 'error_documento', mensaje: 'Servicio caído' } }) : json(200, enlace(IMAGEN)),
    )
    abrirDialogo(IMAGEN)

    expect((await screen.findByRole('alert')).textContent).toBe('No se ha podido abrir el documento: Servicio caído')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    await screen.findByRole('img', { name: 'Foto del hotel.png' })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(llamadasUrl(fetchMock)).toHaveLength(2)
  })

  it('si el documento se ha borrado, el mensaje lo dice', async () => {
    simularBackend(() => json(404, { error: { codigo: 'documento_no_encontrado', mensaje: 'No existe' } }))
    abrirDialogo()

    expect((await screen.findByRole('alert')).textContent).toMatch(/ya no existe/)
  })

  it('«Descargar» pide la URL con descargar=true y la abre', async () => {
    const fetchMock = simularBackend(() => json(200, enlace(IMAGEN)))
    abrirDialogo(IMAGEN)
    await screen.findByRole('img', { name: 'Foto del hotel.png' })

    await userEvent.click(screen.getByRole('button', { name: 'Descargar' }))

    await waitFor(() => expect(asignarUbicacion).toHaveBeenCalledWith(URL_FIRMADA))
    expect(llamadasUrl(fetchMock).at(-1)).toContain('/documentos/d2/url?descargar=true')
  })

  it('si falla la descarga, muestra el error', async () => {
    let intentos = 0
    simularBackend(() => (++intentos === 1 ? json(200, enlace(IMAGEN)) : json(404, { error: { codigo: 'documento_no_encontrado', mensaje: 'No existe' } })))
    abrirDialogo(IMAGEN)
    await screen.findByRole('img', { name: 'Foto del hotel.png' })

    await userEvent.click(screen.getByRole('button', { name: 'Descargar' }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/ya no existe/)
    expect(asignarUbicacion).not.toHaveBeenCalled()
  })

  it('se cierra con el botón «Cerrar» y con la tecla Escape', async () => {
    simularBackend(() => json(200, enlace(IMAGEN)))
    const onCerrar = abrirDialogo(IMAGEN)
    await screen.findByRole('img', { name: 'Foto del hotel.png' })

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(onCerrar).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCerrar).toHaveBeenCalledTimes(2)
  })
})

describe('CarteraDocumentos: abrir y descargar', () => {
  const abrirCartera = async (estado = 'activo') => {
    const fetchMock = simularBackend(() => json(200, enlace(IMAGEN)))
    if (estado !== 'activo') {
      const original = fetchMock.getMockImplementation()!
      fetchMock.mockImplementation((url: string) =>
        url.endsWith('/documentos') || url.includes('/url')
          ? original(url)
          : json(200, { id: VIAJE_ID, nombre: 'Roma 2027', estado, miembros: [] }),
      )
    }
    render(<CarteraDocumentos viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    await screen.findByText('Documentos del viaje')
    return fetchMock
  }

  it('cada tarjeta tiene un botón «Abrir X» que abre la vista previa y «Cerrar» la quita', async () => {
    await abrirCartera()

    await userEvent.click(screen.getByRole('button', { name: 'Abrir Foto del hotel.png' }))

    expect(await screen.findByRole('img', { name: 'Foto del hotel.png' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('el botón «Descargar X» de la tarjeta descarga sin abrir la vista previa', async () => {
    const fetchMock = await abrirCartera()

    await userEvent.click(screen.getByRole('button', { name: 'Descargar Foto del hotel.png' }))

    await waitFor(() => expect(asignarUbicacion).toHaveBeenCalledWith(URL_FIRMADA))
    expect(llamadasUrl(fetchMock)[0]).toContain('/documentos/d2/url?descargar=true')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('si falla la descarga desde la tarjeta, avisa en la pantalla', async () => {
    simularBackend(() => json(404, { error: { codigo: 'documento_no_encontrado', mensaje: 'No existe' } }))
    render(<CarteraDocumentos viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    await screen.findByText('Documentos del viaje')

    await userEvent.click(screen.getByRole('button', { name: 'Descargar Billete de tren.pdf' }))

    expect((await screen.findByRole('alert')).textContent).toMatch(/ya no existe/)
  })

  it('en un viaje finalizado también se puede abrir un documento', async () => {
    await abrirCartera('finalizado')

    await userEvent.click(screen.getByRole('button', { name: 'Abrir Foto del hotel.png' }))

    expect(await screen.findByRole('img', { name: 'Foto del hotel.png' })).toBeTruthy()
  })
})
