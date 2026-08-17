import type { PublicUser, Todo } from '../../shared/types'

/** Shape of the test-only seed endpoint's request body. */
export interface SeedPayload {
  users?: { email: string; password: string; name: string }[]
  todos?: { email: string; title: string; completed?: boolean; createdAt?: string }[]
}

export interface SeedResult {
  users: PublicUser[]
  todos: Todo[]
}

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Selects by the data-cy contract instead of by CSS class, tag or text.
       * @example cy.getByData('todo-item').should('have.length', 3)
       */
      getByData(selector: string, options?: Partial<Loggable & Timeoutable & Withinable>): Chainable<JQuery<HTMLElement>>

      /** Wipes the API's state and re-creates the default user. */
      resetDb(): Chainable<void>

      /** Creates users and todos over the API so specs never build state through the UI. */
      seed(payload: SeedPayload): Chainable<SeedResult>

      /**
       * Signs in over the API and caches the session. Use this in beforeEach
       * for every spec whose subject is not the login form itself.
       */
      loginByApi(email?: string, password?: string): Chainable<void>

      /**
       * Signs in through the form. Deliberately slow, used only by the spec
       * that tests the login form.
       */
      loginByUi(email: string, password: string): Chainable<void>
    }
  }
}
