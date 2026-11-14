# language: es
Característica: Galería de fotos compartida del viaje (PB-42)
  Como miembro de un viaje
  Quiero subir fotos a una galería compartida y verlas ampliadas
  Para que todo el grupo guarde y recuerde el viaje

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: La galería muestra las fotos del viaje de la más reciente a la más antigua
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la galería del viaje "Roma 2027" está la foto "coliseo.jpg"
    Y que en la galería del viaje "Roma 2027" está la foto "trevi.jpg"
    Cuando abro la galería del viaje "Roma 2027"
    Entonces veo en la galería, por este orden, "trevi.jpg, coliseo.jpg"
    Y veo el texto "2 fotos"

  Escenario: Un viaje sin fotos muestra la galería vacía
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Cuando abro la galería del viaje "Roma 2027"
    Entonces la galería está vacía
    Y veo el texto "0 fotos"

  Escenario: Subir una foto la añade la primera de la galería
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la galería del viaje "Roma 2027" está la foto "coliseo.jpg"
    Cuando abro la galería del viaje "Roma 2027"
    Y subo la foto "plaza.jpg" de tipo "image/jpeg"
    Entonces veo en la galería, por este orden, "plaza.jpg, coliseo.jpg"
    Y el servidor ha recibido 1 foto "plaza.jpg"

  Escenario: Subir varias fotos a la vez las añade todas a la galería
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Cuando abro la galería del viaje "Roma 2027"
    Y subo a la vez las fotos "uno.jpg, dos.jpg"
    Entonces veo en la galería, por este orden, "dos.jpg, uno.jpg"
    Y veo el texto "2 fotos"

  Escenario: Un PDF no se puede subir como foto y la galería no cambia
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la galería del viaje "Roma 2027" está la foto "coliseo.jpg"
    Cuando abro la galería del viaje "Roma 2027"
    Y subo la foto "billete.pdf" de tipo "application/pdf"
    Entonces veo el mensaje de error "Solo se pueden subir fotos JPEG, PNG o WebP"
    Y veo en la galería, por este orden, "coliseo.jpg"
    Y el servidor ha recibido 0 fotos

  Escenario: Una foto de más de 8 MB no se puede subir
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Cuando abro la galería del viaje "Roma 2027"
    Y subo una foto "enorme.jpg" de tipo "image/jpeg" de 8000001 bytes
    Entonces veo el mensaje de error "La foto no puede ocupar más de 8 MB"
    Y el servidor ha recibido 0 fotos

  Escenario: Si el servidor rechaza la foto, se muestra su error y la galería no cambia
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que el servidor rechaza las fotos porque su contenido no es una imagen
    Cuando abro la galería del viaje "Roma 2027"
    Y subo la foto "falsa.jpg" de tipo "image/jpeg"
    Entonces veo el mensaje de error "No se ha podido subir la foto: Solo se pueden subir fotos JPEG, PNG o WebP"
    Y la galería está vacía

  Escenario: En un viaje archivado se ven las fotos pero no se puede subir ninguna
    Dado que tengo el viaje archivado "Roma 2026"
    Y que en la galería del viaje "Roma 2026" está la foto "coliseo.jpg"
    Cuando abro la galería del viaje "Roma 2026"
    Entonces veo en la galería, por este orden, "coliseo.jpg"
    Y no veo el botón "Subir"
    Y veo el texto "ya no se pueden subir"

  Escenario: Una foto se puede ampliar, pasar a la siguiente y cerrar
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la galería del viaje "Roma 2027" está la foto "coliseo.jpg"
    Y que en la galería del viaje "Roma 2027" está la foto "trevi.jpg"
    Cuando abro la galería del viaje "Roma 2027"
    Y amplío la foto "trevi.jpg"
    Entonces veo la foto ampliada "Foto 1 de 2: trevi.jpg"
    Cuando paso a la foto siguiente
    Entonces veo la foto ampliada "Foto 2 de 2: coliseo.jpg"
    Cuando cierro la foto ampliada
    Entonces ya no veo la foto ampliada
