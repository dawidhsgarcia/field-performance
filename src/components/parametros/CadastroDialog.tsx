import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ALL_REGION, FUNCAO_DEFAULT, FUNCOES, PERFIS, PERFIS_LIST } from '@/lib/constants'
import { importedTechs, setColaborador, setVeiculo } from '@/services/state'
import { createUsuario, updateUsuario } from '@/services/auth/users'
import { useStateStore } from '@/stores/state.store'
import { useAuthStore } from '@/stores/auth.store'
import type { Perfil } from '@/types'

export type CadKind = 'colab' | 'usuario' | 'veiculo'

interface CadastroDialogProps {
  kind: CadKind
  editKey: string | null
  onOpenChange: (open: boolean) => void
}

function defaultRegiao(currentRegion: string | undefined, regions: Record<string, { name: string }>) {
  if (currentRegion && currentRegion !== ALL_REGION && regions[currentRegion]) return currentRegion
  return Object.keys(regions)[0] ?? ''
}

function ColabForm({ editKey, onDone }: { editKey: string | null; onDone: () => void }) {
  const data = useStateStore((s) => s.data)
  const commit = useStateStore((s) => s.commit)
  const can = useAuthStore((s) => s.can)
  const existing = editKey ? data?.colaboradores[editKey] : null
  const regions = data?.regions ?? {}

  const [funci, setFunci] = useState(existing?.funci ?? '')
  const [nome, setNome] = useState(existing?.nome ?? '')
  const [funcao, setFuncao] = useState<string>(existing?.funcao ?? FUNCAO_DEFAULT)
  const [telefone, setTelefone] = useState(existing?.telefone ?? '')
  const [regiao, setRegiao] = useState(() => defaultRegiao(data?.currentRegion, regions))

  function handleSave() {
    if (!can('gerenciarColaboradores')) {
      toast.error('Você não tem permissão para gerenciar colaboradores.')
      return
    }
    const f = (editKey || funci).trim()
    const n = nome.trim()
    const rg = regiao || Object.keys(regions)[0] || ''
    if (!f) {
      toast.error('Informe o funcid do colaborador.')
      return
    }
    if (!n) {
      toast.error('Informe o nome do colaborador.')
      return
    }
    if (!funcao) {
      toast.error('Escolha a função do colaborador.')
      return
    }
    if (!editKey && data?.colaboradores[f]) {
      toast.error(`Já existe um colaborador com o funcid ${f}.`)
      return
    }
    commit((s) => setColaborador(s, f, n, rg, funcao, telefone.trim()))
    toast.success(editKey ? 'Colaborador atualizado!' : 'Colaborador cadastrado!')
    onDone()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="cadColabFunci">Funcid</Label>
        <Input
          id="cadColabFunci"
          maxLength={20}
          placeholder="18-00000000"
          value={funci}
          onChange={(e) => setFunci(e.target.value)}
          readOnly={!!editKey}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="cadColabNome">Nome</Label>
        <Input
          id="cadColabNome"
          maxLength={60}
          placeholder="NOME DO COLABORADOR"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label>Função</Label>
        <Select value={funcao} onValueChange={setFuncao}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FUNCOES.map((fn) => (
              <SelectItem key={fn} value={fn}>
                {fn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="cadColabTelefone">Telefone/WhatsApp</Label>
        <Input
          id="cadColabTelefone"
          type="tel"
          maxLength={20}
          placeholder="(99) 99999-9999"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label>Região</Label>
        <Select value={regiao} onValueChange={setRegiao}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(regions).map((rid) => (
              <SelectItem key={rid} value={rid}>
                {regions[rid].name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave}>
          {editKey ? 'Salvar alterações' : 'Cadastrar'}
        </Button>
      </DialogFooter>
    </div>
  )
}

function VeiculoForm({ editKey, onDone }: { editKey: string | null; onDone: () => void }) {
  const data = useStateStore((s) => s.data)
  const commit = useStateStore((s) => s.commit)
  const can = useAuthStore((s) => s.can)
  const existing = editKey ? data?.veiculos[editKey] : null
  const regions = data?.regions ?? {}

  const [placa, setPlaca] = useState(existing?.placa ?? '')
  const [regiao, setRegiao] = useState(() => defaultRegiao(data?.currentRegion, regions))
  const [motorista, setMotorista] = useState(existing?.motorista ?? '')
  const [orcamento, setOrcamento] = useState(existing?.orcamento != null ? String(existing.orcamento) : '')

  const techs = regiao ? importedTechs(regions[regiao], data?.colaboradores) : []
  const motoristaValido = motorista && techs.some((t) => t.funci === motorista) ? motorista : ''

  function handleRegionChange(value: string) {
    setRegiao(value)
    setMotorista('')
  }

  function handleSave() {
    if (!can('gerenciarVeiculos')) {
      toast.error('Você não tem permissão para gerenciar veículos.')
      return
    }
    const p = (editKey || placa).trim().toUpperCase()
    const fu = motorista
    const rg = regiao || Object.keys(regions)[0] || ''
    if (!p) {
      toast.error('Informe a placa do veículo.')
      return
    }
    if (!fu) {
      toast.error('Escolha um motorista (técnico) para o veículo.')
      return
    }
    const raw = orcamento.trim()
    const o = raw === '' ? null : parseFloat(raw)
    commit((s) => setVeiculo(s, p, fu, rg, o === null || isNaN(o) ? null : o))
    toast.success(editKey ? 'Veículo atualizado!' : 'Veículo cadastrado!')
    onDone()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="cadVeiculoPlaca">Placa</Label>
        <Input
          id="cadVeiculoPlaca"
          maxLength={10}
          placeholder="ABC1D23"
          value={placa}
          onChange={(e) => setPlaca(e.target.value)}
          readOnly={!!editKey}
        />
      </div>
      <div className="space-y-1">
        <Label>Região</Label>
        <Select value={regiao} onValueChange={handleRegionChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(regions).map((rid) => (
              <SelectItem key={rid} value={rid}>
                {regions[rid].name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Motorista</Label>
        {techs.length === 0 ? (
          <SelectTrigger className="w-full opacity-60" disabled>
            <SelectValue placeholder="Sem técnicos importados nesta região" />
          </SelectTrigger>
        ) : (
          <Select value={motoristaValido} onValueChange={setMotorista}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {techs.map((t) => (
                <SelectItem key={t.funci} value={t.funci}>
                  {t.nome} ({t.funci})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="cadVeiculoOrcamento">Orçamento (R$)</Label>
        <Input
          id="cadVeiculoOrcamento"
          type="number"
          min={0}
          step={0.01}
          placeholder="0,00"
          value={orcamento}
          onChange={(e) => setOrcamento(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave}>
          {editKey ? 'Salvar alterações' : 'Cadastrar'}
        </Button>
      </DialogFooter>
    </div>
  )
}

function UsuarioForm({ editKey, onDone }: { editKey: string | null; onDone: () => void }) {
  const can = useAuthStore((s) => s.can)
  const usuarios = useAuthStore((s) => s.usuarios)
  const existing = editKey ? usuarios[editKey] : null

  const [email, setEmail] = useState(existing?.email ?? '')
  const [nome, setNome] = useState(existing?.nome ?? '')
  const [perfil, setPerfil] = useState<string>(existing?.perfil ?? PERFIS.gestor)
  const [senha, setSenha] = useState('')

  async function handleSave() {
    if (!can('gerenciarUsuarios')) {
      toast.error('Você não tem permissão para gerenciar usuários.')
      return
    }
    if (editKey) {
      const res = await updateUsuario(editKey, { nome: nome.trim(), perfil: perfil as Perfil })
      if (!res.ok) {
        toast.error(res.msg)
        return
      }
      toast.success('Usuário atualizado!')
    } else {
      const res = await createUsuario({
        email: email.trim().toLowerCase(),
        nome: nome.trim(),
        perfil: perfil as Perfil,
        senha,
      })
      if (!res.ok) {
        toast.error(res.msg)
        return
      }
      toast.success('Usuário criado!')
    }
    onDone()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="cadUserEmail">E-mail</Label>
        <Input
          id="cadUserEmail"
          type="email"
          autoComplete="off"
          placeholder="usuario@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          readOnly={!!editKey}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="cadUserNome">Nome</Label>
        <Input
          id="cadUserNome"
          maxLength={60}
          placeholder="Nome do usuário"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label>Perfil</Label>
        <Select value={perfil} onValueChange={setPerfil}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERFIS_LIST.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!editKey && (
        <div className="space-y-1">
          <Label htmlFor="cadUserSenha">Senha inicial</Label>
          <Input
            id="cadUserSenha"
            type="password"
            autoComplete="new-password"
            placeholder="mínimo 6 caracteres"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => void handleSave()}>
          {editKey ? 'Salvar alterações' : 'Criar usuário'}
        </Button>
      </DialogFooter>
    </div>
  )
}

export function CadastroDialog({ kind, editKey, onOpenChange }: CadastroDialogProps) {
  const title =
    editKey
      ? kind === 'colab'
        ? 'Editar Colaborador'
        : kind === 'usuario'
          ? 'Editar Usuário'
          : 'Editar Veículo'
      : kind === 'colab'
        ? 'Cadastrar Colaborador'
        : kind === 'usuario'
          ? 'Cadastrar Usuário'
          : 'Cadastrar Veículo'

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {kind === 'colab' && <ColabForm editKey={editKey} onDone={() => onOpenChange(false)} />}
        {kind === 'veiculo' && <VeiculoForm editKey={editKey} onDone={() => onOpenChange(false)} />}
        {kind === 'usuario' && <UsuarioForm editKey={editKey} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}
