# language: es
Característica: Ver mis viajes (PB-08)
  Como usuario de TravelWrap
  Quiero ver mis viajes activos y los anteriores
  Para entrar en cualquiera de ellos

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"

  Escenario: Mis viajes muestra los viajes activos, con o sin destino, y los anteriores
    Dado que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que estoy en el viaje en curso "Roma 2027" con destino "Roma"
    Y que estoy en el viaje "Verano 2027", pendiente de votar el destino
    Y que estuve en el viaje "Oporto 2026", que ya ha finalizado
    Cuando abro mis viajes
    Entonces veo el viaje "Roma 2027" entre mis viajes en curso
    Y veo el viaje "Verano 2027" como pendiente de destino
    Y veo el viaje "Oporto 2026" entre mis viajes anteriores

  Escenario: Los viajes archivados no aparecen en mis viajes
    Dado que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que estoy en el viaje en curso "Roma 2027" con destino "Roma"
    Y que archivé el viaje "París 2026"
    Cuando abro mis viajes
    Entonces veo el viaje "Roma 2027" entre mis viajes en curso
    Y no veo el viaje "París 2026" en mis viajes

  Escenario: Al pulsar un viaje se abre su inicio
    Dado que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que estoy en el viaje en curso "Roma 2027" con destino "Roma"
    Cuando abro mis viajes
    Y pulso el viaje "Roma 2027"
    Entonces estoy en el inicio del viaje "Roma 2027"

  Escenario: Al pulsar un viaje anterior también se abre su inicio
    Dado que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que estuve en el viaje "Oporto 2026", que ya ha finalizado
    Cuando abro mis viajes
    Y pulso el viaje "Oporto 2026"
    Entonces estoy en el inicio del viaje "Oporto 2026"

  Escenario: Un viaje pendiente de destino abre su votación del destino
    Dado que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que estoy en el viaje "Verano 2027", pendiente de votar el destino
    Cuando abro mis viajes
    Y pulso el viaje "Verano 2027"
    Entonces estoy en la votación del destino del viaje "Verano 2027"

  Escenario: Sin sesión, las pantallas de viajes llevan al login
    Dado que estoy en el viaje en curso "Roma 2027" con destino "Roma"
    Cuando intento abrir "/viajes/viaje-1" sin haber iniciado sesión
    Entonces me lleva a la pantalla de inicio de sesión
