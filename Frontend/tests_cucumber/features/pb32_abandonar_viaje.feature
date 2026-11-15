# language: es
Característica: Abandonar un viaje (PB-32)
  Como miembro de un viaje que no es su creador
  Quiero abandonarlo cuando ya no tengo deudas
  Para dejar de verlo en Mis viajes sin afectar a los demás

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Abandonar con el saldo a cero
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que mi saldo en el viaje "Roma 2027" es "0"
    Cuando abro el inicio del viaje "Roma 2027"
    Y pulso el botón "Abandonar viaje"
    Entonces veo el diálogo de confirmación "¿Abandonar este viaje?"
    Cuando confirmo en el diálogo "Abandonar viaje"
    Entonces estoy en mis viajes
    Y no veo el viaje "Roma 2027" en mis viajes
    Y el servidor ha registrado que abandono el viaje "Roma 2027"

  Escenario: No se puede abandonar con deudas
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que mi saldo en el viaje "Roma 2027" es "-30"
    Cuando abro el inicio del viaje "Roma 2027"
    Y pulso el botón "Abandonar viaje"
    Entonces veo el diálogo de confirmación "Tienes cuentas pendientes"
    Y veo el texto "Debes 30,00 € en este viaje."
    Y veo el botón "Ir a Control de Gastos"
    Y el servidor no registra ningún abandono
