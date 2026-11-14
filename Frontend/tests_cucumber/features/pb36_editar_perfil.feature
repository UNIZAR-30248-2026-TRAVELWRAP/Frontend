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

  Escenario: Sube una foto de perfil
    Cuando abro mi perfil
    Y elijo la foto "mi-foto.png" de tipo "image/png"
    Entonces veo mi foto de perfil
    Y el servidor ha recibido 1 foto de perfil
    Cuando recargo la aplicación
    Entonces veo mi foto de perfil

  Escenario: Una foto de un tipo no permitido se rechaza
    Cuando abro mi perfil
    Y elijo la foto "nota.gif" de tipo "image/gif"
    Entonces veo el mensaje de error "La foto debe ser JPEG o PNG"
    Y veo mi inicial "A"
    Y el servidor ha recibido 0 fotos de perfil

  Escenario: Quita su foto y se ve la inicial
    Cuando abro mi perfil
    Y elijo la foto "mi-foto.png" de tipo "image/png"
    Entonces veo mi foto de perfil
    Cuando pulso el botón "Cambiar foto de perfil"
    Y pulso el botón "Quitar foto"
    Entonces veo el diálogo de confirmación "¿Quitar tu foto de perfil?"
    Cuando confirmo en el diálogo "Quitar foto"
    Entonces no veo mi foto de perfil
    Y veo mi inicial "A"
    Y el servidor ha quitado la foto de perfil
