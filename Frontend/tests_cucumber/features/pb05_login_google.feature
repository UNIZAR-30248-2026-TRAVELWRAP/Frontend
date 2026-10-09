# language: es
Característica: Iniciar sesión con Google (PB-05)
  Como usuario de TravelWrap
  Quiero iniciar sesión con mi cuenta de Google
  Para entrar en la aplicación sin crear una contraseña

  Escenario: Acceso con una cuenta de Google
    Dado que mi cuenta de Google "daniel@gmail.com" con nombre "Daniel Blasco" acepta iniciar sesión en TravelWrap
    Y que estoy en la pantalla de inicio de sesión
    Cuando pulso el botón "Continuar con Google"
    Entonces accedo a la aplicación con la sesión de "daniel@gmail.com"

  Escenario: La sesión iniciada con Google se mantiene al volver a abrir la aplicación
    Dado que mi cuenta de Google "daniel@gmail.com" con nombre "Daniel Blasco" acepta iniciar sesión en TravelWrap
    Y que estoy en la pantalla de inicio de sesión
    Cuando pulso el botón "Continuar con Google"
    Y recargo la aplicación
    Entonces accedo a la aplicación con la sesión de "daniel@gmail.com"

  Escenario: El usuario cancela el inicio de sesión en Google
    Dado que cancelo el inicio de sesión en la pantalla de Google
    Y que estoy en la pantalla de inicio de sesión
    Cuando pulso el botón "Continuar con Google"
    Entonces veo el mensaje de error "Has cancelado el inicio de sesión con Google"
    Y sigo en la pantalla de inicio de sesión

  Escenario: El servidor no puede completar el inicio de sesión con Google
    Dado que el servidor no puede completar el inicio de sesión con Google
    Y que estoy en la pantalla de inicio de sesión
    Cuando pulso el botón "Continuar con Google"
    Entonces veo el mensaje de error "No se ha podido iniciar sesión con Google"
    Y sigo en la pantalla de inicio de sesión
