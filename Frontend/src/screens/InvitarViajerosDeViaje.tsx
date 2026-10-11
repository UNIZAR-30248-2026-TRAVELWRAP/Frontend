import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ApiError, type Sesion } from "../services/authApi"
import { obtenerEnlaceInvitacion } from "../services/invitacionesApi"
import { C, NUNITO } from "../styles/tokens"
import InvitarViajeros from "./InvitarViajeros"

type InvitarViajerosDeViajeProps = {
  sesion: Sesion
}

// Pide al backend el enlace de invitación del viaje de la URL y se lo pasa a la pantalla
export default function InvitarViajerosDeViaje({ sesion }: InvitarViajerosDeViajeProps) {
  const { viajeId = "" } = useParams()
  const navigate = useNavigate()
  const [enlace, setEnlace] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let vigente = true
    obtenerEnlaceInvitacion(viajeId, sesion.token)
      .then((invitacion) => {
        if (vigente) setEnlace(invitacion.enlace)
      })
      .catch((e) => {
        if (vigente) setError(e instanceof ApiError ? e.message : "Ha ocurrido un error")
      })
    return () => {
      vigente = false
    }
  }, [viajeId, sesion.token])

  if (error) {
    return (
      <div role="alert" style={{ padding: 24, fontFamily: NUNITO, color: C.red, fontWeight: 700 }}>
        {error}
      </div>
    )
  }
  if (!enlace) return null

  return <InvitarViajeros inviteLink={enlace} onBack={() => navigate(-1)} />
}
