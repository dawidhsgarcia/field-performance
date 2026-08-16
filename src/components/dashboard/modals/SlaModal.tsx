import { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { activitySlaRows } from '@/utils/rules/kpis'
import { ActivitySlaTable } from './ActivitySlaTable'
import type { Region } from '@/types'

interface SlaModalProps {
  region: Region
  pk: string
  monthLabel: string
  onOpenChange: (open: boolean) => void
}

export function SlaModal({ region, pk, monthLabel, onOpenChange }: SlaModalProps) {
  const rows = useMemo(
    () => activitySlaRows(Object.entries(region.sla?.[pk]?.activitySla || {})),
    [region, pk],
  )

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>OS no Prazo por Atividade — {monthLabel}</DialogTitle>
        </DialogHeader>
        <ActivitySlaTable rows={rows} />
      </DialogContent>
    </Dialog>
  )
}
