# language: es
Característica: Editar y eliminar una actividad del itinerario (PB-22)
  Como miembro de un viaje
  Quiero modificar o borrar una actividad
  Para que la agenda del grupo esté siempre al día

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850

  Escenario: Cambiar el nombre de una actividad actualiza la agenda
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" a las "10:00"
    Cuando abro el itinerario del viaje "Roma 2027"
    Y pulso editar la actividad "Visita al Coliseo"
    Y cambio el nombre de la actividad a "Coliseo y Foro"
    Y pulso el botón "Guardar cambios"
    Entonces estoy en el itinerario del viaje
    Y veo en la agenda, por este orden, "Coliseo y Foro"
    Y el servidor ha recibido el cambio de título a "Coliseo y Foro"

  Escenario: No se puede guardar una actividad sin cambiar nada
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" a las "10:00"
    Cuando abro el itinerario del viaje "Roma 2027"
    Y pulso editar la actividad "Visita al Coliseo"
    Entonces el botón "Guardar cambios" está desactivado

  Escenario: Pasar una actividad a otro día la lleva a ese día
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" a las "10:00"
    Y que el servidor devuelve en "Roma 2027" la actividad "Vaticano" el "2027-05-13" a las "09:30"
    Cuando abro el itinerario del viaje "Roma 2027"
    Y pulso editar la actividad "Visita al Coliseo"
    Y elijo el día "Día 2 · 13 may"
    Y pulso el botón "Guardar cambios"
    Entonces estoy en el itinerario del viaje
    Y veo en la agenda, por este orden, "Vaticano" y "Visita al Coliseo"
    Y el servidor ha recibido el cambio de día a "2027-05-13"

  Escenario: Eliminar una actividad pide confirmación y la quita de la agenda
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" a las "10:00"
    Y que el servidor devuelve en "Roma 2027" la actividad "Cena" el "2027-05-12" a las "21:00"
    Cuando abro el itinerario del viaje "Roma 2027"
    Y pulso eliminar la actividad "Visita al Coliseo"
    Entonces veo el diálogo de confirmación "¿Eliminar esta actividad?"
    Cuando confirmo en el diálogo "Eliminar actividad"
    Entonces ya no veo el diálogo de confirmación
    Y veo en la agenda, por este orden, "Cena"
    Y el servidor ha eliminado la actividad "Visita al Coliseo"

  Escenario: Cancelar el borrado deja la actividad como estaba
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" a las "10:00"
    Cuando abro el itinerario del viaje "Roma 2027"
    Y pulso eliminar la actividad "Visita al Coliseo"
    Y confirmo en el diálogo "Cancelar"
    Entonces ya no veo el diálogo de confirmación
    Y veo en la agenda, por este orden, "Visita al Coliseo"
    Y el servidor ha eliminado 0 actividades

  Escenario: Si el servidor rechaza el borrado se avisa y la actividad sigue
    Dado que el servidor devuelve en "Roma 2027" la actividad "Visita al Coliseo" el "2027-05-12" a las "10:00"
    Y que el servidor rechaza las actividades porque el viaje está cerrado
    Cuando abro el itinerario del viaje "Roma 2027"
    Y pulso eliminar la actividad "Visita al Coliseo"
    Y confirmo en el diálogo "Eliminar actividad"
    Entonces veo el mensaje de error "El viaje está cerrado y ya no se puede modificar"
    Y el servidor ha eliminado 0 actividades

  Escenario: Un viaje archivado no deja editar ni eliminar actividades
    Dado que tengo el viaje archivado "Lisboa 2026"
    Y que el servidor devuelve en "Lisboa 2026" la actividad "Tranvía 28" el "2027-05-12" a las "11:00"
    Cuando abro el itinerario del viaje "Lisboa 2026"
    Entonces veo en la agenda, por este orden, "Tranvía 28"
    Y no veo el botón "Editar Tranvía 28"
    Y no veo el botón "Eliminar Tranvía 28"
