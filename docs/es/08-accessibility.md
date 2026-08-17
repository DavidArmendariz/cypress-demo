# 8. Accesibilidad

*[English](../en/08-accessibility.md) · [Español](../es/08-accessibility.md)*

- Las comprobaciones automáticas detectan más o menos un tercio de los defectos reales. Son un suelo, no un techo.
- Comprueba también los estados de error y de carga, no solo la página feliz.
- Añade al menos una prueba de teclado, porque una página puede estar limpia para axe y ser inusable sin ratón.

## Configuración

Instala `cypress-axe`, impórtalo en tu archivo de soporte, e inyecta axe después de que la página llegue
al estado que quieres comprobar:

```ts
cy.visit('/login')
cy.injectAxe()
cy.checkA11y()
```

`cy.injectAxe()` tiene que ir después de `cy.visit()`. Un visit recarga la página y descarta el script
inyectado.

## Comprueba estados, no solo páginas

Cuatro comprobaciones dan buena cobertura, y la segunda es la que los equipos suelen olvidar:

1. La página en su estado por defecto.
2. La página **con errores de validación visibles**. Los estados de error son donde `aria-invalid`,
   `aria-describedby` y `role="alert"` existen o no existen.
3. La página con contenido real, incluyendo cualquier variante de renderizado, como una fila completada
   o archivada.
4. Un recorrido usando solo el teclado.

Espera al estado antes de comprobarlo:

```ts
cy.getByData('project-item').should('have.length', 2)
cy.injectAxe()
cy.checkA11y()
```

Si no, axe escanea un spinner de carga y da el visto bueno.

## El marcado que se gana esos pases

Nada de esto hay que escribirlo pensando específicamente en axe:

- **Todo campo tiene un `<label for>` real.** Etiqueta la casilla de una fila con el nombre de esa fila,
  para que un lector de pantalla anuncie "Migration plan, casilla, no marcada" en lugar de "casilla".
- **Los mensajes de error usan `role="alert"`**, los campos apuntan a ellos con `aria-describedby`, y
  los campos inválidos llevan `aria-invalid`.
- **Los grupos de conmutadores exponen su estado**, por ejemplo botones con `aria-pressed` dentro de un
  `role="group"` etiquetado, para que la opción activa no se comunique solo con color.
- **Los controles por fila están etiquetados por fila**: `aria-label="Delete Migration plan"`. Una lista
  de doce botones llamados todos "Delete" es inútil leída fuera de contexto.
- **Los estados de carga y pendiente usan `role="status"`**, para que se anuncien en lugar de aparecer
  en silencio.

Fíjate en que cada una de estas cosas también hace el elemento más fácil de seleccionar y de verificar.
El marcado accesible y el marcado testeable son en gran medida el mismo marcado, que es el argumento
más fuerte para hacer este trabajo junto con las pruebas y no como un proyecto aparte.

## La prueba de teclado

```ts
cy.getByData('new-project-input').focus()
cy.focused().type('Migration plan{enter}')
cy.wait('@createProject')
```

Para demostrar que un control tiene un nombre accesible real y no uno por casualidad, verifica la
asociación en lugar del texto:

```ts
cy.getByData('project-toggle')
  .invoke('attr', 'id')
  .then((id) => {
    cy.getByData('project-title').should('have.attr', 'for', id)
  })
```

**Una limitación conocida.** `cy.type(' ')` emite eventos de teclado sintéticos, y el comportamiento por
defecto del navegador de "espacio activa la casilla enfocada" no se ejecuta para esos eventos. Usa
`cy.check()` para el cambio de estado, y recurre a `cypress-real-events` (solo Chromium) cuando
necesites de verdad eventos de teclado nativos. Afirmar que la versión sintética demuestra operabilidad
por teclado sería peor que reconocer la carencia.

Ten en cuenta también que `cy.focus()` termina una cadena de comandos, así que el comando siguiente
arranca de nuevo desde `cy.`. Una regla de lint lo detecta: ver
[10-anti-patterns.md](10-anti-patterns.md).

## Ajustes, con cuidado

`cy.checkA11y()` acepta un contexto y un conjunto de reglas:

```ts
cy.checkA11y('[data-cy="projects-page"]', {
  rules: { 'color-contrast': { enabled: false } },
})
```

Acotar a una región está bien. Desactivar una regla debería ser raro, comentado y con seguimiento,
porque una regla desactivada es una decisión permanente tomada con prisa.

## Adoptarlo en un producto existente

Una aplicación grande no va a pasar `cy.checkA11y()` el primer día, y cien fallos en la primera
ejecución suele terminar con la iniciativa. Una secuencia que funciona:

1. Actívalo solo para las páginas **nuevas**, para que el backlog deje de crecer.
2. Añádelo a los dos o tres flujos con más tráfico, arreglando por el camino.
3. Amplía página a página, tratando cada añadido como una tarea pequeña y no como un proyecto.
