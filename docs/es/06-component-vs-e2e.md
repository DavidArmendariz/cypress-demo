# 6. Pruebas de componente frente a E2E

*[English](../en/06-component-vs-e2e.md) · [Español](../es/06-component-vs-e2e.md)*

- Las pruebas de componente se quedan las permutaciones. E2E se queda el cableado.
- Si una prueba no necesita el servidor, el router ni una sesión, no debería pagarlos.
- Prueba la superficie pública: props entran, eventos salen. Nunca las tripas del componente.

## La división, en concreto

`LoginForm` tiene cinco comportamientos: dos campos vacíos, envío válido, limpieza de errores, errores
de campo devueltos por el servidor y deshabilitado mientras se envía. En
`cypress/component/LoginForm.cy.tsx` son cinco pruebas que terminan en unos dos segundos en total. No
hay API, ni router, ni contexto de autenticación.

En `cypress/e2e/auth/login-ui.cy.ts` el mismo formulario se ejercita por el navegador para responder a
una pregunta distinta: ¿está de verdad conectado a la API, vuelve la cookie, aterriza la redirección en
`/todos`? Eso es lo único que las pruebas de componente no pueden decirte, y vale los segundos que
cuesta.

| Pregunta | Dónde va |
|---|---|
| ¿Se deshabilita este botón mientras hay una promesa pendiente? | Componente |
| ¿Se disparan las tres ramas de validación? | Componente |
| ¿Se pone `aria-pressed` en el filtro activo? | Componente |
| ¿Al pulsar iniciar sesión se crea sesión y se aterriza en /todos? | E2E |
| ¿Redirige el guard de ruta un enlace profundo? | E2E |
| ¿Rechaza la API el id de un todo de otro usuario? | Spec de API, sin navegador |

Total en este repositorio: 15 pruebas de componente en ~3 segundos, 41 E2E en ~2 minutos. Bajar una
permutación un nivel la hace unas dos órdenes de magnitud más barata.

## Props entran, eventos salen

```tsx
// cypress/component/TodoItem.cy.tsx
cy.mount(<TodoItem todo={todo} onToggle={cy.stub().as('onToggle')} onDelete={cy.stub().as('onDelete')} />)

cy.getByData('todo-toggle').click()
cy.get('@onToggle').should('have.been.calledOnceWith', todo)
```

Pon alias al stub y afirma sobre el alias. Sin tocar el estado, sin renderizar internos. Si el
componente es difícil de probar así, normalmente es una señal de diseño y no un problema de testing:
`TodoItem`, `TodoFilters` y `LoginForm` son presentacionales precisamente para poder probarse de esta
forma.

## Componentes controlados

Un componente controlado *no* debe actualizarse solo:

```tsx
// cypress/component/TodoFilters.cy.tsx
cy.mount(<TodoFilters value="all" counts={counts} onChange={cy.stub()} />)
cy.getByData('filter-completed').click()
cy.getByData('filter-all').should('have.attr', 'aria-pressed', 'true')
```

Y cuando quieras probar la integración, escribe un arnés de tres líneas en lugar de exponer internos:

```tsx
function Harness() {
  const [value, setValue] = useState<TodoFilter>('all')
  return <TodoFilters value={value} counts={counts} onChange={setValue} />
}
```

## Nota de Cypress 15 sobre stubs

La forma de tres argumentos `cy.stub(obj, 'name', fn)` se eliminó en Cypress 15. Usa `.callsFake()`:

```tsx
const onSubmit = cy
  .stub()
  .as('onSubmit')
  .callsFake(() => new Promise<void>((resolve) => { resolveSubmit = resolve }))
```

Guardar el resolver permite que la prueba afirme sobre el estado pendiente y después lo libere, sin
adivinar tiempos.

## Configuración

`cypress.config.ts` usa `framework: 'react', bundler: 'vite'`, así que las pruebas de componente se
construyen con la misma configuración de Vite que la aplicación. `cypress/support/component.ts`
registra `cy.mount` e importa `src/styles.css`, lo cual importa: las aserciones de visibilidad y las
comprobaciones de contraste de axe no significan nada contra marcado sin estilos.

`cypress/support/commands.ts` se importa desde ambos archivos de soporte, así que `cy.getByData`
funciona igual en specs de componente y de E2E. Una sola convención de selectores, en todas partes.

## Antipatrón que reemplaza

Cubrir cada rama de validación atravesando toda la pila. Diez pruebas E2E que cada una hace login,
carga una página y solo se diferencian en qué campo se dejó vacío. Lentas, inestables, y fallan por
razones que no tienen nada que ver con la validación.
