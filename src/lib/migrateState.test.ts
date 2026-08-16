import { describe, expect, it } from 'vitest'
import { migrateState } from './migrateState'
import { readBackupFixture } from '@/test/fixtures'

describe('migrateState', () => {
  it('rejeita payload sem regions', () => {
    expect(migrateState({})).toBeNull()
    expect(migrateState(null)).toBeNull()
  })

  it('normaliza um backup real do Firestore', () => {
    const raw = readBackupFixture()
    const state = migrateState(raw)
    expect(state).not.toBeNull()

    const now = new Date()
    expect(state!.currentYear).toBe(now.getFullYear())
    expect(state!.currentMonth).toBe(now.getMonth())

    expect(state!._meta).toBeDefined()
    expect(typeof state!._meta.version).toBe('number')

    expect(state!.params.dayMeta.length).toBe(7)
    expect(state!.params.quartil.q1).toBeGreaterThan(0)

    Object.values(state!.regions).forEach((r) => {
      expect(typeof r.locked).toBe('boolean')
      expect(r.sla).toBeDefined()
      r.technicians.forEach((t) => {
        expect(typeof t.imported).toBe('boolean')
        const colab = state!.colaboradores[t.funci]
        if (colab) {
          expect(typeof colab.funcao).toBe('string')
        }
      })
    })

    expect(state!.bh.base).toBeInstanceOf(Array)
    expect(state!.bh.folgas).toBeTypeOf('object')
    expect(state!.sobreaviso).toBeTypeOf('object')
    expect(state!.fuel).toBeTypeOf('object')
  })

  it('deriva a flag imported a partir das entries (sem flag = tem pontuações)', () => {
    const state = migrateState({
      regions: {
        r1: {
          name: 'R1',
          locked: false,
          technicians: [{ funci: 'A', nome: 'A' }, { funci: 'B', nome: 'B' }],
          entries: { '2026-07': { A: { '2026-07-01': 4 } } },
        },
      },
    })
    expect(state!.regions.r1.technicians[0].imported).toBe(true)
    expect(state!.regions.r1.technicians[1].imported).toBe(false)
  })

  it('corrige imported:true sem entries', () => {
    const state = migrateState({
      regions: {
        r1: {
          name: 'R1',
          locked: true,
          technicians: [{ funci: 'A', nome: 'A', imported: true }],
          entries: {},
        },
      },
    })
    expect(state!.regions.r1.technicians[0].imported).toBe(false)
  })

  it('faz backfill de colaboradores a partir dos technicians', () => {
    const state = migrateState({
      regions: {
        r1: {
          name: 'R1',
          locked: false,
          technicians: [{ funci: 'A', nome: 'nome a', imported: true }],
          entries: { '2026-07': { A: { '2026-07-01': 4 } } },
        },
      },
    })
    const colab = state!.colaboradores['A']
    expect(colab).toBeDefined()
    expect(colab.nome).toBe('NOME A')
    expect(colab.regiao).toBe('r1')
    expect(colab.funcao).toBe('TÉCNICO DE FIBRA')
    expect(colab.telefone).toBeNull()
  })

  it('migra dayMeta a partir de minScore antigo', () => {
    const state = migrateState({
      regions: { r1: { name: 'R1', locked: false, technicians: [], entries: {} } },
      params: { minScore: 4 },
    })
    expect(state!.params.dayMeta).toEqual([0, 4, 4, 4, 4, 4, 0])
  })

  it('remove campos órfãos (rankingMode, avaliacoes, activityCounts)', () => {
    const state = migrateState({
      rankingMode: 'x',
      avaliacoes: {},
      regions: {
        r1: {
          name: 'R1',
          locked: false,
          technicians: [],
          entries: {},
          activityCounts: {},
        },
      },
    }) as unknown as Record<string, unknown>
    expect(state['rankingMode']).toBeUndefined()
    expect(state['avaliacoes']).toBeUndefined()
    expect((state['regions'] as Record<string, Record<string, unknown>>)['r1']['activityCounts']).toBeUndefined()
  })
})
