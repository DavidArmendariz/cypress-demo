# 6. Choosing the right level of test

*[English](../en/06-component-vs-e2e.md) · [Español](../es/06-component-vs-e2e.md)*

- Component tests own the permutations. End-to-end tests own the wiring.
- API tests own the contract, and run in seconds with no browser at all.
- If a test does not need the server, the router or a session, it should not pay for them.

## Three levels, three questions

| Question | Level |
|---|---|
| Does this button disable while a promise is pending? | Component |
| Do all three validation branches fire? | Component |
| Is `aria-pressed` set on the active filter? | Component |
| Does signing in create a session and land on the right page? | End-to-end |
| Does the route guard redirect a deep link? | End-to-end |
| Does the API reject another user's record id? | API |
| Are the error codes and status codes what the client expects? | API |

The useful diagnostic when something breaks: if an API test fails, the bug is in the backend. If a
UI test fails while API tests pass, the bug is in the client. That split saves real debugging time.

## The economics

A form with five behaviours costs roughly two seconds total as component tests, and roughly a minute
as five end-to-end tests, once you count login and page loads. Pushing a permutation down a level is
usually about two orders of magnitude cheaper.

So: cover the form's five branches as component tests, then write **one** end-to-end test that proves
it is actually wired to the API and that the redirect lands. That one test is the thing component
tests cannot tell you.

## Component tests: props in, events out

```tsx
cy.mount(
  <ProjectRow project={project} onArchive={cy.stub().as('onArchive')} onDelete={cy.stub()} />,
)

cy.getByData('project-archive').click()
cy.get('@onArchive').should('have.been.calledOnceWith', project)
```

Alias the stub, assert on the alias. No reaching into state, no rendering internals. If a component
is hard to test this way, that is usually a design signal rather than a testing problem: components
that take props and emit events are both easier to test and easier to reuse.

A controlled component must **not** update itself:

```tsx
cy.mount(<Filters value="all" onChange={cy.stub()} />)
cy.getByData('filter-archived').click()

// The parent never updated `value`, so the UI must not move.
cy.getByData('filter-all').should('have.attr', 'aria-pressed', 'true')
```

When you do want to test the integration, write a small harness rather than exposing internals:

```tsx
function Harness() {
  const [value, setValue] = useState('all')
  return <Filters value={value} onChange={setValue} />
}
```

## API tests: the contract, no browser

`cy.request` specs run in a couple of seconds and cover the permutations that are tedious through a
form:

```ts
it('scopes records to their owner', () => {
  cy.seed({
    users: [{ email: 'alice@example.com' }, { email: 'mallory@example.com' }],
    projects: [{ owner: 'alice@example.com', name: 'Private' }],
  }).then(({ projects }) => {
    cy.request('POST', '/api/auth/login', { email: 'mallory@example.com', password })

    cy.request('GET', '/api/projects').its('body.projects').should('have.length', 0)

    // A 404, not a 403: the response must not confirm the id exists.
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

Authorization boundaries especially belong here. A hidden button proves nothing about what the server
will accept.

## Setup notes

Configure component testing against the same bundler your application uses, so components build the
same way in tests as in production:

```ts
component: {
  devServer: { framework: 'react', bundler: 'vite' },
}
```

Import your real stylesheet in the component support file. Visibility assertions and colour-contrast
checks are meaningless against unstyled markup.

Import the same custom commands file in both support files, so `cy.getByData` behaves identically at
every level. One selector convention, everywhere.

## A note on stubs in Cypress 15

The three-argument form `cy.stub(obj, 'name', fn)` was removed. Use `.callsFake()`:

```tsx
let resolveSubmit: () => void = () => {}

const onSubmit = cy
  .stub()
  .as('onSubmit')
  .callsFake(() => new Promise<void>((resolve) => { resolveSubmit = resolve }))
```

Holding the resolver lets a test assert the pending state and then release it, with no timing
guesswork.

## The anti-pattern this replaces

Covering every validation branch through the full stack: ten end-to-end tests that each log in, load
a page, and differ only in which field was left blank. Slow, flaky, and they fail for reasons that
have nothing to do with validation.
