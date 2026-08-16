import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { IndisTable } from './IndisTable'
import type { TeamOverview } from '@/types'

interface IndisModalProps {
  overview: TeamOverview
  monthLabel: string
  onOpenChange: (open: boolean) => void
}

export function IndisModal({ overview, monthLabel, onOpenChange }: IndisModalProps) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Indisponibilidade Técnica — {monthLabel}</DialogTitle>
        </DialogHeader>
        <IndisTable overview={overview} />
      </DialogContent>
    </Dialog>
  )
}
