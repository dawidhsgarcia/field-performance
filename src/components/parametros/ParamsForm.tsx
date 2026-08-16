import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DEFAULT_PARAMS } from '@/lib/constants'
import { mutateParams } from '@/services/state'
import { useStateStore } from '@/stores/state.store'
import { useAuthStore } from '@/stores/auth.store'
import { DOW } from '@/utils/date'
import type { Params } from '@/types'

interface Draft {
  dayMeta: string[]
  trendWindow: string
  q1: string
  q2: string
  q3: string
  alertTechBelow: string
  alertTechStreak: string
  alertTeamPct: string
  alertTeamStreak: string
  alertProjPct: string
}

function draftFromParams(p: Params): Draft {
  return {
    dayMeta: p.dayMeta.map((v) => String(v)),
    trendWindow: String(p.trendWindow),
    q1: String(p.quartil.q1),
    q2: String(p.quartil.q2),
    q3: String(p.quartil.q3),
    alertTechBelow: String(p.alertTech.below),
    alertTechStreak: String(p.alertTech.streak),
    alertTeamPct: String(p.alertTeam.belowPct),
    alertTeamStreak: String(p.alertTeam.streak),
    alertProjPct: String(p.alertProjection.belowPct),
  }
}

function buildParams(d: Draft): Params {
  return {
    dayMeta: DOW.map((_, i) => parseFloat(d.dayMeta[i]) || DEFAULT_PARAMS.dayMeta[i]),
    trendWindow: parseInt(d.trendWindow) || DEFAULT_PARAMS.trendWindow,
    quartil: {
      q1: parseFloat(d.q1) || DEFAULT_PARAMS.quartil.q1,
      q2: parseFloat(d.q2) || DEFAULT_PARAMS.quartil.q2,
      q3: parseFloat(d.q3) || DEFAULT_PARAMS.quartil.q3,
    },
    alertTech: {
      below: parseFloat(d.alertTechBelow) || DEFAULT_PARAMS.alertTech.below,
      streak: parseInt(d.alertTechStreak) || DEFAULT_PARAMS.alertTech.streak,
    },
    alertTeam: {
      belowPct: parseFloat(d.alertTeamPct) || DEFAULT_PARAMS.alertTeam.belowPct,
      streak: parseInt(d.alertTeamStreak) || DEFAULT_PARAMS.alertTeam.streak,
    },
    alertProjection: { belowPct: parseFloat(d.alertProjPct) || DEFAULT_PARAMS.alertProjection.belowPct },
  }
}

function NumberInput({
  id,
  min,
  max,
  step,
  value,
  onChange,
  disabled,
  unit,
}: {
  id: string
  min: number
  max: number
  step: number
  value: string
  onChange: (v: string) => void
  disabled: boolean
  unit: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        className="w-24"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <span className="text-xs text-muted-foreground">{unit}</span>
    </div>
  )
}

