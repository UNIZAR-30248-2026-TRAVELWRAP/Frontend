# language: es
Característica: Editar el perfil: nombre y foto (PB-36)
  Como usuario de TravelWrap
  Quiero cambiar mi nombre y mi foto de perfil
  Para que mis compañeros de viaje me reconozcan en la app

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que el servidor guarda los cambios de mi perfil

  Escenario: Cambia su nombre
    Cuando abro mi perfil
    Y cambio mi nombre a "Ana Pérez"
    Entonces veo el texto "Ana Pérez"
    Y el servidor ha guardado el nombre "Ana Pérez"
    Cuando recargo la aplicación
    Entonces veo el texto "Ana Pérez"

  Escenario: Un nombre vacío no se guarda
    Cuando abro mi perfil
    Y escribo el nombre "   "
    Entonces veo el mensaje de error "Escribe tu nombre"
    Y el botón "Guardar" está desactivado
    Y el servidor no ha recibido ningún cambio del perfil
