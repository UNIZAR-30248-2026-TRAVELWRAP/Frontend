# language: es
Característica: Reordenar las actividades del día arrastrándolas (PB-45)
  Como miembro de un viaje
  Quiero colocar las actividades sin hora donde quiera del día
  Para organizar el día como prefiera

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850

  Escenario: Se pueden mover las actividades sin hora y las que comparten hora, pero no las que tienen una hora propia
    Dado que el servidor devuelve en "Roma 2027" la actividad "Desayuno" el "2027-05-12" a las "08:30"
    Y que el servidor devuelve en "Roma 2027" la actividad "Paseo" el "2027-05-12" sin hora
    Y que el servidor devuelve en "Roma 2027" la actividad "Compras" el "2027-05-12" sin hora
    Cuando abro el itinerario del viaje "Roma 2027"
    Entonces puedo mover la actividad "Paseo"
    Y puedo mover la actividad "Compras"
    Y no puedo mover la actividad "Desayuno"
    Y veo el texto "Las actividades sin hora se pueden colocar donde quieras arrastrando el asa; las que empiezan a la misma hora, entre sí."

  Escenario: Arrastrar una actividad sin hora cambia el orden de la agenda
    Dado que el servidor devuelve en "Roma 2027" la actividad "Desayuno" el "2027-05-12" a las "08:30"
    Y que el servidor devuelve en "Roma 2027" la actividad "Paseo" el "2027-05-12" sin hora
    Y que el servidor devuelve en "Roma 2027" la actividad "Compras" el "2027-05-12" sin hora
    Y que el servidor devuelve en "Roma 2027" la actividad "Fotos" el "2027-05-12" sin hora
    Cuando abro el itinerario del viaje "Roma 2027"
    Y arrastro la actividad "Fotos" sobre la actividad "Paseo"
    Entonces veo en la agenda, por este orden, "Desayuno", "Fotos", "Paseo" y "Compras"
    Y el servidor ha guardado el orden "Desayuno,Fotos,Paseo,Compras"

  Escenario: Una actividad sin hora se puede colocar entre las que tienen hora
    Dado que el servidor devuelve en "Roma 2027" la actividad "Desayuno" el "2027-05-12" a las "08:30"
    Y que el servidor devuelve en "Roma 2027" la actividad "Comida" el "2027-05-12" a las "14:00"
    Y que el servidor devuelve en "Roma 2027" la actividad "Paseo" el "2027-05-12" sin hora
    Cuando abro el itinerario del viaje "Roma 2027"
    Y arrastro la actividad "Paseo" sobre la actividad "Comida"
    Entonces veo en la agenda, por este orden, "Desayuno", "Paseo" y "Comida"
    Y el servidor ha guardado el orden "Desayuno,Paseo,Comida"

  Escenario: Una actividad sin hora se puede colocar la primera del día
    Dado que el servidor devuelve en "Roma 2027" la actividad "Desayuno" el "2027-05-12" a las "08:30"
    Y que el servidor devuelve en "Roma 2027" la actividad "Comida" el "2027-05-12" a las "14:00"
    Y que el servidor devuelve en "Roma 2027" la actividad "Paseo" el "2027-05-12" sin hora
    Cuando abro el itinerario del viaje "Roma 2027"
    Y arrastro la actividad "Paseo" sobre la actividad "Desayuno"
    Entonces veo en la agenda, por este orden, "Paseo", "Desayuno" y "Comida"

  Escenario: Si el servidor no puede guardar el orden se avisa y la agenda vuelve a como estaba
    Dado que el servidor devuelve en "Roma 2027" la actividad "Desayuno" el "2027-05-12" a las "08:30"
    Y que el servidor devuelve en "Roma 2027" la actividad "Paseo" el "2027-05-12" sin hora
    Y que el servidor devuelve en "Roma 2027" la actividad "Compras" el "2027-05-12" sin hora
    Y que el servidor no puede guardar el orden de las actividades
    Cuando abro el itinerario del viaje "Roma 2027"
    Y arrastro la actividad "Compras" sobre la actividad "Paseo"
    Entonces veo la alerta "No se ha podido guardar el orden de las actividades"
    Y veo en la agenda, por este orden, "Desayuno", "Paseo" y "Compras"

  Escenario: Si otra persona ha cambiado la agenda se avisa y se recarga
    Dado que el servidor devuelve en "Roma 2027" la actividad "Paseo" el "2027-05-12" sin hora
    Y que el servidor devuelve en "Roma 2027" la actividad "Compras" el "2027-05-12" sin hora
    Y que la agenda del día ha cambiado en el servidor
    Cuando abro el itinerario del viaje "Roma 2027"
    Y arrastro la actividad "Compras" sobre la actividad "Paseo"
    Entonces veo la alerta "La agenda de ese día ha cambiado"
    Y veo en la agenda, por este orden, "Paseo" y "Compras"

  Escenario: Un movimiento que no se puede hacer no se envía al servidor
    Dado que el servidor devuelve en "Roma 2027" la actividad "Desayuno" el "2027-05-12" a las "08:30"
    Y que el servidor devuelve en "Roma 2027" la actividad "Comida" el "2027-05-12" a las "14:00"
    Y que el servidor devuelve en "Roma 2027" la actividad "Paseo" el "2027-05-12" sin hora
    Cuando abro el itinerario del viaje "Roma 2027"
    Y arrastro la actividad "Paseo" sobre la actividad "Paseo"
    Entonces el servidor no ha recibido ningún orden

  Escenario: Se puede mover una actividad con el teclado
    Dado que el servidor devuelve en "Roma 2027" la actividad "Paseo" el "2027-05-12" sin hora
    Y que el servidor devuelve en "Roma 2027" la actividad "Compras" el "2027-05-12" sin hora
    Cuando abro el itinerario del viaje "Roma 2027"
    Y muevo con el teclado la actividad "Paseo" una posición hacia abajo
    Entonces veo en la agenda, por este orden, "Compras" y "Paseo"
    Y el servidor ha guardado el orden "Compras,Paseo"

  Escenario: Un viaje archivado no deja mover las actividades
    Dado que tengo el viaje archivado "Lisboa 2026"
    Y que el servidor devuelve en "Lisboa 2026" la actividad "Tranvía 28" el "2027-05-12" sin hora
    Y que el servidor devuelve en "Lisboa 2026" la actividad "Alfama" el "2027-05-12" sin hora
    Cuando abro el itinerario del viaje "Lisboa 2026"
    Entonces no puedo mover la actividad "Tranvía 28"
    Y no puedo mover la actividad "Alfama"
