import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { seedState } from '@/lib/seed'
import type { AppState } from '@/types'

/**
 * Cobertura da camada de persistência.
 *
 * Antesthese testes não existiam: as 118 demais cobrem regras de negócio
 * puras, e nenhuma tocava persistence.ts nem state.store.ts. Foi essa lacuna
 * que deixou uma falha de gravação passar semanas reportando "salvo" ao
 * usuário enquanto o dado ia só para o localStorage.
 */

const db = {
  ready: false,
  doc: null as Record<string, unknown> | null,
  writes: 0,
  lastPayload: null as Record<string, unknown> | null,
  failNext: null as unknown,
  remoteVersion: null as number | null,
}

vi.mock('firebase/app', () => ({
  FirebaseError: class FirebaseError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
      this.name = 'FirebaseError'
    }
  },
  initializeApp: () => ({}),
  getApps: () => [{ name: 'test' }],
}))

vi.mock('firebase/firestore', () => ({
  doc: () => ({ __kind: 'doc' }),
  collection: () => ({ __kind: 'collection' }),
  getDoc: async () => ({
    exists: () => db.doc !== null,
    data: () => db.doc,
  }),
  onSnapshot: () => () => undefined,
  runTransaction: async (_db: unknown, fn: (t: unknown) => Promise<unknown>) => {
    if (db.failNext) {
      const e = db.failNext
      db.failNext = null
      throw e
    }
    return fn({
      get: async () => ({
        exists: () => db.doc !== null,
        data: () => {
          if (db.remoteVersion === null) return db.doc
          return { ...(db.doc ?? {}), _meta: { version: db.remoteVersion, updatedAt: null } }
        },
      }),
      set: (_ref: unknown, data: Record<string, unknown>) => {
        db.lastPayload = data
        db.writes += 1
        db.doc = data
      },
    })
  },
}))

vi.mock('@/services/firebase/client', () => ({
  getFirebase: () => (db.ready ? { app: {}, db: {}, auth: {} } : { app: null, db: null, auth: null }),
}))

vi.mock('@/services/storage', () => ({
  saveToStorage: vi.fn(async () => ({ saved: true, via: 'local' })),
  loadFromStorage: vi.fn(async () => null),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }))

const { toast } = await import('sonner')
const { saveToStorage } = await import('@/services/storage')
const { useStateStore, isRemoteNewer } = await import('@/stores/state.store')
const {
  ConflictError,
  PersistenceUnavailableError,
  saveToFirestore,
  saveWithRebase,
  hasStateDoc,
  describePersistenceError,
} = await import('@/services/firebase/persistence')

function stateWithVersion(v: number): AppState {
  const s = seedState()
  s._meta = { version: v, updatedAt: new Date(2026, 0, 1).toISOString() }
  return s
}

beforeEach(() => {
  db.ready = true
  db.doc = null
  db.writes = 0
  db.lastPayload = null
  db.failNext = null
  db.remoteVersion = null
  vi.clearAllMocks()
  useStateStore.setState({
    data: null,
    status: 'idle',
    saveStatus: 'idle',
    dirty: false,
    saveError: null,
    confirmDiscard: () => false,
  })
})

afterEach(() => {
  db.ready = false
})

describe('hasStateDoc', () => {
  it('é verdadeiro quando há Firestore configurado', () => {
    expect(hasStateDoc()).toBe(true)
  })

  it('é falso sem configuração — e a escrita precisa falhar por causa disso', async () => {
    db.ready = false
    expect(hasStateDoc()).toBe(false)
  })
})

describe('saveToFirestore', () => {
  it('grava e avança a versão', async () => {
    const s = stateWithVersion(7)
    db.doc = { _meta: { version: 7, updatedAt: null } }
    await saveToFirestore(s)
    expect(db.writes).toBe(1)
    expect((db.lastPayload!._meta as { version: number }).version).toBe(8)
  })

  it('LANÇA quando não há Firestore, em vez de resolver como sucesso', async () => {
    db.ready = false
    await expect(saveToFirestore(stateWithVersion(1))).rejects.toBeInstanceOf(
      PersistenceUnavailableError,
    )
    // o regression original: isto resolvia e o caller marcava 'saved'
    expect(db.writes).toBe(0)
  })

  it('LANÇA estado vazio em vez de resolver silenciosamente', async () => {
    await expect(saveToFirestore(null)).rejects.toThrow()
  })

  it('propaga erro do Firestore em vez de engolir', async () => {
    db.failNext = new Error('rede caiu')
    await expect(saveToFirestore(stateWithVersion(1))).rejects.toThrow('rede caiu')
  })

  it('propaga FirebaseError de permissão sem converter em sucesso', async () => {
    const { FirebaseError } = await import('firebase/app')
    db.failNext = new FirebaseError('permission-denied', 'Missing or insufficient permissions')
    await expect(saveToFirestore(stateWithVersion(1))).rejects.toThrow()
  })

  it('não sobrescreve silenciosamente uma versão remota diferente', async () => {
    db.doc = { _meta: { version: 99, updatedAt: null } }
    await expect(saveToFirestore(stateWithVersion(5))).rejects.toBeInstanceOf(ConflictError)
    expect(db.writes).toBe(0)
  })

  it('NÃO repete a mesma versão obsoleta 3x (o retry cego do bug original)', async () => {
    db.doc = { _meta: { version: 99, updatedAt: null } }
    await expect(saveToFirestore(stateWithVersion(5))).rejects.toBeInstanceOf(ConflictError)
    // uma única tentativa de escrita, não três leituras inúteis
    expect(db.writes).toBe(0)
  })
})

