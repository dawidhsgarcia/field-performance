export type Perfil = 'admin' | 'gestor' | 'leitura'

export type Permissao =
  | 'editarMatriz'
  | 'importar'
  | 'programarFolga'
  | 'programarSobreaviso'
  | 'salvarParams'
  | 'gerenciarColaboradores'
  | 'gerenciarVeiculos'
  | 'gerenciarUsuarios'
  | 'criarRegiao'
  | 'removerRegiao'
  | 'backupRestore'

export interface AuthUser {
  uid: string
  email: string
  nome: string
  perfil: Perfil
}
