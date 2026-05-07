import {
  ArrowsLeftRight,
  ArrowsClockwise,
  Graph,
  Lock,
  Plus,
} from '@phosphor-icons/react'
import { Button } from './ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { tftSets } from '../lib/tft-data'
import type { LayoutMode, TFTSet, VisualizationMode } from '../lib/types'

export type DesktopHeaderProps = {
  currentSet: TFTSet
  mode: VisualizationMode
  layoutMode: LayoutMode
  fixedLayout: boolean
  onSetChange: (id: string) => void
  onModeToggle: () => void
  onLayoutToggle: () => void
  onFixedLayoutToggle: () => void
  onExpandAll: () => void
  onResetExpansions: () => void
  onResetAll: () => void
}

export function DesktopHeader({
  currentSet,
  mode,
  layoutMode,
  fixedLayout,
  onSetChange,
  onModeToggle,
  onLayoutToggle,
  onFixedLayoutToggle,
  onExpandAll,
  onResetExpansions,
  onResetAll,
}: DesktopHeaderProps) {
  return (
    <div className="hidden flex-nowrap items-center gap-2 overflow-x-auto md:flex">
      <Select value={currentSet.id} onValueChange={onSetChange}>
        <SelectTrigger className="w-[180px] shrink-0">
          <SelectValue placeholder="Select TFT Set" />
        </SelectTrigger>
        <SelectContent>
          {tftSets.map((set) => (
            <SelectItem key={set.id} value={set.id}>
              {set.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button onClick={onModeToggle} variant="outline" className="shrink-0 gap-2">
        <ArrowsLeftRight />
        {mode === 'bipartite' ? 'Bipartite' : 'Trait Edges'}
      </Button>

      <Button onClick={onLayoutToggle} variant="outline" className="shrink-0 gap-2">
        <Graph weight="duotone" />
        {layoutMode === 'hierarchical' ? 'Hierarchical' : 'Spring'}
      </Button>

      <Button
        onClick={onFixedLayoutToggle}
        variant={fixedLayout ? 'default' : 'outline'}
        className="shrink-0 gap-2"
      >
        <Lock weight={fixedLayout ? 'fill' : 'regular'} />
        Fixed Layout
      </Button>

      <Button onClick={onExpandAll} variant="outline" className="shrink-0 gap-2">
        <Plus weight="bold" />
        Expand All
      </Button>
      <Button onClick={onResetExpansions} variant="outline" className="shrink-0 gap-2">
        <ArrowsClockwise />
        Reset Expansions
      </Button>
      <Button onClick={onResetAll} variant="outline" className="shrink-0 gap-2">
        <ArrowsClockwise weight="bold" />
        Reset All
      </Button>
    </div>
  )
}
