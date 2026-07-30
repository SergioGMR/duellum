export type ServerEnvironment = Readonly<Record<string, string | undefined>>

export function serverEnvironment(): ServerEnvironment {
  return (globalThis as { process?: { env?: ServerEnvironment } }).process?.env ?? {}
}

export function configuredOrigin(environment: ServerEnvironment = serverEnvironment()): string | undefined {
  const configured = environment.PUBLIC_RESULT_ORIGIN
  if (configured !== undefined) return httpsOrigin(configured)
  if (environment.VERCEL_ENV !== 'preview' || environment.VERCEL_URL === undefined) return undefined
  return httpsOrigin(`https://${environment.VERCEL_URL}`)
}

function httpsOrigin(value: string): string | undefined {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.username === '' && url.password === '' && url.pathname === '/' && url.search === '' && url.hash === '' ? url.origin : undefined
  } catch {
    return undefined
  }
}
