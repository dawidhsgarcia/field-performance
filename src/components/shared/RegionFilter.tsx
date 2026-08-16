import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ALL_REGION } from '@/lib/constants'
import { useStateStore } from '@/stores/state.store'

export function RegionFilter() {
  const data = useStateStore((s) => s.data)
  const setRegion = useStateStore((s) => s.setRegion)

  if (!data) return null

  return (
    <Select value={data.currentRegion} onValueChange={setRegion}>
      <SelectTrigger className="w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_REGION}>Todas as regiões</SelectItem>
        {Object.keys(data.regions).map((rid) => (
          <SelectItem key={rid} value={rid}>
            {data.regions[rid].name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
