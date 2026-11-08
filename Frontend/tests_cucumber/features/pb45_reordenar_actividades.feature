# language: es
Característica: Reordenar las actividades del día arrastrándolas (PB-45)
  Como miembro de un viaje
  Quiero cambiar el orden de las actividades sin hora o a la misma hora
  Para organizar el día como prefiera

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850

  Escenario: Solo se pueden mover las actividades sin hora o a la misma hora
    Dado que el servidor devuelve en "Roma 2027" la actividad "Desayuno" el "2027-05-12" a las "08:30"
    Y que el servidor devuelve en "Roma 2027" la actividad "Paseo" el "2027-05-12" sin hora
    Y que el servidor devuelve en "Roma 2027" la actividad "Compras" el "2027-05-12" sin hora
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces puedo mover la actividad "Paseo"
    Y puedo mover la actividad "Compras"
    Y no puedo mover la actividad "Desayuno"
    Y veo el texto "Las actividades sin hora, o que empiezan a la misma hora, se pueden ordenar arrastrando el asa."

  Escenario: Arrastrar una actividad sin hora cambia el orden de la agenda
    Dado que el servidor devuelve en "Roma 2027" la actividad "Desayuno" el "2027-05-12" a las "08:30"
    Y que el servidor devuelve en "Roma 2027" la actividad "Paseo" el "2027-05-12" sin hora
    Y que el servidor devuelve en "Roma 2027" la actividad "Compras" el "2027-05-12" sin hora
    Y que el servidor devuelve en "Roma 2027" la actividad "Fotos" el "2027-05-12" sin hora
    Cuando abro el itinerario del viaje "Roma 2027"
    Y arrastro la actividad "Fotos" sobre la actividad "Paseo"
    Entonces veo en la agenda, por este orden, "Desayuno", "Fotos", "Paseo" y "Compras"

  Escenario: Se puede mover una actividad con el teclado
    Dado que el servidor devuelve en "Roma 2027" la actividad "Paseo" el "2027-05-12" sin hora
    Y que el servidor devuelve en "Roma 2027" la actividad "Compras" el "2027-05-12" sin hora
    Cuando abro el itinerario del viaje "Roma 2027"
    Y muevo con el teclado la actividad "Paseo" una posición hacia abajo
    Entonces veo en la agenda, por este orden, "Compras" y "Paseo"

  Escenario: Un viaje archivado no deja mover las actividades
    Dado que tengo el viaje archivado "Lisboa 2026"
    Y que el servidor devuelve en "Lisboa 2026" la actividad "Tranvía 28" el "2027-05-12" sin hora
    Y que el servidor devuelve en "Lisboa 2026" la actividad "Alfama" el "2027-05-12" sin hora
    Cuando abro el itinerario del viaje "Lisboa 2026"
    Entonces no puedo mover la actividad "Tranvía 28"
    Y no puedo mover la actividad "Alfama"
