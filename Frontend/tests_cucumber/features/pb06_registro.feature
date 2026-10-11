# language: es
Característica: Registrarse con email (PB-06)
  Como persona que todavía no usa TravelWrap
  Quiero crear una cuenta con mi email y una contraseña
  Para poder entrar en la aplicación y organizar viajes

  Escenario: Registro correcto con confirmación de correo
    Dado que no existe ninguna cuenta con el email "ana@travelwrap.app"
    Y que estoy en la pantalla de registro
    Cuando relleno el registro con nombre "Ana López", email "ana@travelwrap.app" y contraseña "secreta123"
    Y pulso el botón "Crear cuenta"
    Entonces veo el aviso "Cuenta creada. Revisa tu correo y confirma tu email para iniciar sesión"
    Y sigo en la pantalla de registro

  Escenario: Registro con un email que ya tiene cuenta
    Dado que ya existe una cuenta con el email "daniel@travelwrap.app"
    Y que estoy en la pantalla de registro
    Cuando relleno el registro con nombre "Daniel", email "daniel@travelwrap.app" y contraseña "secreta123"
    Y pulso el botón "Crear cuenta"
    Entonces veo el mensaje de error "Ya existe una cuenta con ese email"
    Y sigo en la pantalla de registro

  Escenario: La contraseña es demasiado corta
    Dado que estoy en la pantalla de registro
    Cuando relleno el registro con nombre "Ana López", email "ana@travelwrap.app" y contraseña "corta"
    Entonces veo junto al campo el aviso "La contraseña debe tener al menos 8 caracteres"
    Y el botón "Crear cuenta" está desactivado

  Escenario: Las contraseñas no coinciden
    Dado que estoy en la pantalla de registro
    Cuando relleno el registro con nombre "Ana López", email "ana@travelwrap.app" y contraseña "secreta123"
    Y repito la contraseña como "secreta124"
    Entonces veo junto al campo el aviso "Las contraseñas no coinciden"
    Y el botón "Crear cuenta" está desactivado

  Escenario: Iniciar sesión sin haber confirmado el correo y pedir que se reenvíe
    Dado que tengo una cuenta con el email "ana@travelwrap.app" pendiente de confirmar
    Y que estoy en la pantalla de inicio de sesión
    Cuando introduzco el email "ana@travelwrap.app" y la contraseña "secreta123"
    Y pulso el botón "Iniciar sesión"
    Entonces veo un error que contiene "El email no está confirmado"
    Cuando pulso el botón "Reenviar correo de confirmación"
    Entonces veo el aviso "Te hemos enviado un nuevo correo de confirmación"
    Y sigo en la pantalla de inicio de sesión
