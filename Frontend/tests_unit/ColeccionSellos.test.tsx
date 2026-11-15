import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Perfil from '../src/screens/Perfil'
import { ApiError } from '../src/services/authApi'
import { cambiarDisenoSello, listarMisSellos, quitarSelloPorId, type Sello } from '../src/services/sellosApi'

vi.mock('../src/services/sellosApi', () => ({
  listarMisSellos: vi.fn(),
  cambiarDisenoSello: vi.fn(),
  quitarSelloPorId: vi.fn(),
}))

const sello = (cambios: Partial<Sello> = {}): Sello => ({
  id: 's1',
  viaje_id: 'v1',
  diseno: 'mapa',
  destino: 'Roma',
  anio: 2027,
  elegido_en: '2027-05-20T10:00:00Z',
  ...cambios,
})

const ROMA = sello()
const LISBOA = sello({ id: 's2', viaje_id: null, diseno: 'avion', destino: 'Lisboa', anio: 2026 })

const montar = () => render(<Perfil nombre="Adriana" email="adriana@travelwrap.app" token="token-1" />)
const abrirPasaporte = async () => {
  const usuario = userEvent.setup()
  await usuario.click(await screen.findByRole('button', { name: /Mi colección de sellos/ }))
  return { usuario, panel: await screen.findByRole('dialog', { name: /Pasaporte de viajes/ }) }
}

beforeEach(() => {
  vi.mocked(listarMisSellos).mockReset()
  vi.mocked(cambiarDisenoSello).mockReset()
  vi.mocked(quitarSelloPorId).mockReset()
})

afterEach(() => cleanup())

describe('Perfil · colección de sellos', () => {
  it('muestra «Cargando…» y después cuántos sellos tiene', async () => {
    vi.mocked(listarMisSellos).mockResolvedValue({ sellos: [ROMA, LISBOA] })
    montar()

    expect(screen.getByText('Cargando…')).toBeTruthy()
    expect(await screen.findByText('2 sellos conseguidos')).toBeTruthy()
    expect(listarMisSellos).toHaveBeenCalledWith('token-1')
  })

  it('con un solo sello usa el singular y sin ninguno dice 0', async () => {
    vi.mocked(listarMisSellos).mockResolvedValueOnce({ sellos: [ROMA] })
    const { unmount } = montar()
    expect(await screen.findByText('1 sello conseguido')).toBeTruthy()
    unmount()

    vi.mocked(listarMisSellos).mockResolvedValueOnce({ sellos: [] })
    montar()
    expect(await screen.findByText('0 sellos conseguidos')).toBeTruthy()
  })

  it('abre el pasaporte con un sello por viaje (también el de un viaje borrado) y lo cierra', async () => {
    vi.mocked(listarMisSellos).mockResolvedValue({ sellos: [ROMA, LISBOA] })
    montar()
    const { usuario, panel } = await abrirPasaporte()

    expect(within(panel).getByText('Tus recuerdos convertidos en sellos')).toBeTruthy()
    expect(within(panel).getByRole('img', { name: 'Sello de Roma 2027' })).toBeTruthy()
    expect(within(panel).getByRole('img', { name: 'Sello de Lisboa 2026' })).toBeTruthy()

    await usuario.click(within(panel).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('sin sellos el pasaporte invita a terminar un viaje', async () => {
    vi.mocked(listarMisSellos).mockResolvedValue({ sellos: [] })
    montar()
    const { panel } = await abrirPasaporte()

    expect(within(panel).getByText('Aún no tienes sellos. Termina un viaje para conseguir el primero')).toBeTruthy()
  })

  it('si falla la carga muestra el error y «Reintentar» vuelve a pedirlos', async () => {
    vi.mocked(listarMisSellos).mockRejectedValueOnce(new ApiError(502, 'error_sello', 'No se han podido obtener los sellos'))
    vi.mocked(listarMisSellos).mockResolvedValueOnce({ sellos: [ROMA] })
    const usuario = userEvent.setup()
    montar()

    expect(await screen.findByText('No se han podido cargar los sellos')).toBeTruthy()
    expect((screen.getByRole('button', { name: /Mi colección de sellos/ }) as HTMLButtonElement).disabled).toBe(true)

    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('1 sello conseguido')).toBeTruthy()
    expect(listarMisSellos).toHaveBeenCalledTimes(2)
  })

  it('cambiar el diseño de un sello desde el pasaporte llama a PATCH y actualiza la lista', async () => {
    vi.mocked(listarMisSellos).mockResolvedValue({ sellos: [ROMA] })
    vi.mocked(cambiarDisenoSello).mockResolvedValue({ sello: { ...ROMA, diseno: 'ruta' } })
    montar()
    const { usuario, panel } = await abrirPasaporte()

    await usuario.click(within(panel).getByRole('button', { name: 'Cambiar el sello de Roma 2027' }))
    const selector = (await screen.findAllByRole('dialog'))[1]
    await usuario.click(within(selector).getByRole('button', { name: 'Sello 3: Ruta' }))
    await usuario.click(within(selector).getByRole('button', { name: 'Elegir' }))

    await waitFor(() => expect(cambiarDisenoSello).toHaveBeenCalledWith('s1', 'ruta', 'token-1'))
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1))
  })

  it('quitar un sello desde el pasaporte llama a DELETE y baja el contador', async () => {
    vi.mocked(listarMisSellos).mockResolvedValue({ sellos: [ROMA, LISBOA] })
    vi.mocked(quitarSelloPorId).mockResolvedValue(null)
    montar()
    const { usuario, panel } = await abrirPasaporte()

    await usuario.click(within(panel).getByRole('button', { name: 'Cambiar el sello de Lisboa 2026' }))
    const selector = (await screen.findAllByRole('dialog'))[1]
    await usuario.click(within(selector).getByRole('button', { name: 'Deseleccionar todos' }))
    await usuario.click(within(selector).getByRole('button', { name: 'Elegir' }))

    await waitFor(() => expect(quitarSelloPorId).toHaveBeenCalledWith('s2', 'token-1'))
    await waitFor(() => expect(within(panel).queryByRole('img', { name: 'Sello de Lisboa 2026' })).toBeNull())
    expect(within(panel).getByRole('img', { name: 'Sello de Roma 2027' })).toBeTruthy()
  })

  it('si falla el cambio el selector sigue abierto con el error y el sello no cambia', async () => {
    vi.mocked(listarMisSellos).mockResolvedValue({ sellos: [ROMA] })
    vi.mocked(cambiarDisenoSello).mockRejectedValue(new ApiError(502, 'error_sello', 'No se ha podido cambiar el sello'))
    montar()
    const { usuario, panel } = await abrirPasaporte()

    await usuario.click(within(panel).getByRole('button', { name: 'Cambiar el sello de Roma 2027' }))
    const selector = (await screen.findAllByRole('dialog'))[1]
    await usuario.click(within(selector).getByRole('button', { name: 'Sello 1: Chincheta' }))
    await usuario.click(within(selector).getByRole('button', { name: 'Elegir' }))

    expect((await within(selector).findByRole('alert')).textContent).toContain('No se ha podido cambiar el sello')
    expect(screen.getAllByRole('dialog')).toHaveLength(2)
  })
})
