# language: es
Característica: Cerrar y archivar un viaje (PB-12)
  Como creador de un viaje
  Quiero cerrarlo cuando termina
  Para que quede guardado como historial de solo lectura, sin nuevos gastos ni tareas

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Finalizar el viaje tras confirmarlo
    Cuando abro el viaje "Roma 2027" desde mis viajes
    Y pulso el botón "Finalizar viaje"
    Entonces veo el diálogo de confirmación "¿Finalizar este viaje?"
    Cuando confirmo en el diálogo "Finalizar viaje"
    Entonces estoy en el resumen del viaje finalizado
    Y el servidor ha archivado 1 viaje

  Escenario: Un viaje archivado es de solo lectura
    Cuando abro el viaje "Roma 2027" desde mis viajes
    Y pulso el botón "Finalizar viaje"
    Y confirmo en el diálogo "Finalizar viaje"
    Y abro el inicio del viaje archivado
    Entonces veo el texto "Este viaje está archivado"
    Y no veo el botón "Editar viaje"
    Y no veo el botón "Finalizar viaje"

  Escenario: Cancelar el cierre del viaje
    Cuando abro el viaje "Roma 2027" desde mis viajes
    Y pulso el botón "Finalizar viaje"
    Y confirmo en el diálogo "Cancelar"
    Entonces ya no veo el diálogo de confirmación
    Y estoy en el inicio del viaje
    Y el servidor ha archivado 0 viaje
