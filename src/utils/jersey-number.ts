export const JERSEY_NUMBER_PATTERN = /^\d{1,2}$/

export function sanitizeJerseyNumberInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 2)
}

export function parseJerseyNumber(value: string) {
  const jerseyNumber = value.trim()
  return jerseyNumber && JERSEY_NUMBER_PATTERN.test(jerseyNumber) ? jerseyNumber : undefined
}
