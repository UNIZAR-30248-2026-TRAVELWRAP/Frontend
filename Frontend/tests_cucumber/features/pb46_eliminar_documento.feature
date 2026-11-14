# language: es
Característica: Eliminar un documento de la cartera del viaje (PB-46)
  Como miembro de un viaje
  Quiero eliminar un documento de la cartera del viaje
  Para que el grupo no se quede con documentos equivocados o que ya no valen

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Eliminar un documento con confirmación lo quita de la cartera
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la cartera del viaje "Roma 2027" está el documento "Reserva del hotel.pdf"
    Cuando abro la cartera de documentos del viaje "Roma 2027"
    Y pulso eliminar el documento "Reserva del hotel.pdf"
    Entonces veo el diálogo de confirmación "¿Eliminar este documento?"
    Cuando confirmo en el diálogo "Eliminar documento"
    Entonces veo el texto "Documento eliminado"
    Y ya no veo el diálogo de confirmación
    Y la cartera de documentos está vacía
    Y el servidor ha recibido 1 petición de eliminar el documento "Reserva del hotel.pdf"

  Escenario: Cancelar la confirmación mantiene el documento
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la cartera del viaje "Roma 2027" está el documento "Reserva del hotel.pdf"
    Cuando abro la cartera de documentos del viaje "Roma 2027"
    Y pulso eliminar el documento "Reserva del hotel.pdf"
    Y cancelo la eliminación del documento
    Entonces ya no veo el diálogo de confirmación
    Y veo en la cartera de documentos, por este orden, "Reserva del hotel.pdf"
    Y el servidor ha recibido 0 peticiones de eliminar documentos

  Escenario: Si el servidor falla, se muestra el error y el documento sigue en la cartera
    Dado que soy miembro, pero no creador, del viaje activo "Roma 2027"
    Y que en la cartera del viaje "Roma 2027" está el documento "Reserva del hotel.pdf"
    Y que el servidor falla al eliminar documentos
    Cuando abro la cartera de documentos del viaje "Roma 2027"
    Y pulso eliminar el documento "Reserva del hotel.pdf"
    Y confirmo en el diálogo "Eliminar documento"
    Entonces veo el mensaje de error "No se ha podido eliminar el documento: Fallo de Supabase"
    Y veo el diálogo de confirmación "¿Eliminar este documento?"
    Cuando cancelo la eliminación del documento
    Entonces veo en la cartera de documentos, por este orden, "Reserva del hotel.pdf"

  Escenario: En un viaje archivado no se puede eliminar ningún documento
    Dado que tengo el viaje archivado "Roma 2026"
    Y que en la cartera del viaje "Roma 2026" está el documento "Reserva del hotel.pdf"
    Cuando abro la cartera de documentos del viaje "Roma 2026"
    Entonces veo en la cartera de documentos, por este orden, "Reserva del hotel.pdf"
    Y no veo el botón "Eliminar Reserva del hotel.pdf"
