import { useState } from "react"
import Heading from "./Heading"
import Icon from "./Icon"
import SelectorSello from "./SelectorSello"
import Sello from "./Sello"
import type { DisenoSello, Sello as SelloGuardado } from "../services/sellosApi"
import { C, NUNITO } from "../styles/tokens"
import { textoDelSello } from "../utils/sellos"

type PasaporteViajesProps = {
  sellos: SelloGuardado[]
  // Guarda el diseño elegido para un sello; null lo quita. Si falla, el selector se queda abierto con el error
  onGuardarSello: (sello: SelloGuardado, diseno: DisenoSello | null) => Promise<void>
  onCerrar: () => void
}

// Panel a pantalla completa con todos los sellos del usuario. Tocar uno permite cambiarlo o quitarlo
export default function PasaporteViajes({ sellos, onGuardarSello, onCerrar }: PasaporteViajesProps) {
  const [seleccionado, setSeleccionado] = useState<SelloGuardado | null>(null)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pasaporte-titulo"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 30,
        background: C.bg,
        overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px 32px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div id="pasaporte-titulo" style={{ flex: 1, minWidth: 0 }}>
            <Heading size={22}>Pasaporte de viajes</Heading>
            <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, marginTop: 2 }}>
              Tus recuerdos convertidos en sellos
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              border: `1.5px solid ${C.border}`,
              borderRadius: 12,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="close" size={18} color={C.navy} strokeWidth={2.2} />
          </button>
        </div>

        {sellos.length === 0 ? (
          <div
            style={{
              fontFamily: NUNITO,
              color: C.muted,
              fontSize: 14,
              lineHeight: 1.5,
              textAlign: "center",
              padding: "32px 12px",
            }}
          >
            Aún no tienes sellos. Termina un viaje para conseguir el primero
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {sellos.map((sello, indice) => (
              <button
                key={sello.id}
                type="button"
                aria-label={`Cambiar el sello de ${textoDelSello(sello.destino, sello.anio)}`}
                onClick={() => setSeleccionado(sello)}
                style={{ minHeight: 44, padding: 8, background: "none", border: "none", cursor: "pointer", minWidth: 0 }}
              >
                <Sello diseno={sello.diseno} destino={sello.destino} anio={sello.anio} indice={indice} />
              </button>
            ))}
          </div>
        )}
      </div>

      {seleccionado && (
        <SelectorSello
          destino={seleccionado.destino}
          anio={seleccionado.anio}
          actual={seleccionado.diseno}
          onGuardar={(diseno) => onGuardarSello(seleccionado, diseno)}
          onCerrar={() => setSeleccionado(null)}
        />
      )}
    </div>
  )
}
