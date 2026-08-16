import type { Params } from '@/types'

export const ALL_REGION = '__all__'

export const STORAGE_KEY = 'produtividade-alpha-solucoes-v3'

export const JUSTIFICATION_CODES = ['BH', 'DSR', 'FE', 'FR', 'AT', 'TR', 'LI', 'MV', 'IN', 'DE'] as const

export const JUSTIFICATION_LABELS: Record<string, string> = {
  BH: 'Banco de Horas',
  DSR: 'Descanso Semanal',
  FE: 'Férias',
  FR: 'Feriado',
  AT: 'Atestado',
  TR: 'Treinamento',
  LI: 'Licença',
  MV: 'Manutenção Veicular',
  IN: 'Interjornadas',
  DE: 'Demitido',
}

export const JUSTIFICATION_COLORS: Record<string, { bg: string; text: string }> = {
  BH: { bg: '#f1cfcf', text: '#762222' },
  DSR: { bg: '#f1eccf', text: '#766a22' },
  FE: { bg: '#d9f1cf', text: '#3a7622' },
  FR: { bg: '#f1e0cf', text: '#764c22' },
  AT: { bg: '#cff1e2', text: '#227652' },
  TR: { bg: '#cfe2f1', text: '#225276' },
  LI: { bg: '#d9cff1', text: '#3a2276' },
  MV: { bg: '#f1cfec', text: '#76226a' },
  IN: { bg: '#cfeef1', text: '#226a76' },
  DE: { bg: '#ececef', text: '#3a3a44' },
}

export const FUNCOES = ['TÉCNICO DE FIBRA', 'OFICIAL DE REDE'] as const

export const FUNCAO_DEFAULT = FUNCOES[0]

export const PERFIS = {
  admin: 'admin',
  gestor: 'gestor',
  leitura: 'leitura',
} as const

export const PERFIS_LIST = [
  { value: 'admin', label: 'Admin' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'leitura', label: 'Leitura' },
] as const

export const ADMIN_BOOTSTRAP_EMAIL = 'davidsgarcia.dev@gmail.com'

export const FUEL_KM_L_ALERT = 6.0

export const FUEL_KM_MAX_FACTOR = 30

export const BH_WORK_MIN = {
  weekday: 8 * 60,
  saturday: 4 * 60,
} as const

export const DEFAULT_PARAMS: Params = {
  dayMeta: [0, 4, 4, 4, 4, 4, 0],
  trendWindow: 7,
  quartil: { q1: 3.5, q2: 2.5, q3: 1.0 },
  alertTech: { below: 2.0, streak: 3 },
  alertTeam: { belowPct: 70, streak: 2 },
  alertProjection: { belowPct: 80 },
}
