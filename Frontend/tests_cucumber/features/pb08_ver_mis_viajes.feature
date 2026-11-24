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

  Escenario: Sin sesión, las pantallas de viajes llevan al login
    Dado que estoy en el viaje en curso "Roma 2027" con destino "Roma"
    Cuando intento abrir "/viajes/viaje-1" sin haber iniciado sesión
    Entonces me lleva a la pantalla de inicio de sesión
