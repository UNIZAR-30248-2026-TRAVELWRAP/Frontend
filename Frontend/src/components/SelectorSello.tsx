import { useState } from "react"
import Heading from "./Heading"
import Icon from "./Icon"
import Sello from "./Sello"
import { ApiError } from "../services/authApi"
import type { DisenoSello } from "../services/sellosApi"
import { C, NUNITO } from "../styles/tokens"
import { DISENOS_SELLO } from "../utils/sellos"

type SelectorSelloProps = {
  destino: string
  anio?: number | string | null
  // Diseño del sello que ya tiene el usuario en este viaje (null si no tiene)
  actual: DisenoSello | null
  // Guarda el diseño elegido; null quita el sello. Si falla, el diálogo se queda abierto con el error
  onGuardar: (diseno: DisenoSello | null) => Promise<void>
  onCerrar: () => void
}

// Ventana para elegir uno de los cuatro sellos del viaje. El sello marcado es el que aparece en el perfil
export default function SelectorSello({ destino, anio, actual, onGuardar, onCerrar }: SelectorSelloProps) {
  const [pendiente, setPendiente] = useState<DisenoSello | null>(actual)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  const handleElegir = async () => {
    // Sin cambios, o sin sello antes y ahora, no hace falta llamar a la API
    if (pendiente === actual) {
      onCerrar()
      return
    }
    setGuardando(true)
    setError("")
    try {
      await onGuardar(pendiente)
      onCerrar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se ha podido guardar el sello")
      setGuardando(false)
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        background: "rgba(13,31,60,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 22,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="selector-sello-titulo"
        style={{
          width: "100%",
          maxWidth: 436,
          maxHeight: "100%",
          overflowY: "auto",
          background: "white",
          borderRadius: 22,
          padding: 22,
          boxShadow: "0 18px 50px rgba(0,0,0,0.25)",
          boxSizing: "border-box",
        }}
      >
        <div id="selector-sello-titulo" style={{ overflowWrap: "anywhere" }}>
          <Heading size={20}>Elige tu sello de {destino}</Heading>
        </div>
        <div style={{ fontFamily: NUNITO, color: C.muted, fontSize: 13, lineHeight: 1.5, marginTop: 6, marginBottom: 16 }}>
          El sello marcado es el que aparece en tu perfil
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          {DISENOS_SELLO.map((diseno, indice) => {
            const marcado = pendiente === diseno.id
            return (
              <button
                key={diseno.id}
                type="button"
                aria-pressed={marcado}
                aria-label={`Sello ${indice + 1}: ${diseno.nombre}`}
                disabled={guardando}
                onClick={() => setPendiente(diseno.id)}
                style={{
                  position: "relative",
                  minHeight: 44,
                  padding: 8,
                  background: "white",
                  border: `2px solid ${marcado ? C.blue : "transparent"}`,
                  borderRadius: 14,
                  cursor: guardando ? "not-allowed" : "pointer",
                }}
              >
                <Sello diseno={diseno.id} destino={destino} anio={anio} indice={indice} />
                {marcado && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: C.blue,
                      color: "white",
                      fontWeight: 900,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          disabled={guardando || pendiente === null}
          onClick={() => setPendiente(null)}
          style={{
            width: "100%",
            minHeight: 40,
            border: `1.5px solid ${C.border}`,
            borderRadius: 12,
            background: "white",
            color: pendiente === null ? C.muted : C.navy,
            fontFamily: NUNITO,
            fontWeight: 800,
            fontSize: 13,
            cursor: guardando || pendiente === null ? "default" : "pointer",
            marginBottom: 16,
          }}
        >
          {pendiente === null ? "Ningún sello seleccionado" : "Deseleccionar todos"}
        </button>

        {error && (
          <div
            role="alert"
            style={{
              background: C.redBg,
              border: `1.5px solid ${C.red}55`,
              borderRadius: 12,
              padding: "10px 14px",
              color: C.red,
              fontFamily: NUNITO,
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            style={{
              flex: 1,
              minHeight: 44,
              border: `1.5px solid ${C.border}`,
              borderRadius: 13,
              background: "white",
              color: C.navy,
              fontFamily: NUNITO,
              fontWeight: 800,
              cursor: guardando ? "not-allowed" : "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleElegir}
            disabled={guardando}
            style={{
              flex: 1,
              minHeight: 44,
              border: "none",
              borderRadius: 13,
              background: C.blue,
              color: "white",
              fontFamily: NUNITO,
              fontWeight: 800,
              cursor: guardando ? "not-allowed" : "pointer",
              opacity: guardando ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Icon name="medal" size={16} color="white" strokeWidth={2} />
            {guardando ? "Guardando..." : "Elegir"}
          </button>
        </div>
      </div>
    </div>
  )
}
