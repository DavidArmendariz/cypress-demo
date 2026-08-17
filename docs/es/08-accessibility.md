# 8. Accesibilidad

*[English](../en/08-accessibility.md) · [Español](../es/08-accessibility.md)*

- `cy.checkA11y()` es un suelo, no un techo. Detecta más o menos un tercio de los defectos reales.
- Comprueba también los estados de error y de carga, no solo la página feliz.
- Añade al menos una prueba de teclado, porque una página puede estar limpia para axe y ser inusable sin ratón.

## Configuración

`cypress-axe` se importa en `cypress/support/e2e.ts`. Cada spec inyecta axe después de dejar la página
en el estado que quieres comprobar:

```ts
cy.visit('/login')
cy.injectAxe()
cy.checkA11y()
```

`cy.injectAxe()` tiene que ir después de `cy.visit()`, porque un visit recarga la página y descarta el
script inyectado.

## Comprueba los estados, no solo la página

`cypress/e2e/a11y/accessibility.cy.ts` comprueba cuatro cosas, y la segunda es la que los equipos
suelen olvidar:

1. La página de login.
2. La página de login **con errores de validación visibles**. Los estados de error son donde
   `aria-invalid`, `aria-describedby` y `role="alert"` existen o no existen.
3. La página de todos con contenido real, con un elemento abierto y uno completado.
4. Un recorrido usando solo el teclado.

Espera al estado antes de comprobarlo:

```ts
cy.getByData('todo-item').should('have.length', 2)
cy.injectAxe()
cy.checkA11y()
```

Si no, axe escanea un spinner de carga y te da el visto bueno.

## Qué hace la aplicación para merecer esos pases

Nada en `src/` se escribió pensando específicamente en axe, y eso es justo lo importante:

- Todo campo tiene un `<label for>` real. `TodoItem` etiqueta su checkbox con el título del todo, así
  que un lector de pantalla anuncia "Buy milk, casilla, no marcada", no "casilla".
- Los mensajes de error usan `role="alert"`, y los campos apuntan a ellos con `aria-describedby`. Los
  campos inválidos llevan `aria-invalid`.
- `TodoFilters` es un `role="group"` etiquetado de botones con `aria-pressed`, así que el filtro activo
  se expone a las tecnologías de asistencia en lugar de comunicarse solo con color.
- Los botones de borrar están etiquetados por fila (`aria-label="Delete Buy milk"`). Una lista de doce
  botones llamados todos "Delete" es inútil cuando se lee fuera de contexto.
- Los estados de carga y pendiente usan `role="status"`, así que se anuncian en lugar de aparecer en
  silencio.

Fíjate en que cada una de estas cosas es también lo que hace al elemento fácil de seleccionar y de
verificar. El marcado accesible y el marcado testeable son en gran medida el mismo marcado.

## La prueba de teclado

```ts
cy.getByData('new-todo-input').focus()
cy.focused().type('Added without a mouse{enter}')
```

Y después, para demostrar que el checkbox tiene un nombre accesible real y no uno por casualidad:

```ts
cy.getByData('todo-toggle')
  .invoke('attr', 'id')
  .then((id) => {
    cy.getByData('todo-title').should('have.attr', 'for', id)
  })
```

**Una limitación conocida.** `cy.type(' ')` emite eventos de teclado sintéticos, y el comportamiento
por defecto del navegador de "espacio activa el checkbox enfocado" no se ejecuta para esos eventos. Usa
`cy.check()` para el cambio de estado, y recurre a `cypress-real-events` (solo Chromium) si de verdad
necesitas eventos de teclado nativos. Fingir que la versión sintética demuestra operabilidad por
teclado sería peor que admitir la carencia.

`cy.focus()` además termina una cadena de comandos, así que cada comando siguiente arranca de nuevo
desde `cy.`. La regla de lint `unsafe-to-chain-command` lo detecta.

## Ajustes, con cuidado

`cy.checkA11y()` acepta un contexto y un conjunto de reglas:

```ts
cy.checkA11y('[data-cy="todos-page"]', {
  rules: { 'color-contrast': { enabled: false } },
})
```

Acotar a una región está bien. Desactivar una regla debería ser raro, comentado y con seguimiento,
porque una regla desactivada es una decisión permanente tomada con prisa. En este repositorio no hay
ninguna regla desactivada.
