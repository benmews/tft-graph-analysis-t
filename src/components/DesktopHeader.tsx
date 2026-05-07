import {
  ArrowsClockwise,
  CaretDoubleLeft,
  CaretDoubleRight,
  Lock,
  Plus,
  TextAa,
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
import type { TFTSet } from '../lib/types'

export type DesktopHeaderProps = {
  currentSet: TFTSet
  fixedLayout: boolean
  useShortLabels: boolean
  sidebarOpen: boolean
  onSetChange: (id: string) => void
  onFixedLayoutToggle: () => void
  onLabelModeToggle: () => void
  onSidebarToggle: () => void
  onExpandAll: () => void
  onResetExpansions: () => void
  onResetAll: () => void
}

export function DesktopHeader({
  currentSet,
  fixedLayout,
  useShortLabels,
  sidebarOpen,
  onSetChange,
  onFixedLayoutToggle,
  onLabelModeToggle,
  onSidebarToggle,
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
          variant={useShortLabels ? 'default' : 'outline'}
          className="h-10 shrink-0 gap-2 text-[0.95rem]"
        >
          <TextAa weight={useShortLabels ? 'fill' : 'regular'} />
          Short labels
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