describe('saveWithRebase', () => {
  it('reaplica a importação por cima do estado remoto em vez de falhar', async () => {
    db.doc = { _meta: { version: 50, updatedAt: null }, regions: { norte: { name: 'remoto' } } }
    let current: AppState | null = stateWithVersion(1)
    const setState = (s: AppState | null) => {
      current = s
    }
    await saveWithRebase({
      getState: () => current,
      setState,
      reapply: () => {
        const next = stateWithVersion(50)
        next.regions.norte.name = 'reaplicado'
        return next
      },
    })
    expect(db.writes).toBe(1)
    expect((db.lastPayload!.regions as any).norte.name).toBe('reaplicado')
  })

  it('propaga erro que não é de conflito sem tentar rebase', async () => {
    db.doc = { _meta: { version: 1, updatedAt: null } }
    db.failNext = new Error('sem rede')
    await expect(
      saveWithRebase({
        getState: () => stateWithVersion(1),
        setState: () => undefined,
        reapply: () => null,
      }),
    ).rejects.toThrow('sem rede')
  })
})

describe('scheduleSave — o invariante central', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('NUNCA marca saved quando o Firestore falha', async () => {
    useStateStore.setState({ data: stateWithVersion(3), status: 'ready' })
    db.doc = { _meta: { version: 3, updatedAt: null } }
    db.failNext = new Error('sem rede')

    useStateStore.getState().scheduleSave()
    await vi.advanceTimersByTimeAsync(500)

    const s = useStateStore.getState()
    expect(s.saveStatus).toBe('error')
    expect(s.dirty).toBe(true)
    expect(s.saveError).toBeTruthy()
    // o bug original marcava 'saved' aqui
    expect(s.saveStatus).not.toBe('saved')
  })

  it('marca saved apenas quando o Firestore aceitou', async () => {
    useStateStore.setState({ data: stateWithVersion(3), status: 'ready' })
    db.doc = { _meta: { version: 3, updatedAt: null } }

    useStateStore.getState().scheduleSave()
    await vi.advanceTimersByTimeAsync(500)

    expect(useStateStore.getState().saveStatus).toBe('saved')
    expect(useStateStore.getState().dirty).toBe(false)
  })

  it('avisa o usuário quando a gravação falha', async () => {
    useStateStore.setState({ data: stateWithVersion(3), status: 'ready' })
    db.doc = { _meta: { version: 3, updatedAt: null } }
    db.failNext = new Error('sem rede')

    useStateStore.getState().scheduleSave()
    await vi.advanceTimersByTimeAsync(500)

    expect(toast.error).toHaveBeenCalled()
  })

  it('usa a reserva local sem chamá-la de sucesso no banco', async () => {
    useStateStore.setState({ data: stateWithVersion(3), status: 'ready' })
    db.doc = { _meta: { version: 3, updatedAt: null } }
    db.failNext = new Error('sem rede')

    useStateStore.getState().scheduleSave()
    await vi.advanceTimersByTimeAsync(500)

    expect(saveToStorage).toHaveBeenCalled()
    expect(useStateStore.getState().saveStatus).toBe('error')
  })

  it('reporta erro (não sucesso) quando não há Firestore configurado', async () => {
    db.ready = false
    useStateStore.setState({ data: stateWithVersion(3), status: 'ready' })

    useStateStore.getState().scheduleSave()
    await vi.advanceTimersByTimeAsync(500)

    const s = useStateStore.getState()
    expect(s.saveStatus).toBe('error')
    expect(s.saveError).toMatch(/Firestore/i)
    expect(s.saveError).toMatch(/NÃO foram salvos no banco/)
  })

  it('retrySave recupera depois de uma falha', async () => {
    useStateStore.setState({ data: stateWithVersion(3), status: 'ready' })
    db.doc = { _meta: { version: 3, updatedAt: null } }
    db.failNext = new Error('sem rede')

    useStateStore.getState().scheduleSave()
    await vi.advanceTimersByTimeAsync(500)
    expect(useStateStore.getState().saveStatus).toBe('error')

    useStateStore.getState().retrySave()
    await vi.advanceTimersByTimeAsync(0)
    expect(useStateStore.getState().saveStatus).toBe('saved')
  })
})

