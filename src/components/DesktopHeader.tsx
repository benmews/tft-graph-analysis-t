import {
  ArrowsLeftRight,
  ArrowsClockwise,
  CaretDoubleLeft,
  CaretDoubleRight,
  Graph,
  Lock,
  Plus,
  Star,
  TextAa,
  User,
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
  useShortLabels: boolean
  sidebarOpen: boolean
  showUniqueTraits: boolean
  showUniqueChampions: boolean
  onSetChange: (id: string) => void
  onModeToggle: () => void
  onLayoutToggle: () => void
  onFixedLayoutToggle: () => void
  onLabelModeToggle: () => void
  onSidebarToggle: () => void
  onUniqueTraitsToggle: () => void
  onUniqueChampionsToggle: () => void
  onExpandAll: () => void
  onResetExpansions: () => void
  onResetAll: () => void
}

export function DesktopHeader({
  currentSet,
  mode,
  layoutMode,
  fixedLayout,
  useShortLabels,
  sidebarOpen,
  showUniqueTraits,
  showUniqueChampions,
  onSetChange,
  onModeToggle,
  onLayoutToggle,
  onFixedLayoutToggle,
  onLabelModeToggle,
  onSidebarToggle,
  onUniqueTraitsToggle,
  onUniqueChampionsToggle,
  onExpandAll,
  onResetExpansions,
  onResetAll,
}: DesktopHeaderProps) {
  return (
    <div className="hidden items-center gap-2 md:flex">
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto">
        <Select value={currentSet.id} onValueChange={onSetChange}>
        <SelectTrigger className="h-10 w-[180px] shrink-0">
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

      <div aria-hidden="true" className="mx-1 h-8 w-px shrink-0 bg-muted-foreground/30" />

      <Button onClick={onModeToggle} variant="outline" className="h-10 shrink-0 gap-2 text-[0.95rem]">
        <ArrowsLeftRight />
        {mode === 'bipartite' ? 'Bipartite' : 'Trait Edges'}
      </Button>

      <Button onClick={onLayoutToggle} variant="outline" className="h-10 shrink-0 gap-2 text-[0.95rem]">
        <Graph weight="duotone" />
        {layoutMode === 'hierarchical' ? 'Hierarchical' : 'Spring'}
      </Button>

      <Button
        onClick={onFixedLayoutToggle}
        variant={fixedLayout ? 'default' : 'outline'}
        className="h-10 shrink-0 gap-2 text-[0.95rem]"
      >
        <Lock weight={fixedLayout ? 'fill' : 'regular'} />
        Fixed Layout
      </Button>

      <Button
        onClick={onLabelModeToggle}
        variant="outline"
        className="h-10 shrink-0 gap-2 text-[0.95rem]"
      >
        <TextAa weight={useShortLabels ? 'fill' : 'regular'} />
        {useShortLabels ? 'Short labels' : 'Full labels'}
      </Button>

      <Button
        onClick={onUniqueTraitsToggle}
        variant={showUniqueTraits ? 'default' : 'outline'}
        className="h-10 shrink-0 gap-2 text-[0.95rem]"
        title="Toggle visibility of traits with only one champion"
      >
        <Star weight={showUniqueTraits ? 'fill' : 'regular'} />
        Unique traits
      </Button>

      <Button
        onClick={onUniqueChampionsToggle}
        variant={showUniqueChampions ? 'default' : 'outline'}
        className="h-10 shrink-0 gap-2 text-[0.95rem]"
        title="Always show champions whose only traits are unique"
      >
        <User weight={showUniqueChampions ? 'fill' : 'regular'} />
        Unique champions
      </Button>

      <div aria-hidden="true" className="mx-1 h-8 w-px shrink-0 bg-muted-foreground/30" />

      <Button onClick={onExpandAll} variant="outline" className="h-10 shrink-0 gap-2 text-[0.95rem]">
        <Plus weight="bold" />
        Expand All
      </Button>
      <Button onClick={onResetExpansions} variant="outline" className="h-10 shrink-0 gap-2 text-[0.95rem]">
        <ArrowsClockwise />
        Reset Expansions
      </Button>
      <Button onClick={onResetAll} variant="outline" className="h-10 shrink-0 gap-2 text-[0.95rem]">
        <ArrowsClockwise weight="bold" />
        Reset All
      </Button>
      </div>

      <Button
        onClick={onSidebarToggle}
        variant="outline"
        className="h-10 shrink-0 gap-2 text-[0.95rem]"
        aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
      >
        {sidebarOpen ? <CaretDoubleRight /> : <CaretDoubleLeft />}
      </Button>
    </div>
  )
}
