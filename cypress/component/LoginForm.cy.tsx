import { LoginForm } from '../../src/components/LoginForm'

/**
 * Component tests own the permutations: validation branches, disabled states,
 * error rendering. There is no server, no router and no session here, so each
 * of these runs in milliseconds.
 *
 * The E2E suite covers the same form exactly once, to prove it is wired up.
 */
describe('<LoginForm />', () => {
  it('reports both missing fields and does not call onSubmit', () => {
    const onSubmit = cy.stub().as('onSubmit')

    cy.mount(<LoginForm onSubmit={onSubmit} />)
    cy.getByData('login-submit').click()

    cy.getByData('login-email-error').should('have.text', 'Email is required.')
    cy.getByData('login-password-error').should('have.text', 'Password is required.')
    cy.get('@onSubmit').should('not.have.been.called')
  })

  it('hands the typed values to onSubmit', () => {
    const onSubmit = cy.stub().as('onSubmit')

    cy.mount(<LoginForm onSubmit={onSubmit} />)
    cy.getByData('login-email').type('ada@example.com')
    cy.getByData('login-password').type('a-password')
    cy.getByData('login-submit').click()

    cy.get('@onSubmit').should('have.been.calledOnceWith', {
      email: 'ada@example.com',
      password: 'a-password',
    })
  })

  it('clears a client error once the field is filled in', () => {
    cy.mount(<LoginForm onSubmit={cy.stub()} />)

    cy.getByData('login-submit').click()
    cy.getByData('login-email-error').should('be.visible')

    cy.getByData('login-email').type('ada@example.com')
    cy.getByData('login-password').type('a-password')
    cy.getByData('login-submit').click()

    cy.getByData('login-email-error').should('not.exist')
    cy.getByData('login-password-error').should('not.exist')
  })

  it('shows a form-level error and marks the offending field', () => {
    cy.mount(
      <LoginForm
        onSubmit={cy.stub()}
        error="Email or password is incorrect."
        fieldErrors={{ email: 'That email is already registered.' }}
      />,
    )

    cy.getByData('login-error')
      .should('have.text', 'Email or password is incorrect.')
      .and('have.attr', 'role', 'alert')
    cy.getByData('login-email').should('have.attr', 'aria-invalid', 'true')
    cy.getByData('login-email').should('have.attr', 'aria-describedby', 'login-email-error')
  })

  it('disables submit for the duration of the promise', () => {
    // Cypress 15 removed the three-argument cy.stub(obj, 'name', fn) form.
    // Use .callsFake() instead.
    let resolveSubmit: () => void = () => {}
    const onSubmit = cy
      .stub()
      .as('onSubmit')
      .callsFake(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve
          }),
      )

    cy.mount(<LoginForm onSubmit={onSubmit} />)
    cy.getByData('login-email').type('ada@example.com')
    cy.getByData('login-password').type('a-password')
    cy.getByData('login-submit').click()

    cy.getByData('login-submit').should('be.disabled').and('have.text', 'Signing in…')

    cy.then(() => resolveSubmit())
    cy.getByData('login-submit').should('be.enabled').and('have.text', 'Sign in')
  })
})
