# 10. Antipatrones

*[English](../en/10-anti-patterns.md) · [Español](../es/10-anti-patterns.md)*

- Casi toda la inestabilidad en Cypress viene de una docena de costumbres recurrentes.
- Cinco de ellas se pueden detectar automáticamente con reglas de lint. El resto necesita revisión.
- Cada entrada enlaza al capítulo que muestra la alternativa.

| Antipatrón | En su lugar | Lo detecta |
|---|---|---|
| Hacer login por la UI en cada `beforeEach` | login por API cacheado con `cy.session` | revisión |
| `cy.wait(2000)` | `cy.wait('@alias')` o una aserción que reintenta | `cypress/no-unnecessary-waiting` |
| `cy.get('.btn-primary')`, `cy.contains('Save')` | un atributo dedicado a pruebas | revisión |
| `const el = cy.get('#thing')` | alias y closures con `.then()` | `cypress/no-assigning-return-values` |
| `cy.get('x').focus().type('y')` | partir la cadena | `cypress/unsafe-to-chain-command` |
| `it('...', async () => { await cy.get(...) })` | nada de `async` en el cuerpo de la prueba | `cypress/no-async-tests` |
| `Cypress.env('password')` | `cy.env(['password'])` | regla de lint + `allowCypressEnv: false` |
| Limpieza en `after` / `afterEach` | resetear en `before` | revisión |
| Pruebas que dependen de la anterior | cada prueba siembra su propio estado | revisión |
| Una aserción por prueba | varias aserciones por recorrido | revisión |
| Arrancar servidores con `cy.exec` | el gestor de procesos, o CI | revisión |
| `Cypress.on('uncaught:exception', () => false)` global | dejar que los errores de la app hagan fallar la prueba | revisión |
| Simular todas las peticiones | peticiones reales para el camino feliz | revisión |
| Testing condicional sobre un DOM inestable | hacer la aplicación determinista | revisión |
| Clases page object | comandos personalizados y app actions | revisión |

## Los que necesitan más que una fila de tabla

### `cy.wait(número)`

La fuente más común de lentitud y de inestabilidad, a la vez. Dos segundos son demasiado en una máquina
rápida e insuficientes en un runner de CI cargado, y el número solo crece. Toda espera debería ser una
petición con alias o una aserción que reintenta. Ver [05-network-control.md](05-network-control.md).

### Asignar el valor de retorno de un comando

```ts
const button = cy.get('[data-cy="submit"]')   // un chainable, no un elemento
button.click()                                 // a veces funciona, y enseña el modelo equivocado
```

Los comandos de Cypress se encolan, no se ejecutan. Usa un alias (`.as('submit')`, luego
`cy.get('@submit')`) o un closure con `.then()`. Este merece explicarse y no solo corregirse, porque el
malentendido de fondo produce un flujo constante de otros errores.

### Testing condicional

```ts
cy.get('body').then(($body) => {
  if ($body.find('[data-cy="cookie-banner"]').length) {
    cy.getByData('dismiss').click()
  }
})
```

Esto es una carrera, no una prueba. Puede que el banner simplemente no se haya renderizado todavía, y la
rama se salta en silencio. Solo es legítimo cuando el DOM ya se ha estabilizado de verdad y la condición
es real, como una feature flag que llega del servidor. Si lo necesitas porque no sabes en qué estado
está la aplicación, la solución es controlar el estado en lugar de ramificar sobre él.

### Tragarse las excepciones globalmente

`Cypress.on('uncaught:exception', () => false)` en un archivo de soporte pone una suite roja en verde en
una línea, y de paso hace que deje de reportar defectos reales. Gestiona el error concreto:

```ts
Cypress.on('uncaught:exception', (err) => !err.message.includes('ResizeObserver'))
```

### Page objects

Los page objects centralizan los selectores, lo cual ayuda de verdad, y después tienden a acumular
métodos como `loginPage.loginAsValidUser()` que reintroducen el login por UI en todas partes, más una
capa de indirección que hace difícil leer una prueba que falla.

Los comandos personalizados y las app actions dan la misma reutilización sin modelar el navegador como
un grafo de objetos. Ver [02-selectors.md](02-selectors.md).

### Probar sitios de terceros

No conduzcas por el navegador la página de login, el formulario de pago ni el cliente de correo de otra
empresa. No controlas su marcado, ni su disponibilidad, ni su detección de bots. Llama a su API con
`cy.request`, simula el callback, o usa su modo de pruebas.

Lo mismo aplica a los proveedores de identidad. Para flujos de SSO, obtén un token con la API del
proveedor o con un endpoint de modo de pruebas y establece la sesión directamente.

## Cumplimiento

```js
// eslint.config.js
{
  files: ['cypress/**/*.{ts,tsx}'],
  ...cypress.configs.recommended,
  rules: {
    'cypress/no-unnecessary-waiting': 'error',
    'cypress/no-assigning-return-values': 'error',
    'cypress/unsafe-to-chain-command': 'error',
    'cypress/no-async-tests': 'error',
  },
}
```

Una regla de lint detecta la costumbre en la revisión, siempre, sin que nadie tenga que acordarse. El
resto de esta lista sigue necesitando a una persona, y para eso están estos capítulos.

## Si heredas una suite existente

No la reescribas. Arregla en este orden, porque cada paso hace más barato el siguiente:

1. **Sustituye el login por UI por un login por API cacheado.** Normalmente es la mayor ganancia de
   velocidad de un solo cambio, y toca un archivo.
2. **Elimina todos los `cy.wait(número)`**, sustituyendo cada uno por una espera con alias. Activa la
   regla de lint para que no puedan volver.
3. **Haz la suite independiente del orden**, dando a cada prueba su propio estado sembrado.
4. **Introduce la convención de atributos de pruebas** solo en las specs nuevas y en las que toques.
5. **Baja las permutaciones** a pruebas de componente y de API a medida que tocas cada área.

Los pasos 1 y 2 suelen explicar la mayor parte del tiempo de ejecución y la mayor parte de la
inestabilidad.
