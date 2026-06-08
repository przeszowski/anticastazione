function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function errorMessage(error: unknown, fallback = 'Wystąpił błąd.') {
  if (error instanceof Error && error.message) return error.message
  if (!isRecord(error)) return fallback

  const direct = error.statusMessage
  if (typeof direct === 'string' && direct) return direct

  const data = error.data
  if (isRecord(data) && typeof data.statusMessage === 'string' && data.statusMessage) {
    return data.statusMessage
  }

  const message = error.message
  return typeof message === 'string' && message ? message : fallback
}
