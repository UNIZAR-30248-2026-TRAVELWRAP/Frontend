# language: es
Característica: Finalizar y archivar un viaje (PB-12 y MEJ-12)
  Como creador de un viaje
  Quiero finalizarlo cuando termina y archivarlo más tarde
  Para que quede guardado como historial de solo lectura, sin nuevos gastos ni tareas

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

  Escenario: Un viaje finalizado es de solo lectura
    Dado que tengo el viaje finalizado "Roma 2027"
    Cuando abro el inicio del viaje "Roma 2027"
    Entonces veo el texto "Este viaje está finalizado"
    Y no veo el botón "Editar viaje"
    Y no veo el botón "Finalizar viaje"

  Escenario: Archivar un viaje finalizado desde el final del resumen
    Dado que tengo el viaje finalizado "Roma 2027"
    Cuando llego al balance final del resumen del viaje "Roma 2027"
    Y pulso el botón "Archivar viaje"
    Entonces veo el diálogo de confirmación "¿Archivar este viaje?"
    Cuando confirmo en el diálogo "Archivar viaje"
    Entonces estoy en la pantalla de viajes archivados
    Y veo el viaje archivado "Roma 2027"
    Y el servidor ha archivado 1 viaje

  Escenario: Un viaje archivado es de solo lectura
    Dado que tengo el viaje archivado "Roma 2027"
    Cuando abro el inicio del viaje "Roma 2027"
    Entonces veo el texto "Este viaje está archivado"
    Y no veo el botón "Editar viaje"
    Y no veo el botón "Finalizar viaje"

  Escenario: Cancelar el cierre del viaje
    Dado que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850
    Cuando abro el viaje "Roma 2027" desde mis viajes
    Y pulso el botón "Finalizar viaje"
    Y confirmo en el diálogo "Cancelar"
    Entonces ya no veo el diálogo de confirmación
    Y estoy en el inicio del viaje
    Y el servidor ha finalizado 0 viaje