export function ParamsForm() {
  const data = useStateStore((s) => s.data)
  const commit = useStateStore((s) => s.commit)
  const can = useAuthStore((s) => s.can)
  const [draft, setDraft] = useState<Draft>(() => draftFromParams(data?.params ?? DEFAULT_PARAMS))

  const readOnly = !can('salvarParams')

  function patch(key: keyof Draft, value: string) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function patchDayMeta(i: number, value: string) {
    setDraft((d) => ({ ...d, dayMeta: d.dayMeta.map((v, j) => (j === i ? value : v)) }))
  }

  function handleSave() {
    if (!can('salvarParams')) {
      toast.error('Você não tem permissão para alterar parâmetros.')
      return
    }
    commit((s) => mutateParams(s, buildParams(draft)))
    toast.success('Parâmetros salvos com sucesso!')
  }

  function handleReset() {
    if (!can('salvarParams')) {
      toast.error('Você não tem permissão para alterar parâmetros.')
      return
    }
    const defaults = JSON.parse(JSON.stringify(DEFAULT_PARAMS)) as Params
    commit((s) => mutateParams(s, defaults))
    setDraft(draftFromParams(defaults))
    toast.success('Parâmetros restaurados!')
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Meta por dia da semana</CardTitle>
          <CardDescription>
            Pontuação esperada por técnico/dia. Usada no cálculo de meta e % de atingimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {DOW.map((d, i) => (
              <div key={d} className="space-y-1">
                <Label htmlFor={`paramDayMeta${i}`}>{d.charAt(0).toUpperCase() + d.slice(1)}</Label>
                <NumberInput
                  id={`paramDayMeta${i}`}
                  min={0}
                  max={20}
                  step={0.5}
                  value={draft.dayMeta[i]}
                  onChange={(v) => patchDayMeta(i, v)}
                  disabled={readOnly}
                  unit="pts"
                />
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <Label htmlFor="paramTrendWindow">Janela de tendência (projeção)</Label>
            <NumberInput
              id="paramTrendWindow"
              min={2}
              max={30}
              step={1}
              value={draft.trendWindow}
              onChange={(v) => patch('trendWindow', v)}
              disabled={readOnly}
              unit="dias"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Limites dos Quartis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="paramQ1">Q1 (melhor) — acima de</Label>
            <NumberInput
              id="paramQ1"
              min={0}
              max={20}
              step={0.1}
              value={draft.q1}
              onChange={(v) => patch('q1', v)}
              disabled={readOnly}
              unit="pts/dia"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="paramQ2">Q2 (bom) — acima de</Label>
            <NumberInput
              id="paramQ2"
              min={0}
              max={20}
              step={0.1}
              value={draft.q2}
              onChange={(v) => patch('q2', v)}
              disabled={readOnly}
              unit="pts/dia"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="paramQ3">Q3 (regular) — acima de</Label>
            <NumberInput
              id="paramQ3"
              min={0}
              max={20}
              step={0.1}
              value={draft.q3}
              onChange={(v) => patch('q3', v)}
              disabled={readOnly}
              unit="pts/dia"
            />
          </div>
          <p className="text-xs text-muted-foreground">Q4 (alerta) = abaixo de Q3</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Alertas Automáticos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="paramAlertTechBelow">Técnico: abaixo de</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="paramAlertTechBelow"
                type="number"
                min={0}
                max={20}
                step={0.1}
                className="w-24"
                value={draft.alertTechBelow}
                onChange={(e) => patch('alertTechBelow', e.target.value)}
                disabled={readOnly}
              />
              <span className="text-xs text-muted-foreground">pts/dia por</span>
              <Input
                id="paramAlertTechStreak"
                type="number"
                min={1}
                max={30}
                step={1}
                className="w-24"
                value={draft.alertTechStreak}
                onChange={(e) => patch('alertTechStreak', e.target.value)}
                disabled={readOnly}
              />
              <span className="text-xs text-muted-foreground">dia(s) consecutivo(s)</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="paramAlertTeamPct">Equipe: abaixo de</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="paramAlertTeamPct"
                type="number"
                min={0}
                max={100}
                step={1}
                className="w-24"
                value={draft.alertTeamPct}
                onChange={(e) => patch('alertTeamPct', e.target.value)}
                disabled={readOnly}
              />
              <span className="text-xs text-muted-foreground">% da meta por</span>
              <Input
                id="paramAlertTeamStreak"
                type="number"
                min={1}
                max={30}
                step={1}
                className="w-24"
                value={draft.alertTeamStreak}
                onChange={(e) => patch('alertTeamStreak', e.target.value)}
                disabled={readOnly}
              />
              <span className="text-xs text-muted-foreground">dia(s) consecutivo(s)</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="paramAlertProjPct">Projeção: abaixo de</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="paramAlertProjPct"
                type="number"
                min={0}
                max={100}
                step={1}
                className="w-24"
                value={draft.alertProjPct}
                onChange={(e) => patch('alertProjPct', e.target.value)}
                disabled={readOnly}
              />
              <span className="text-xs text-muted-foreground">% da meta</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 lg:col-span-3">
        <Button type="button" onClick={handleSave} disabled={readOnly}>
          Salvar parâmetros
        </Button>
        <Button type="button" variant="ghost" onClick={handleReset} disabled={readOnly}>
          Restaurar padrões
        </Button>
      </div>
    </div>
  )
}
