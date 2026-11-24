# language: es
Característica: Cualquier viajero gestiona todos los apartados del viaje (PB-62)
  Como viajero, sea o no el creador del viaje
  Quiero poder editar, finalizar y gestionar las votaciones del viaje
  Para que nadie dependa de una única persona, y que las votaciones solo se cierren cuando hayan votado todos

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Un miembro que no es el creador puede editar, finalizar y abandonar el viaje
    Dado que soy miembro, pero no creador, del viaje activo "Lisboa 2027"
    Cuando abro el viaje "Lisboa 2027" desde mis viajes
    Entonces veo el botón "Editar viaje"
    Y veo el botón "Finalizar viaje"
    Y veo el botón "Abandonar"

  Escenario: Un miembro que no es el creador finaliza el viaje tras confirmarlo
    Dado que soy miembro, pero no creador, del viaje activo "Lisboa 2027"
    Cuando abro el viaje "Lisboa 2027" desde mis viajes
    Y pulso el botón "Finalizar viaje"
    Entonces veo el diálogo de confirmación "¿Finalizar este viaje?"
