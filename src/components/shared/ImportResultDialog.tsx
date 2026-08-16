import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ImportResultDialogProps {
  title: string
  message: string
  onOpenChange: (open: boolean) => void
}

export function ImportResultDialog({ title, message, onOpenChange }: ImportResultDialogProps) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
          {message}
        </pre>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
