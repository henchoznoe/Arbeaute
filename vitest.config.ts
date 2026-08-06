import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      DATABASE_URL_UNPOOLED: 'postgresql://test:test@localhost:5432/test',
      ADMIN_PASSWORD: 'test-password',
      ADMIN_SESSION_SECRET: 'test-admin-session-secret-at-least-32-characters',
      CUSTOMER_SESSION_SECRET:
        'test-customer-session-secret-at-least-32-characters',
      BLOB_STORE_ID: 'test-store',
      BLOB_WEBHOOK_PUBLIC_KEY: 'test-public-key',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
})
