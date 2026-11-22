# language: es
Característica: Notificaciones de eventos del viaje (PB-54)
  Como viajero
  Quiero recibir un aviso cuando hay una votación, un gasto, una tarea o un mensaje nuevo en mi viaje
  Para enterarme sin tener que revisar cada pantalla

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que tengo el viaje activo "Roma 2027" con destino "Roma" y presupuesto 850
    Y que la app recibe avisos en tiempo real

  Escenario: Un gasto nuevo avisa con el viaje y el motivo, y al tocarlo abre los gastos
    Cuando abro el inicio del viaje "Roma 2027"
    Y llega el aviso "Berta ha registrado un gasto: Cena" de tipo "gasto" en el viaje "Roma 2027"
    Entonces veo el aviso del viaje "Roma 2027" con el texto "Berta ha registrado un gasto: Cena"
    Cuando toco el aviso
    Entonces estoy en la pantalla "gastos" del viaje "Roma 2027"

  Escenario: Una tarea nueva lleva a la lista de tareas
    Cuando abro el inicio del viaje "Roma 2027"
    Y llega el aviso "Berta ha añadido una tarea: Comprar billetes" de tipo "tarea" en el viaje "Roma 2027"
    Y toco el aviso
    Entonces estoy en la pantalla "documentos?pestana=tareas" del viaje "Roma 2027"

  Escenario: Cerrar el aviso
    Cuando abro el inicio del viaje "Roma 2027"
    Y llega el aviso "Berta ha creado una votación: ¿Dónde cenamos?" de tipo "votacion" en el viaje "Roma 2027"
    Y pulso el botón "Cerrar aviso"
    Entonces no veo ningún aviso
