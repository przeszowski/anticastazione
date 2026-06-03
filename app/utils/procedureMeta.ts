import type { PoraDnia, StatusWykonania } from '~/types/database.types'

export type UiColor = 'error' | 'primary' | 'info' | 'neutral' | 'success' | 'secondary' | 'warning'

export const raportTabs = [
  { label: 'Przegląd dzienny', to: '/raporty' },
  { label: 'Tabela zbiorcza', to: '/raporty/tabela' }
]

export const dzialOptions = [
  { label: 'Kuchnia', value: 'Kuchnia' },
  { label: 'Bar', value: 'Bar' },
  { label: 'Sala', value: 'Sala' },
  { label: 'Zmywak', value: 'Zmywak' },
  { label: 'Recepcja', value: 'Recepcja' }
]

export const poraDniaOptions: { label: string; value: PoraDnia }[] = [
  { label: 'Rano', value: 'Rano' },
  { label: 'Dzień', value: 'Dzien' },
  { label: 'Wieczór', value: 'Wieczor' }
]

export const poraDniaLabel = {
  Rano: 'Rano',
  Dzien: 'Dzień',
  Wieczor: 'Wieczór'
} satisfies Record<PoraDnia, string>

export const poraDniaBadge = {
  Rano: 'primary',
  Dzien: 'info',
  Wieczor: 'warning'
} as const satisfies Record<PoraDnia, UiColor>

export const statusWykonaniaLabel = {
  do_zrobienia: 'Do zrobienia',
  w_trakcie: 'W trakcie',
  wykonane: 'Wykonane',
  odrzucone: 'Odrzucone'
} satisfies Record<StatusWykonania, string>

export const statusWykonaniaBadge = {
  do_zrobienia: 'neutral',
  w_trakcie: 'primary',
  wykonane: 'success',
  odrzucone: 'error'
} as const satisfies Record<StatusWykonania, UiColor>

export const statusWykonaniaGroupClass = {
  do_zrobienia: 'text-muted border-muted bg-elevated',
  w_trakcie: 'text-info border-info/30 bg-info/5',
  wykonane: 'text-success border-success/30 bg-success/5',
  odrzucone: 'text-error border-error/30 bg-error/5'
} satisfies Record<StatusWykonania, string>

export function formatPoraDnia(pora?: PoraDnia | null) {
  return pora ? poraDniaLabel[pora] : '—'
}

export function badgePoryDnia(pora?: PoraDnia | null): UiColor {
  return pora ? poraDniaBadge[pora] : 'neutral'
}
