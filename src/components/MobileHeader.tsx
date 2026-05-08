import {
  ArrowsClockwise,
  Eye,
  Graph,
  List,
  Lock,
  MagicWand,
  Plus,
  SlidersHorizontal,
  TextAa,
} from '@phosphor-icons/react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { tftSets } from '../lib/tft-data'
import type { TFTSet } from '../lib/types'

export type MobileHeaderProps = {
  currentSet: TFTSet
  fixedLayout: boolean
  useShortLabels: boolean
  sidebarOpen: boolean
  showUncontested: boolean
  controlsOpen: boolean
  onSetChange: (id: string) => void
  onFixedLayoutToggle: () => void
  onLabelModeToggle: () => void
  onSidebarToggle: () => void
  onTidyLayout: () => void
  onUncontestedToggle: () => void
  onExpandAll: () => void
  onResetExpansions: () => void
  onResetAll: () => void
  onControlsToggle: () => void
}

export function MobileHeader({
  currentSet,
  fixedLayout,
  useShortLabels,
  showUncontested,
  controlsOpen,
  onSetChange,
  onFixedLayoutToggle,
  onLabelModeToggle,
  onTidyLayout,
  onUncontestedToggle,
  onExpandAll,
  onResetExpansions,
  onResetAll,
  onControlsToggle,
}: MobileHeaderProps) {
  return (
    <div className="flex flex-col gap-2 md:hidden">
      <div className="flex items-center gap-2">
        <Graph size={28} className="shrink-0 text-accent" weight="duotone" />
        <h1 className="min-w-0 flex-1 truncate text-xl font-bold tracking-tight">
          TFT Graph Analysis
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="coarse:size-11 shrink-0"
              aria-label="More graph actions"
            >
              <List className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              className="coarse:min-h-11 cursor-pointer"
              onSelect={onExpandAll}
            >
              <Plus weight="bold" className="size-4" />
              Expand all nodes
            </DropdownMenuItem>
            <DropdownMenuItem
              className="coarse:min-h-11 cursor-pointer"
              onSelect={onResetExpansions}
            >
              <ArrowsClockwise className="size-4" />
              Reset expansions
            </DropdownMenuItem>
            <DropdownMenuItem
              className="coarse:min-h-11 cursor-pointer"
              onSelect={onResetAll}
            >
              <ArrowsClockwise weight="bold" className="size-4" />
              Reset all
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="coarse:min-h-11 cursor-pointer"
              onSelect={onFixedLayoutToggle}
            >
              <Lock className="size-4" weight={fixedLayout ? 'fill' : 'regular'} />
              {fixedLayout ? 'Unlock layout' : 'Lock layout'}
            </DropdownMenuItem>
            {!fixedLayout && (
              <DropdownMenuItem
                className="coarse:min-h-11 cursor-pointer"
                onSelect={onTidyLayout}
              >
                <MagicWand className="size-4" />
                Tidy layout
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="coarse:min-h-11 cursor-pointer"
              onSelect={onLabelModeToggle}
            >
              <TextAa className="size-4" weight={useShortLabels ? 'fill' : 'regular'} />
              {useShortLabels ? 'Short labels' : 'Full labels'}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="coarse:min-h-11 cursor-pointer"
              onSelect={onUncontestedToggle}
            >
              <Eye className="size-4" weight={showUncontested ? 'fill' : 'regular'} />
              {showUncontested ? 'Hide uncontested' : 'Show uncontested'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          variant={controlsOpen ? 'default' : 'outline'}
          className="coarse:min-h-11 shrink-0 gap-1.5 px-3"
          onClick={onControlsToggle}
          aria-expanded={controlsOpen}
          aria-controls="mobile-controls-sheet"
        >
          <SlidersHorizontal className="size-5" />
          Controls
        </Button>
      </div>

      <Select value={currentSet.id} onValueChange={onSetChange}>
        <SelectTrigger className="coarse:min-h-11 w-full">
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

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={onFixedLayoutToggle}
          variant={fixedLayout ? 'default' : 'outline'}
          className="coarse:min-h-11 min-w-[4.5rem] flex-1 gap-2 sm:flex-none"
          title="Fixed node positions"
        >
          <Lock weight={fixedLayout ? 'fill' : 'regular'} className="size-5 shrink-0" />
          <span className="truncate">Fixed</span>
        </Button>
      </div>
    </div>
  )
}
