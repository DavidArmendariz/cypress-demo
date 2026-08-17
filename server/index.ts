import { createApp } from './app'

const port = Number(process.env.API_PORT ?? 3001)
const enableTestRoutes = process.env.ENABLE_TEST_ROUTES === '1'

const app = createApp({ enableTestRoutes })

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
  if (enableTestRoutes) {
    console.log('Test routes enabled at /api/test (ENABLE_TEST_ROUTES=1)')
  }
})
