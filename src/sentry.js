import * as Sentry from '@sentry/react'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN

export function initSentry() {
  if (!SENTRY_DSN || !import.meta.env.PROD) return

  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
    ],
    tracesSampleRate: 1.0,
    sendDefaultPii: true,
    enableLogs: true,
    tracePropagationTargets: ['localhost', /\.ts\.net/],
    environment: import.meta.env.MODE,
  })
}
