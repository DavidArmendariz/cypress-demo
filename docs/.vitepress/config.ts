import { defineConfig } from 'vitepress'

/**
 * GitHub Pages serves this from https://<user>.github.io/cypress-demo/, so the
 * site needs a base path. Override it for a different host:
 *   DOCS_BASE=/ npm run docs:build
 */
const base = process.env.DOCS_BASE ?? '/cypress-demo/'

/** The 11 chapters. Filenames are identical in both locales, so one list drives both sidebars. */
const CHAPTERS = [
  { slug: '01-project-setup', en: 'Project setup', es: 'Configuración del proyecto' },
  { slug: '02-selectors', en: 'Selectors', es: 'Selectores' },
  { slug: '03-testing-behind-auth', en: 'Testing behind auth', es: 'Probar detrás de la autenticación' },
  { slug: '04-state-and-isolation', en: 'State and test isolation', es: 'Estado y aislamiento de pruebas' },
  { slug: '05-network-control', en: 'Network control', es: 'Control de la red' },
  { slug: '06-component-vs-e2e', en: 'Choosing the right level of test', es: 'Elegir el nivel adecuado de prueba' },
  { slug: '07-secrets-and-env', en: 'Secrets and environment variables', es: 'Secretos y variables de entorno' },
  { slug: '08-accessibility', en: 'Accessibility', es: 'Accesibilidad' },
  { slug: '09-ci', en: 'Continuous integration', es: 'Integración continua' },
  { slug: '10-anti-patterns', en: 'Anti-patterns', es: 'Antipatrones' },
  { slug: '11-makefile-as-entrypoint', en: 'A single task entrypoint', es: 'Un único punto de entrada de tareas' },
]

const sidebarFor = (locale: 'en' | 'es', text: string) => [
  {
    text,
    items: CHAPTERS.map((chapter) => ({
      text: chapter[locale],
      link: `/${locale}/${chapter.slug}`,
    })),
  },
]

export default defineConfig({
  base,
  srcExclude: ['**/README.original.md'],
  cleanUrls: true,

  // docs/README.md is the bilingual index. GitHub renders it automatically when
  // you browse to docs/, and this makes it the site's landing page too, so one
  // file serves both audiences.
  rewrites: { 'README.md': 'index.md' },

  lastUpdated: true,

  title: 'Cypress best practices',
  description: 'A practical guide to testing an application behind a login with Cypress',

  head: [['link', { rel: 'icon', href: `${base}favicon.svg` }]],

  // No `root` locale: English lives in docs/en/ and Spanish in docs/es/, so the
  // two are symmetric and neither is a second-class citizen in the URL space.
  // docs/README.md is the landing page that sends you to one of them.
  //
  // These pages are written to stand on their own, with no references to the
  // repository they happen to live in, so the site can be shared as-is.
  locales: {
    en: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [{ text: 'Guide', link: '/en/01-project-setup' }],
        sidebar: sidebarFor('en', 'Practices'),
        outline: { level: [2, 3], label: 'On this page' },
        lastUpdatedText: 'Last updated',
        docFooter: { prev: 'Previous', next: 'Next' },
      },
    },

    es: {
      label: 'Español',
      lang: 'es',
      title: 'Buenas prácticas de Cypress',
      description: 'Patrones de Cypress para una app con autenticación, demostrados en código real',
      themeConfig: {
        nav: [{ text: 'Guía', link: '/es/01-project-setup' }],
        sidebar: sidebarFor('es', 'Prácticas'),
        outline: { level: [2, 3], label: 'En esta página' },
        lastUpdatedText: 'Última actualización',
        docFooter: { prev: 'Anterior', next: 'Siguiente' },
        returnToTopLabel: 'Volver arriba',
        sidebarMenuLabel: 'Menú',
        darkModeSwitchLabel: 'Tema',
        lightModeSwitchTitle: 'Cambiar a tema claro',
        darkModeSwitchTitle: 'Cambiar a tema oscuro',
      },
    },
  },

  themeConfig: {
    // Local search needs no account and no external service. It indexes each
    // locale separately, so a Spanish query does not return English pages.
    search: {
      provider: 'local',
      options: {
        locales: {
          es: {
            translations: {
              button: { buttonText: 'Buscar', buttonAriaLabel: 'Buscar' },
              modal: {
                displayDetails: 'Mostrar detalles',
                resetButtonTitle: 'Limpiar búsqueda',
                backButtonTitle: 'Cerrar búsqueda',
                noResultsText: 'Sin resultados para',
                footer: { selectText: 'seleccionar', navigateText: 'navegar', closeText: 'cerrar' },
              },
            },
          },
        },
      },
    },

    footer: {
      message: 'Cypress patterns for applications behind a login.',
    },
  },
})
