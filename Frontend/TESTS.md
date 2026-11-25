# Tests del frontend

Guía de cómo se prueba el frontend de TravelWrap, cómo ejecutar cada tipo de test y qué criterio seguimos para decidir qué probar.

## Qué hay

Hay tres capas de pruebas. Estado a 25/11/2026:

| Capa | Herramienta | Carpeta | Cantidad |
|---|---|---|---|
| Unitarias y de componentes | Vitest + Testing Library (jsdom) | `tests_unit/` | 757 tests |
| E2E | Playwright | `tests/` | 178 tests |
| Aceptación | Cucumber (en español) sobre Playwright | `tests_cucumber/` | 102 escenarios |

Ninguna capa usa el backend real ni servicios externos: las peticiones a la API, a Supabase Storage y a servicios de terceros se simulan en cada test.

## Cómo se ejecutan

Unitarias:

```
npm test
```

Unitarias con cobertura (genera `coverage/lcov.info`, que usa SonarCloud):

```
npm run test:coverage
```

E2E con Playwright (arranca solo el servidor de desarrollo en el puerto 5173):

```
npm run test:e2e
```

Solo con Chromium, o un solo archivo:

```
npx playwright test --project=chromium
npx playwright test tests/resumen.spec.ts --project=chromium
```

Aceptación con Cucumber:

```
npm run test:acceptance
```

Un solo escenario, filtrando por nombre:

```
npm run test:acceptance -- --name "cuenta las tareas pendientes propias"
```

Comprobaciones de calidad que también ejecuta la CI:

```
npm run lint
npm run build
```

La primera vez hay que instalar los navegadores de Playwright con `npx playwright install`.

## Cosas que conviene saber

- **Cucumber no admite `--parallel`.** Cada ejecución arranca su propio servidor Vite en el puerto 5174 (`strictPort`), así que varios procesos a la vez chocan. Además, pasar la ruta de un `.feature` no limita la ejecución: la configuración (`cucumber.mjs`) añade todos los archivos. Para ejecutar solo un escenario hay que usar `--name`.
- **Cucumber solo usa Chromium.** Playwright prueba además Firefox y WebKit, según `playwright.config.ts`.
- **En la CI Playwright va con un solo proceso y 2 reintentos** (`CI=1`). Para reproducir esa ejecución en local: `CI=1 npx playwright test --project=chromium`.
- **Las esperas de Playwright son de 10 segundos** (`expect.timeout` en `playwright.config.ts`). Si un test falla solo cuando la máquina está cargada, no se arregla subiendo tiempos sin más: primero hay que comprobar que no depende de una espera mal escrita (por ejemplo, una pulsación de teclado antes de que la pantalla esté lista).
- **En Windows, Vitest puede quedarse parado** si el directorio actual tiene la letra de unidad en minúscula (`c:\...`). Se soluciona entrando con `C:/` en mayúscula o añadiendo `--pool=vmThreads`.

## Cómo se escriben

- **Unitarias:** una por pantalla, componente o utilidad (`Itinerario.test.tsx`, `repartoGastos.test.ts`). Las llamadas a la API se simulan con `fetch` falso o mockeando el servicio; los textos y roles se buscan como los vería una persona (`getByRole`, `getByText`).
- **E2E:** cada archivo de `tests/` cubre una funcionalidad. La API se simula con `page.route`, la sesión se siembra en `localStorage` (`travelwrap.sesion`) y los archivos de Storage se sirven desde rutas simuladas. Nunca se usa la red real.
- **Aceptación:** cada archivo de `tests_cucumber/features/` describe una historia de la pila con su identificador (`pb45_reordenar_actividades.feature`). Los escenarios se escriben en español (Dado, Cuando, Entonces) y reutilizan pasos definidos en `tests_cucumber/step_definitions/`.
- Se siguen las normas de `Reglas Codigo`: sin imports sin usar, sin variables sin leer y sin código comentado.

## Qué probamos y qué no (criterio de PB-70)

Solo lo esencial. Un test debe proteger algo que, si se rompe, nos importa. Se reparte así:

- **Unitarias:** la lógica con reglas (reparto de gastos, orden de actividades, estados del viaje, formato de datos) y el comportamiento de cada pantalla: camino feliz, un error representativo y los permisos.
- **E2E:** recorridos completos de usuario y comportamientos que solo se ven en un navegador (arrastrar, tiempo real, responsive, descargas).
- **Aceptación:** al menos el camino feliz de cada historia de usuario. Es la evidencia de la definición de hecho. Cada funcionalidad tiene como máximo dos escenarios: el camino feliz y un caso de error o permiso.

No se escriben, o se eliminan: pruebas de texto o estilo sin regla de negocio detrás, el mismo error repetido en cada pantalla y el mismo recorrido probado a la vez en E2E y en aceptación sin motivo.

Cuando se quiera quitar un test, se comprueba antes con `npm run test:coverage` que no baja la cobertura de forma relevante.

## Historias de usuario con prueba de aceptación

- **Cucumber:** PB-04 a PB-08, PB-10 a PB-32, PB-36, PB-38, PB-40 a PB-47, PB-51, PB-53 a PB-55, PB-57 a PB-59 y PB-62 a PB-66.
- **Playwright:** PB-56 (playlist), PB-60 (pantalla de carga), PB-61 (presupuesto restante) y PB-69 (próxima actividad).
- **Sin prueba de aceptación:** PB-52 (sin implementar), PB-67 y PB-68 (cambios visuales) y las entradas de infraestructura, diseño o documentación.

## Cobertura

- Objetivo de la asignatura: al menos el 75 % del código con tests unitarios o de integración (nota notable). Los E2E y la aceptación no cuentan para este porcentaje.
- Tras PB-70: 83,8 % de sentencias, 81,0 % de ramas, 80,8 % de funciones y 86,0 % de líneas.
- La cobertura de SonarCloud se calcula a partir de `coverage/lcov.info`, con solo la carpeta `src/`.

## Integración continua

La CI instala dependencias y los navegadores de Playwright, compila (`npm run build`), pasa el lint, ejecuta los E2E, la aceptación y los tests con cobertura, y envía el resultado a SonarCloud. Un test que falle bloquea el pipeline.
