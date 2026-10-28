# language: es
Característica: Registrar un gasto compartido (PB-23)
  Como miembro de un viaje
  Quiero registrar un gasto con su concepto, importe, quién pagó y entre quiénes se divide
  Para que el grupo lleve las cuentas del viaje

  Antecedentes:
    Dado que existe un usuario registrado con email "adriana@travelwrap.app" y contraseña "secreta123"
    Y que he iniciado sesión con el email "adriana@travelwrap.app" y la contraseña "secreta123"
    Y que soy miembro, pero no creador, del viaje activo "Roma 2027"

  Escenario: Registrar un gasto que pago yo y se divide entre todos
    Cuando abro la pantalla para añadir un gasto al viaje "Roma 2027"
    Y relleno el gasto con importe "60,50" y concepto "Cena en el Trastevere"
    Entonces la parte de "Berta" es "30,25 €"
    Y la parte de "Adriana" es "30,25 €"
    Cuando pulso el botón "Registrar gasto"
    Entonces estoy en el inicio del viaje
    Y el servidor ha guardado el gasto "Cena en el Trastevere" de 60.5 pagado por "Adriana" entre "Berta, Adriana"

  Escenario: Registrar un gasto que ha pagado otra persona y solo me corresponde a mí
    Cuando abro la pantalla para añadir un gasto al viaje "Roma 2027"
    Y relleno el gasto con importe "12" y concepto "Entradas del Coliseo"
    Y elijo que ha pagado "Berta"
    Y quito del reparto a "Berta"
    Y pulso el botón "Registrar gasto"
    Entonces estoy en el inicio del viaje
    Y el servidor ha guardado el gasto "Entradas del Coliseo" de 12 pagado por "Berta" entre "Adriana"

  Escenario: No se puede registrar un gasto con un importe no válido
    Cuando abro la pantalla para añadir un gasto al viaje "Roma 2027"
    Y relleno el gasto con importe "0" y concepto "Cena"
    Y pulso el botón "Registrar gasto"
    Entonces veo el mensaje de error "Escribe un importe mayor que 0 con dos decimales como máximo"
    Y sigo en la pantalla de añadir gasto
    Y el servidor no ha guardado ningún gasto

  Escenario: No se puede registrar un gasto sin nadie en el reparto
    Cuando abro la pantalla para añadir un gasto al viaje "Roma 2027"
    Y relleno el gasto con importe "20" y concepto "Cena"
    Y quito del reparto a "Berta"
    Y quito del reparto a "Adriana"
    Y pulso el botón "Registrar gasto"
    Entonces veo el mensaje de error "Elige al menos un miembro entre los que dividir el gasto"
    Y el servidor no ha guardado ningún gasto

  Escenario: Si el servidor rechaza el gasto se muestra el motivo
    Dado que el servidor rechaza los gastos porque el viaje está cerrado
    Cuando abro la pantalla para añadir un gasto al viaje "Roma 2027"
    Y relleno el gasto con importe "20" y concepto "Museo"
    Y pulso el botón "Registrar gasto"
    Entonces veo el mensaje de error "El viaje está cerrado y ya no se puede modificar"
    Y sigo en la pantalla de añadir gasto
