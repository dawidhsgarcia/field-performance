import { describe, expect, it } from 'vitest'
import { applyAuthSession, can, PERMISSOES } from './permissions'

describe('can', () => {
  it('admin possui todas as permissões', () => {
    Object.keys(PERMISSOES.admin).forEach((acao) => {
      expect(can('admin', acao as keyof typeof PERMISSOES.admin)).toBe(true)
    })
  })

  it('gestor não gerencia usuários nem regiões/backup', () => {
    expect(can('gestor', 'editarMatriz')).toBe(true)
    expect(can('gestor', 'importar')).toBe(true)
    expect(can('gestor', 'gerenciarUsuarios')).toBe(false)
    expect(can('gestor', 'criarRegiao')).toBe(false)
    expect(can('gestor', 'backupRestore')).toBe(false)
  })

  it('leitura não edita nada', () => {
    expect(can('leitura', 'editarMatriz')).toBe(false)
    expect(can('leitura', 'salvarParams')).toBe(false)
  })

  it('perfil nulo não tem permissão', () => {
    expect(can(null, 'editarMatriz')).toBe(false)
  })
})

describe('applyAuthSession', () => {
  it('aplica perfil do documento usuários', () => {
    const res = applyAuthSession(
      { uid: 'u1', email: 'a@b.com' },
      { u1: { uid: 'u1', email: 'a@b.com', nome: 'Ana', perfil: 'gestor' } },
    )
    expect(res.perfil).toBe('gestor')
    expect(res.user.nome).toBe('Ana')
  })

  it('admin bootstrap pelo e-mail', () => {
    const res = applyAuthSession({ uid: 'x', email: 'davidsgarcia.dev@gmail.com' }, {})
    expect(res.perfil).toBe('admin')
  })

  it('usuário sem documento vira leitura', () => {
    const res = applyAuthSession({ uid: 'x', email: 'outro@b.com' }, {})
    expect(res.perfil).toBe('leitura')
  })
})
