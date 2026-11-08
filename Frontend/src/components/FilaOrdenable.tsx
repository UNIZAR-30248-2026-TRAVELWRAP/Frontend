import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from "react"
import { closestCenter, DndContext, type DndContextProps, type SensorDescriptor, type SensorOptions } from "@dnd-kit/core"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export type AsaDeArrastre = {
  referencia: Ref<HTMLButtonElement>
  atributos: HTMLAttributes<HTMLButtonElement>
  oyentes: HTMLAttributes<HTMLButtonElement> | undefined
  arrastrando: boolean
}

type FilaOrdenableProps = {
  id: string
  estilo: CSSProperties
  children: (asa: AsaDeArrastre) => ReactNode
}

export default function FilaOrdenable({ id, estilo, children }: FilaOrdenableProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      role="listitem"
      style={{
        ...estilo,
        transform: CSS.Translate.toString(transform),
        transition,
        position: "relative",
        zIndex: isDragging ? 5 : undefined,
        opacity: isDragging ? 0.92 : 1,
      }}
    >
      {children({
        referencia: setActivatorNodeRef,
        atributos: attributes as unknown as HTMLAttributes<HTMLButtonElement>,
        oyentes: listeners as unknown as HTMLAttributes<HTMLButtonElement> | undefined,
        arrastrando: isDragging,
      })}
    </div>
  )
}

type ZonaDeArrastreProps = {
  activa: boolean
  sensores: SensorDescriptor<SensorOptions>[]
  alSoltar: DndContextProps["onDragEnd"]
  accesibilidad: DndContextProps["accessibility"]
  children: ReactNode
}

export function ZonaDeArrastre({ activa, sensores, alSoltar, accesibilidad, children }: ZonaDeArrastreProps) {
  if (!activa) return <>{children}</>
  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar} accessibility={accesibilidad}>
      {children}
    </DndContext>
  )
}
