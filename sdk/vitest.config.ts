import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'src/abis/**',
        'node_modules/**',
      ],
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