describe('ordenação por versão, não por relógio do cliente', () => {
  it('um updatedAt mais novo não vence uma versão maior', () => {
    // o Signal antigo comparava new Date(updatedAt): relógios divergentes
    // entre usuários faziam atualização legítima ser descartada
    expect(isRemoteNewer(10, 3)).toBe(true)
  })

  it('versão igual ou menor não sobrescreve', () => {
    expect(isRemoteNewer(3, 3)).toBe(false)
    expect(isRemoteNewer(2, 3)).toBe(false)
  })

  it('trata versões ausentes como zero', () => {
    expect(isRemoteNewer(undefined, undefined)).toBe(false)
    expect(isRemoteNewer(1, undefined)).toBe(true)
  })
})

describe('describePersistenceError', () => {
  it('traduz permissão negada preservando o detalhe', async () => {
    const { FirebaseError } = await import('firebase/app')
    const msg = describePersistenceError(
      new FirebaseError('permission-denied', 'Missing or insufficient permissions.'),
    )
    expect(msg).toMatch(/permissão/i)
    expect(msg).toMatch(/insufficient permissions/i)
  })

  it('traduz indisponibilidade de rede', async () => {
    const { FirebaseError } = await import('firebase/app')
    expect(describePersistenceError(new FirebaseError('unavailable', 'x'))).toMatch(/indisponível/i)
  })

  it('traduz estouro do limite de tamanho', async () => {
    const { FirebaseError } = await import('firebase/app')
    expect(
      describePersistenceError(new FirebaseError('resource-exhausted', 'too big')),
    ).toMatch(/recusou/i)
  })

  /**
   * A detecção é pela mensagem, não pelo código: 'resource-exhausted' também
   * cobre cota/rate limit, então culpar o tamanho só porque o código apareceu
   * seria um chute.
   */
  it('não culpa o tamanho quando o código é de cota', async () => {
    const { FirebaseError } = await import('firebase/app')
    const msg = describePersistenceError(
      new FirebaseError('resource-exhausted', 'Quota exceeded for quota metric.'),
    )
    expect(msg).not.toMatch(/1 MiB/)
    expect(msg).toMatch(/Quota exceeded/i)
  })

  /**
   * Regressão do congelamento de setembro/2026: o Firestore reporta o limite de
   * 1 MiB como 'invalid-argument', não 'resource-exhausted'. O mapeamento por
   * código deixava passar e o app exibia "Erro do Firestore: invalid-argument"
   * sem nenhuma pista da causa.
   */
  it('identifica estouro de tamanho vindo como invalid-argument', async () => {
    const { FirebaseError } = await import('firebase/app')
    const msg = describePersistenceError(
      new FirebaseError('invalid-argument', 'The maximum write size is 1048576 bytes.'),
    )
    expect(msg).toMatch(/1 MiB/)
    expect(msg).toMatch(/1048576/)
  })

  /**
   * A causa real de setembro/2026: o documento único estourou o limite de
   * 40.000 ENTRADAS DE ÍNDICE, não o de tamanho. O Firestore reporta os dois
   * como 'invalid-argument', então só a mensagem separa "rode a manutenção"
   * de "o documento ficou grande".
   */
  it('identifica limite de entradas de indice e aponta a manutencao', async () => {
    const { FirebaseError } = await import('firebase/app')
    const msg = describePersistenceError(
      new FirebaseError('invalid-argument', 'too many index entries for entity /produtividade/estado'),
    )
    expect(msg).toMatch(/limite de campos/i)
    expect(msg).toMatch(/prune-estado/i)
    expect(msg).not.toMatch(/1 MiB/)
    expect(msg).toMatch(/too many index entries/i)
  })

  it('nunca descarta a mensagem original do Firestore', async () => {
    const { FirebaseError } = await import('firebase/app')
    const detalhe = 'The maximum write size is 1048576 bytes.'
    for (const code of [
      'invalid-argument',
      'permission-denied',
      'unavailable',
      'aborted',
      'not-found',
      'already-exists',
      'deadline-exceeded',
    ]) {
      expect(describePersistenceError(new FirebaseError(code, detalhe))).toContain(detalhe)
    }
  })

  it('preserva código e detalhe em erros desconhecidos', async () => {
    const { FirebaseError } = await import('firebase/app')
    const msg = describePersistenceError(new FirebaseError('unmapped-code', 'detalhe-unico'))
    expect(msg).toMatch(/unmapped-code/)
    expect(msg).toMatch(/detalhe-unico/)
  })

  it('cai no código quando o Firestore não traz mensagem', async () => {
    const { FirebaseError } = await import('firebase/app')
    const msg = describePersistenceError(new FirebaseError('weird', ''))
    expect(msg).toMatch(/weird/)
  })

  it('traduz conflito de edição concorrente', () => {
    expect(describePersistenceError(new ConflictError('x'))).toMatch(/concorrente/i)
  })
})
