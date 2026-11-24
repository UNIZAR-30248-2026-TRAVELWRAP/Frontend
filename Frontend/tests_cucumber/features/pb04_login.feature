# language: es
Característica: Iniciar sesión con email y contraseña (PB-04)
  Como usuario de TravelWrap
  Quiero iniciar sesión con mi email y mi contraseña
  Para acceder a mis viajes

  Antecedentes:
    Dado que existe un usuario registrado con email "daniel@travelwrap.app" y contraseña "secreta123"

  Escenario: Acceso con credenciales válidas
    Dado que estoy en la pantalla de inicio de sesión
    Cuando introduzco el email "daniel@travelwrap.app" y la contraseña "secreta123"
    Y pulso el botón "Iniciar sesión"
    Entonces accedo a la aplicación con la sesión de "daniel@travelwrap.app"

  Escenario: La sesión se mantiene al volver a abrir la aplicación
    Dado que he iniciado sesión con el email "daniel@travelwrap.app" y la contraseña "secreta123"
    Cuando recargo la aplicación
    Entonces accedo a la aplicación con la sesión de "daniel@travelwrap.app"
