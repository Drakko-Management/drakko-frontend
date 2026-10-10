import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    exclude: ['e2e/**', 'node_modules/**'],
    // Vitest vide les fichiers CSS ; celui-ci est lu en texte brut par un test de garde (index.css.test.ts)
    css: { include: [/src\/index\.css/] },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'virtual:pwa-register/react': path.resolve(__dirname, './src/test/pwa-register-react.ts'),
    },
  },
})
