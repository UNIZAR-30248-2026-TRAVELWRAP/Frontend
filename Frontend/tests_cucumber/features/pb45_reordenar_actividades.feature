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

  Escenario: Si el servidor no puede guardar el orden se avisa y la agenda vuelve a como estaba
    Dado que el servidor devuelve en "Roma 2027" la actividad "Desayuno" el "2027-05-12" a las "08:30"
    Y que el servidor devuelve en "Roma 2027" la actividad "Paseo" el "2027-05-12" sin hora
    Y que el servidor devuelve en "Roma 2027" la actividad "Compras" el "2027-05-12" sin hora
    Y que el servidor no puede guardar el orden de las actividades
    Cuando abro el itinerario del viaje "Roma 2027"
    Y arrastro la actividad "Compras" sobre la actividad "Paseo"
    Entonces veo la alerta "No se ha podido guardar el orden de las actividades"
    Y veo en la agenda, por este orden, "Desayuno", "Paseo" y "Compras"
