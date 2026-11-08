import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests_unit/**/*.test.{ts,tsx}'],
    // Con la cobertura activada (CI) el código instrumentado va más lento y la primera prueba de cada
    // fichero puede pasar de 15 s con toda la batería en paralelo
    testTimeout: 30000,
    // npm run test:coverage genera coverage/lcov.info, que SonarCloud usa para medir la cobertura.
    // Las rutas del informe son relativas a la raíz del repositorio (Frontend/src/...), que es desde donde
    // analiza SonarCloud
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text-summary', ['lcovonly', { projectRoot: '..' }]],
      reportsDirectory: 'coverage',
    },
  },
})
