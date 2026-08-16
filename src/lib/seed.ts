import { DEFAULT_PARAMS } from './constants'
import type { AppState } from '@/types'

export function seedState(): AppState {
  const now = new Date()
  return {
    currentRegion: 'norte',
    currentYear: now.getFullYear(),
    currentMonth: now.getMonth(),
    _meta: { version: 0, updatedAt: null },
    params: JSON.parse(JSON.stringify(DEFAULT_PARAMS)) as AppState['params'],
    veiculos: {},
    colaboradores: {},
    fuel: {},
    bh: { base: [], folgas: {}, period: null },
    sobreaviso: {},
    regions: {
      norte: {
        name: 'REGIÃO NORTE',
        technicians: [
          { funci: '18-00009325', nome: 'JOSE DA LUZ PEREIRA VERAS' },
          { funci: '18-00009190', nome: 'PEDRO RODRIGUES SOARES NETO' },
          { funci: '18-00009379', nome: 'JOSE ROBERTO SOUSA SILVA' },
          { funci: '18-00009354', nome: 'JOSE RENNAN LUCAS DE SOUSA' },
          { funci: '18-00013284', nome: 'SIDNEY DE SOUSA GONCALVES' },
          { funci: '18-00009356', nome: 'LAERTE DE CARVALHO COSTA' },
          { funci: '18-00009423', nome: 'JULIO SILVERIO PEREIRA DA SILVA' },
        ],
        entries: {},
        locked: false,
      },
    },
  }
}
