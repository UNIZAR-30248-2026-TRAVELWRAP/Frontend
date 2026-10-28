import { useId, useState, type FormEvent } from "react"
import Icon from "./Icon"
import { ApiError } from "../services/authApi"
import { C, NUNITO } from "../styles/tokens"

const MAX_TEXTO = 100

type ProponerOpcionProps = {
  // Texto de la etiqueta, p. ej. «Proponer destino»
  etiqueta: string
  placeholder: string
  // Opciones que ya tiene la votación, para no proponer una repetida
  existentes: string[]
  avisoRepetida: string
  // Guarda la propuesta; si falla, se muestra el mensaje del error
  onProponer: (texto: string) => Promise<unknown>
}

// Formulario para proponer una opción nueva en una votación abierta (un destino, una fecha, una actividad...)
export default function ProponerOpcion({ etiqueta, placeholder, existentes, avisoRepetida, onProponer }: ProponerOpcionProps) {
  const id = useId()
  const [texto, setTexto] = useState("")
  const [aviso, setAviso] = useState("")
  const [enviando, setEnviando] = useState(false)

  const puedeEnviar = texto.trim() !== "" && !enviando

  const proponer = async (event: FormEvent) => {
    event.preventDefault()
    const limpio = texto.trim()
    if (!limpio) return
    if (limpio.length > MAX_TEXTO) {
      setAviso(`Tiene un máximo de ${MAX_TEXTO} caracteres`)
      return
    }
    if (existentes.some((existente) => existente.toLowerCase() === limpio.toLowerCase())) {
      setAviso(avisoRepetida)
      return
    }
    setEnviando(true)
    try {
      await onProponer(limpio)
      setTexto("")
      setAviso("")
    } catch (e) {
      setAviso(e instanceof ApiError ? e.message : "Ha ocurrido un error")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={proponer} style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
      <label
        htmlFor={id}
        style={{
          display: "block",
          color: C.muted,
          fontSize: 10,
          fontWeight: 700,
          fontFamily: NUNITO,
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {etiqueta}
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id={id}
          value={texto}
          onChange={(event) => {
            setTexto(event.target.value)
            setAviso("")
          }}
          placeholder={placeholder}
          style={{
            flex: 1,
            minWidth: 0,
            background: C.bg,
            border: `1.5px solid ${C.border}`,
            borderRadius: 12,
            padding: "10px 14px",
            fontFamily: NUNITO,
            fontSize: 16,
            color: C.navy,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={!puedeEnviar}
          style={{
            background: C.blue,
            color: "white",
            border: "none",
            borderRadius: 12,
            padding: "10px 14px",
            cursor: puedeEnviar ? "pointer" : "not-allowed",
            opacity: puedeEnviar ? 1 : 0.6,
            fontFamily: NUNITO,
            fontWeight: 700,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Icon name="plus" size={14} color="white" strokeWidth={2.5} />
          Añadir
        </button>
      </div>
      {aviso && (
        <div role="alert" style={{ fontFamily: NUNITO, color: C.red, fontSize: 12, fontWeight: 700, marginTop: 8 }}>
          {aviso}
        </div>
      )}
    </form>
  )
}
