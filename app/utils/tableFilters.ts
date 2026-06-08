import { ALL_SELECT_VALUE } from '~/utils/procedureMeta'

export function matchesText(value: unknown, query: string) {
  const needle = query.trim().toLocaleLowerCase('pl-PL')
  if (!needle) return true
  return String(value ?? '').toLocaleLowerCase('pl-PL').includes(needle)
}

export function matchesOption<T>(value: T | null | undefined, selected: T | typeof ALL_SELECT_VALUE) {
  return selected === ALL_SELECT_VALUE || value === selected
}

export function matchesNumberRange(value: number | null | undefined, min?: number | null, max?: number | null) {
  if (min != null && (value == null || value < min)) return false
  if (max != null && (value == null || value > max)) return false
  return true
}
