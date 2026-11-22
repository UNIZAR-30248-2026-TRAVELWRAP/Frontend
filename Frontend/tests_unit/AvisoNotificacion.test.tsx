import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import AvisoNotificacion from '../src/components/AvisoNotificacion'
import { rutaDeAviso, type AvisoViaje } from '../src/services/notificacionesTiempoReal'

let recibir: (aviso: AvisoViaje) => void = () => undefined
const dejarDeEscuchar = vi.fn()

vi.mock('../src/services/notificacionesTiempoReal', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('../src/services/notificacionesTiempoReal')>()),
  escucharAvisos: (_token: string, alRecibir: (aviso: AvisoViaje) => void) => {
    recibir = alRecibir
    return dejarDeEscuchar
  },
}))
vi.mock('../src/services/pushNotificaciones', () => ({ sincronizarPush: vi.fn() }))

const AVISO: AvisoViaje = {
  viaje_id: 'v1',
  viaje_nombre: 'Roma 2027',
  tipo: 'gasto',
  pantalla: 'gastos',
  texto: 'Ana ha registrado un gasto: Cena',
}

const Ruta = () => <p>Ruta: {useLocation().pathname + useLocation().search}</p>

const pintar = (rutaInicial = '/') =>
  render(
    <MemoryRouter initialEntries={[rutaInicial]}>
      <AvisoNotificacion tokenSesion="token" />
      <Routes>
        <Route path="*" element={<Ruta />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  dejarDeEscuchar.mockClear()
})
afterEach(() => cleanup())

describe('rutaDeAviso', () => {
  it('lleva cada aviso a su pantalla', () => {
    expect(rutaDeAviso({ viaje_id: 'v1', pantalla: 'votaciones' })).toBe('/viajes/v1/votaciones')
    expect(rutaDeAviso({ viaje_id: 'v1', pantalla: 'gastos' })).toBe('/viajes/v1/gastos')
    expect(rutaDeAviso({ viaje_id: 'v1', pantalla: 'chat' })).toBe('/viajes/v1/chat')
    expect(rutaDeAviso({ viaje_id: 'v1', pantalla: 'tareas' })).toBe('/viajes/v1/documentos?pestana=tareas')
  })
})

describe('AvisoNotificacion', () => {
  it('no muestra nada hasta que llega un aviso', () => {
    pintar()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('muestra el viaje y el motivo, y al tocarlo abre la pantalla correspondiente', async () => {
    pintar()
    act(() => recibir(AVISO))

    expect(screen.getByText('Roma 2027')).toBeTruthy()
    expect(screen.getByText('Ana ha registrado un gasto: Cena')).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: /Roma 2027: Ana ha registrado un gasto: Cena\. Abrir/ }))

    expect(screen.getByText('Ruta: /viajes/v1/gastos')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('se puede cerrar sin abrir la pantalla', async () => {
    pintar()
    act(() => recibir(AVISO))

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }))

    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByText('Ruta: /')).toBeTruthy()
  })

  it('no avisa si el usuario ya está viendo esa pantalla del viaje', () => {
    pintar('/viajes/v1/gastos')
    act(() => recibir(AVISO))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('avisa si está en otra pantalla u otro viaje', () => {
    pintar('/viajes/v2/gastos')
    act(() => recibir(AVISO))
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('deja de escuchar al desmontarse', () => {
    const { unmount } = pintar()
    unmount()
    expect(dejarDeEscuchar).toHaveBeenCalledOnce()
  })
})
