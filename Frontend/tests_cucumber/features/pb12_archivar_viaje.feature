# language: es
Característica: Cerrar y archivar un viaje (PB-12)
  Como creador de un viaje
  Quiero cerrarlo cuando termina
  Para que quede guardado como historial de solo lectura, sin nuevos gastos ni tareas

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"

  Escenario: Cerrar el viaje tras confirmarlo
    Cuando abro el viaje "Roma 2027" desde mis viajes
    Y pulso el botón "Cerrar viaje"
    Entonces veo el diálogo de confirmación "¿Cerrar este viaje?"
    Cuando confirmo en el diálogo "Cerrar viaje"
    Entonces estoy en la pantalla de viajes archivados
    Y veo el viaje archivado "Roma 2027"
    Y el servidor ha archivado 1 viaje

  Escenario: Un viaje archivado es de solo lectura
    Cuando abro el viaje "Roma 2027" desde mis viajes
    Y pulso el botón "Cerrar viaje"
    Y confirmo en el diálogo "Cerrar viaje"
    Y abro el viaje archivado "Roma 2027"
    Entonces veo el texto "Este viaje está archivado"
    Y no veo el botón "Editar viaje"
    Y no veo el botón "Cerrar viaje"

  Escenario: Cancelar el cierre del viaje
    Cuando abro el viaje "Roma 2027" desde mis viajes
    Y pulso el botón "Cerrar viaje"
    Y confirmo en el diálogo "Cancelar"
    Entonces ya no veo el diálogo de confirmación
    Y estoy en el inicio del viaje
    Y el servidor ha archivado 0 viaje
