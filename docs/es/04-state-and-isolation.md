# 4. Estado y aislamiento de pruebas

*[English](../en/04-state-and-isolation.md) · [Español](../es/04-state-and-isolation.md)*

- Toda prueba debe pasar ejecutándose sola. Cualquier prueba, en cualquier orden, en cualquier momento.
- Prepara el estado por API. Nunca construyas datos de prueba haciendo clic por la UI.
- Resetea antes, no después.

## El contrato

```bash
npx cypress run --spec cypress/e2e/projects/crud.cy.ts
```

Si eso falla pero la ejecución completa pasa, hay una prueba apoyándose en el estado que dejó otra.
Ejecuta la suite en orden inverso de specs de vez en cuando para detectar la misma clase de problema.

Vale la pena imponerlo desde el principio. La dependencia del orden es barata de prevenir y cara de
deshacer cuando una suite ya ha crecido a su alrededor.

## Siembra por API

Dale a tu suite dos comandos y úsalos en todas partes:

```ts
cy.resetDb()                                          // limpia y recrea la cuenta base
cy.seed({ projects: [{ name: 'Migration plan' }] })   // datos exactos para esta prueba
```

Ambos son envoltorios finos sobre los endpoints solo de pruebas descritos en
[01-project-setup.md](01-project-setup.md):

```ts
Cypress.Commands.add('seed', (payload) =>
  cy.request('POST', '/api/test/seed', payload).its('body'),
)
```

Haz que el endpoint de siembra **devuelva lo que creó**, para que las specs afirmen contra ids reales
generados por el servidor en lugar de adivinarlos:

```ts
cy.seed({ projects: [{ name: 'Migration plan' }] }).then((seeded) => {
  cy.wrap(seeded.projects[0]).as('project')
})
```

Construir esos mismos datos escribiendo en el formulario de creación haría que una prueba de filtrado
fallara cada vez que se rompiera el formulario de *creación*. Dos funcionalidades sin relación, un
fallo, y además engañoso.

Los conjuntos de datos más grandes van en un archivo de fixtures, para que la spec se lea como
comportamiento y no como un montón de literales:

```ts
cy.fixture('projects').then((projects) => {
  cy.seed({ projects })
  cy.wrap(projects).as('projects')
})
```

## `before`, no `after`

```ts
before(() => {
  cy.task('db:reset')
})
```

La limpieza en `after` o `afterEach` no se ejecuta cuando una prueba revienta, cuando paras el runner a
media prueba o cuando muere el navegador. Peor aún, cuando sí se ejecuta destruye justo el estado que
querrías inspeccionar para depurar el fallo que tienes delante.

Resetea al principio de la ejecución y deja en paz el estado final.

## `cy.task` frente a `cy.request`

Los dos pueden resetear tu backend, y son buenos para cosas distintas:

- **`cy.request`** corre en el contexto del navegador, aparece en el command log y no necesita
  configuración de plugins. Recurre a él primero.
- **`cy.task`** corre en Node. Es la vía de escape para lo que el navegador no puede hacer: conectarse
  directamente a una base de datos, leer un archivo, invocar una CLI, generar un token firmado.

```ts
// cypress.config.ts
setupNodeEvents(on) {
  on('task', {
    async 'db:reset'() {
      await resetDatabase()
      return null
    },
  })
}
```

Una task tiene que devolver algo. Devolver `undefined` es la forma que tiene Cypress de reportar que
"ninguna task atendió esto".

## Aislamiento de pruebas

`testIsolation` está activo por defecto. Antes de cada prueba, Cypress limpia cookies, `localStorage`,
`sessionStorage` y la página. Eso es lo que hace que la independencia sea el comportamiento por
defecto y no una disciplina que todo el mundo tiene que recordar.

`cy.session` es el contrapeso: restaura solo el estado de autenticación, y barato, así que el
aislamiento cuesta una consulta a caché en lugar de un login completo. Las dos funcionalidades están
diseñadas para usarse juntas.

Desactivar el aislamiento en un bloque `describe` es correcto de vez en cuando, típicamente para un
asistente lineal largo donde cada paso se construye de verdad sobre el anterior:

```ts
describe('Asistente de onboarding', { testIsolation: false }, () => { /* ... */ })
```

El precio es que esas pruebas ya solo pueden ejecutarse en bloque y en orden, y que un fallo en el
paso 2 arrastra a los pasos 3 al 9. Úsalo de forma deliberada, no para tapar un problema de estado.

## Varias aserciones por prueba

```ts
cy.location('pathname').should('eq', '/projects')
cy.getByData('projects-page').should('be.visible')
cy.getByData('nav-user').should('have.text', 'Ada Lovelace')
cy.getByData('logout').should('be.visible')
```

Una prueba, cuatro aserciones. Partirlas en cuatro pruebas repetiría el login y la carga de página
cuatro veces sin cubrir nada más.

Las pruebas end to end no son pruebas unitarias. El coste del setup domina, así que hay que
amortizarlo. La regla de "una aserción por prueba" viene de un mundo donde el setup era gratis.

## Los antipatrones que reemplaza

- Un `beforeEach` que crea datos haciendo clic por la UI.
- Pruebas escritas para ejecutarse en un orden fijo, donde la prueba 3 depende del registro que creó la 1.
- `after(() => cy.request('DELETE', '/api/everything'))`.
- Una cuenta de pruebas compartida y de larga vida cuyos datos van derivando durante meses hasta que
  nadie se atreve a resetearla.
