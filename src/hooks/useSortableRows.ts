import { useState } from 'react'

export function useSortableRows<K extends string>(initialKey: K, initialDir: -1 | 1 = -1) {
  const [sortKey, setSortKey] = useState<K>(initialKey)
  const [sortDir, setSortDir] = useState<-1 | 1>(initialDir)

  const toggleSort = (key: K) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1))
    } else {
      setSortKey(key)
      setSortDir(key === 'dataFechamento' ? -1 : 1)
    }
  }

  return { sortKey, sortDir, toggleSort }
}
