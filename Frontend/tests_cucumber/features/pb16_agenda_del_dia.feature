# language: es
Característica: Ver la agenda del día en el itinerario (PB-16)
  Como miembro de un viaje
  Quiero ver las actividades de cada día ordenadas por hora
  Para saber qué toca hacer en cada momento del viaje

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850

  Escenario: El itinerario muestra las actividades del primer día ordenadas por hora
    Dado que el servidor devuelve en "Roma 2027" la actividad "Desayuno" el "2027-05-12" a las "08:30"
    Y que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" a las "10:00"
    Y que el servidor devuelve en "Roma 2027" la actividad "Vaticano" el "2027-05-13" a las "09:30"
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces veo en la agenda, por este orden, "Desayuno" y "Visita al Coliseo"
    Y no veo en la agenda la actividad "Vaticano"

  Escenario: Un viaje archivado muestra la agenda pero no deja añadir actividades
    Dado que tengo el viaje archivado "Lisboa 2026"
    Y que el servidor devuelve en "Lisboa 2026" la actividad "Tranvía 28" el "2027-05-12" a las "11:00"
    Cuando abro el itinerario del viaje "Lisboa 2026"
    Entonces veo en la agenda, por este orden, "Tranvía 28"
    Y no veo el botón "Añadir Actividad"
