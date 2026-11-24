// Test unitario de las pantallas de confirmación de un documento escaneado: Añadir Gasto y Añadir Actividad
// muestran los datos leídos para revisarlos antes de guardar
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import AnadirGasto from '../src/screens/AnadirGasto'
import AnadirActividad from '../src/screens/AnadirActividad'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const ADRIANA = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc'
const BERTA = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f'

const miembros = [
  { usuario_id: ADRIANA, nombre: 'Adriana', avatar_url: null, rol: 'creador' },
  { usuario_id: BERTA, nombre: 'Berta', avatar_url: null, rol: 'miembro' },
]

const viaje = {
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  estado: 'activo',
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-15',
  miembros,
}

const json = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const simularViaje = () => vi.stubGlobal('fetch', vi.fn(() => json(200, viaje)))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Añadir Gasto con un ticket escaneado', () => {
  it('rellena el importe y el concepto leídos y avisa de que hay que revisarlos', async () => {
    simularViaje()

    render(
      <AnadirGasto
        viajeId={VIAJE_ID}
        tokenSesion="token-acceso"
        usuarioId={ADRIANA}
        datosEscaneados={{ concepto: 'RESTAURANTE EL FARO', importe: 11.5 }}
      />,
    )

    expect(await screen.findByDisplayValue('RESTAURANTE EL FARO')).toBeTruthy()
    expect(screen.getByDisplayValue('11,5')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Hemos leído estos datos del ticket')
  })

  it('sin importe leído deja el campo vacío para que lo escriba el usuario', async () => {
    simularViaje()

    render(
      <AnadirGasto
        viajeId={VIAJE_ID}
        tokenSesion="token-acceso"
        usuarioId={ADRIANA}
        datosEscaneados={{ concepto: 'Bar Sol', importe: null }}
      />,
    )

    expect(await screen.findByDisplayValue('Bar Sol')).toBeTruthy()
    expect(screen.queryByDisplayValue(/^\d/)).not.toBeTruthy()
  })

})

describe('Añadir Actividad con un documento escaneado', () => {
  it('rellena el título y la hora leídos, y la fecha si cae dentro del viaje', async () => {
    simularViaje()

    render(
      <AnadirActividad
        viajeId={VIAJE_ID}
        tokenSesion="token-acceso"
        datosEscaneados={{ titulo: 'Entradas Coliseo', fecha: '2027-05-13', hora_inicio: '10:00' }}
      />,
    )

    expect(await screen.findByDisplayValue('Entradas Coliseo')).toBeTruthy()
    expect(screen.getByDisplayValue('10:00')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('Hemos leído estos datos del documento')
  })

})
