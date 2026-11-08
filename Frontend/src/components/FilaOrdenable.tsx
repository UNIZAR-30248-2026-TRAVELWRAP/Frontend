import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from "react"
import { closestCenter, DndContext, type DndContextProps, type SensorDescriptor, type SensorOptions } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export type AsaDeArrastre = {
  referencia: Ref<HTMLButtonElement>
  atributos: HTMLAttributes<HTMLButtonElement>
  oyentes: HTMLAttributes<HTMLButtonElement> | undefined
  arrastrando: boolean
}

type FilaOrdenableProps = {
  id: string
  arrastrable: boolean
  estilo: CSSProperties
  children: (asa: AsaDeArrastre | null) => ReactNode
}

export default function FilaOrdenable({ id, arrastrable, estilo, children }: FilaOrdenableProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: { draggable: !arrastrable },
  })

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
      {children(
        arrastrable
          ? {
              referencia: setActivatorNodeRef,
              atributos: attributes as unknown as HTMLAttributes<HTMLButtonElement>,
              oyentes: listeners as unknown as HTMLAttributes<HTMLButtonElement> | undefined,
              arrastrando: isDragging,
            }
          : null,
      )}
    </div>
  )
}

type ZonaDeArrastreProps = {
  activa: boolean
  ids: string[]
  sensores: SensorDescriptor<SensorOptions>[]
  alSoltar: DndContextProps["onDragEnd"]
  accesibilidad: DndContextProps["accessibility"]
  children: ReactNode
}

export function ZonaDeArrastre({ activa, ids, sensores, alSoltar, accesibilidad, children }: ZonaDeArrastreProps) {
  if (!activa) return <>{children}</>
  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar} accessibility={accesibilidad}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}
