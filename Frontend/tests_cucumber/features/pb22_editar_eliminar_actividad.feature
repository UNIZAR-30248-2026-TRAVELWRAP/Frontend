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
