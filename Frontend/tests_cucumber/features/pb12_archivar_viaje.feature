# language: es
Característica: Finalizar y archivar un viaje (PB-12 y MEJ-12)
  Como viajero
  Quiero que el creador finalice el viaje al terminar y poder archivarlo yo más tarde
  Para que quede guardado como historial de solo lectura y para mí solo, sin que cambie lo que ven los demás

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Finalizar el viaje tras confirmarlo lo deja en Viajes anteriores
    Dado que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850
    Cuando abro el viaje "Roma 2027" desde mis viajes
    Y pulso el botón "Finalizar viaje"
    Entonces veo el diálogo de confirmación "¿Finalizar este viaje?"
    Cuando confirmo en el diálogo "Finalizar viaje"
    Entonces estoy en mis viajes
    Y veo el viaje anterior "Roma 2027"
    Y el servidor ha finalizado 1 viaje
    Y el servidor ha archivado 0 viaje

  Escenario: Un miembro que no es el creador también archiva el viaje para sí mismo
    Dado que soy miembro, pero no creador, del viaje finalizado "Roma 2027"
    Cuando llego a la última diapositiva del resumen del viaje "Roma 2027"
    Y pulso el botón "Archivar viaje"
    Y confirmo en el diálogo "Archivar viaje"
    Entonces estoy en la pantalla de viajes archivados
    Y veo el viaje archivado "Roma 2027"
    Y el servidor ha archivado 1 viaje
