export function quartilTextClass(q: number | null): string {
  switch (q) {
    case 1:
      return 'text-success-dark'
    case 2:
      return 'text-q2-dark'
    case 3:
      return 'text-warning-dark'
    case 4:
      return 'text-danger'
    default:
      return 'text-muted-foreground'
  }
}

export function quartilBadgeClass(q: number | null): string {
  switch (q) {
    case 1:
      return 'bg-success/15 text-success-dark'
    case 2:
      return 'bg-q2/15 text-q2-dark'
    case 3:
      return 'bg-warning/15 text-warning-dark'
    case 4:
      return 'bg-danger/15 text-danger'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function quartilBarClass(q: number | null): string {
  switch (q) {
    case 1:
      return 'bg-success-dark'
    case 2:
      return 'bg-q2'
    case 3:
      return 'bg-warning'
    case 4:
      return 'bg-danger'
    default:
      return 'bg-muted'
  }
}