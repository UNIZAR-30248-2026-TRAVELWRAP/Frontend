# language: es
Característica: Borrar fotos y vídeos de la galería (PB-59)
  Como miembro de un viaje
  Quiero borrar fotos y vídeos de la galería y ver cuánto espacio ocupa
  Para quitar lo que sobra sin llenar el almacenamiento del viaje

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Una foto se borra desde el visor tras confirmarlo
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la galería del viaje "Roma 2027" está la foto "coliseo.jpg"
    Y que en la galería del viaje "Roma 2027" está la foto "trevi.jpg"
    Cuando abro la galería del viaje "Roma 2027"
    Y amplío la foto "trevi.jpg"
    Y pulso borrar en el archivo ampliado
    Entonces veo el texto "¿Borrar esta foto?"
    Cuando confirmo el borrado del archivo
    Entonces veo la foto ampliada "Foto 1 de 1: coliseo.jpg"
    Y el servidor ha borrado 1 archivo
    Y veo el texto "1 foto"

  Escenario: En un viaje archivado no se puede borrar
    Dado que tengo el viaje archivado "Roma 2026"
    Y que en la galería del viaje "Roma 2026" está la foto "coliseo.jpg"
    Cuando abro la galería del viaje "Roma 2026"
    Y amplío la foto "coliseo.jpg"
    Entonces no veo el botón "Borrar foto"
