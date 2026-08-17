# 6. Elegir el nivel adecuado de prueba

*[English](../en/06-component-vs-e2e.md) · [Español](../es/06-component-vs-e2e.md)*

- Las pruebas de componente se quedan las permutaciones. Las end to end se quedan el cableado.
- Las pruebas de API se quedan el contrato, y corren en segundos sin navegador.
- Si una prueba no necesita el servidor, el router ni una sesión, no debería pagarlos.

## Tres niveles, tres preguntas

| Pregunta | Nivel |
|---|---|
| ¿Se deshabilita este botón mientras hay una promesa pendiente? | Componente |
| ¿Se disparan las tres ramas de validación? | Componente |
| ¿Se pone `aria-pressed` en el filtro activo? | Componente |
| ¿Al iniciar sesión se crea sesión y se aterriza en la página correcta? | End to end |
| ¿Redirige el guard de ruta un enlace profundo? | End to end |
| ¿Rechaza la API el id de un registro de otra persona? | API |
| ¿Son los códigos de error y de estado los que el cliente espera? | API |

El diagnóstico útil cuando algo se rompe: si falla una prueba de API, el error está en el backend. Si
falla una prueba de UI mientras las de API pasan, el error está en el cliente. Esa división ahorra
tiempo real de depuración.

## La economía

Un formulario con cinco comportamientos cuesta unos dos segundos en total como pruebas de componente, y
alrededor de un minuto como cinco pruebas end to end, contando el login y las cargas de página. Bajar
una permutación un nivel suele ser unas dos órdenes de magnitud más barato.

Así que: cubre las cinco ramas del formulario como pruebas de componente y escribe **una** prueba end
to end que demuestre que está de verdad conectado a la API y que la redirección aterriza. Esa única
prueba es lo que las de componente no pueden decirte.

## Pruebas de componente: props entran, eventos salen

```tsx
cy.mount(
  <ProjectRow project={project} onArchive={cy.stub().as('onArchive')} onDelete={cy.stub()} />,
)

cy.getByData('project-archive').click()
cy.get('@onArchive').should('have.been.calledOnceWith', project)
```

Pon alias al stub y afirma sobre el alias. Sin tocar el estado, sin renderizar internos. Si un
componente es difícil de probar así, normalmente es una señal de diseño más que un problema de testing:
los componentes que reciben props y emiten eventos son a la vez más fáciles de probar y de reutilizar.

Un componente controlado **no** debe actualizarse solo:

```tsx
cy.mount(<Filters value="all" onChange={cy.stub()} />)
cy.getByData('filter-archived').click()

// El padre nunca actualizó `value`, así que la UI no debe moverse.
cy.getByData('filter-all').should('have.attr', 'aria-pressed', 'true')
```

Cuando sí quieras probar la integración, escribe un pequeño arnés en lugar de exponer internos:

```tsx
function Harness() {
  const [value, setValue] = useState('all')
  return <Filters value={value} onChange={setValue} />
}
```

## Pruebas de API: el contrato, sin navegador

Las specs con `cy.request` corren en un par de segundos y cubren las permutaciones que son tediosas a
través de un formulario:

```ts
it('acota los registros a su propietario', () => {
  cy.seed({
    users: [{ email: 'alice@example.com' }, { email: 'mallory@example.com' }],
    projects: [{ owner: 'alice@example.com', name: 'Private' }],
  }).then(({ projects }) => {
    cy.request('POST', '/api/auth/login', { email: 'mallory@example.com', password })

    cy.request('GET', '/api/projects').its('body.projects').should('have.length', 0)

    // Un 404, no un 403: la respuesta no debe confirmar que el id existe.
    cy.request({
      method: 'PATCH',
      url: `/api/projects/${projects[0].id}`,
      failOnStatusCode: false,
      body: { name: 'Owned now' },
    })
      .its('status')
      .should('eq', 404)
  })
})
```

Las barreras de autorización pertenecen especialmente a este nivel. Un botón oculto no demuestra nada
sobre lo que el servidor va a aceptar.

## Notas de configuración

Configura las pruebas de componente contra el mismo bundler que usa tu aplicación, para que los
componentes se construyan igual en las pruebas que en producción:

```ts
component: {
  devServer: { framework: 'react', bundler: 'vite' },
}
```

Importa tu hoja de estilos real en el archivo de soporte de componentes. Las aserciones de visibilidad
y las comprobaciones de contraste de color no significan nada contra marcado sin estilos.

Importa el mismo archivo de comandos personalizados en los dos archivos de soporte, para que
`cy.getByData` se comporte igual en todos los niveles. Una sola convención de selectores, en todas
partes.

## Una nota sobre stubs en Cypress 15

La forma de tres argumentos `cy.stub(obj, 'name', fn)` se eliminó. Usa `.callsFake()`:

```tsx
let resolveSubmit: () => void = () => {}

const onSubmit = cy
  .stub()
  .as('onSubmit')
  .callsFake(() => new Promise<void>((resolve) => { resolveSubmit = resolve }))
```

Guardar el resolver permite que una prueba afirme sobre el estado pendiente y después lo libere, sin
adivinar tiempos.

## El antipatrón que reemplaza

Cubrir cada rama de validación atravesando toda la pila: diez pruebas end to end que cada una hace
login, carga una página y solo se diferencian en qué campo se dejó vacío. Lentas, inestables, y fallan
por razones que no tienen nada que ver con la validación.
