import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CaretDown,
  CaretRight,
  Coins,
  MagnifyingGlass,
  Minus,
  Plus,
  SortAscending,
} from '@phosphor-icons/react'
import type { Champion, GraphNode, TFTSet } from '@/lib/types'
import { getTraitBreakpoints } from '@/lib/types'
import { getChampionColorByCost } from '@/lib/graph-utils'
import { oklchToHex } from '@/lib/color-utils'

/**
 * Trait-tier color scheme:
 *   tier === -1 → in-progress  (no fill, slim border)
 *   tier  ===  last → gold      (highest activation, including 1-tier uniques)
 *   else → blue gradient        (light at tier 0, darker as tier rises)
 */
function getTierStyle(count: number, breakpoints: readonly number[]) {
  let tier = -1
  for (let i = 0; i < breakpoints.length; i++) {
    if (count >= breakpoints[i]) tier = i
    else break
  }

  if (tier === -1) {
    return { tier, variant: 'outline' as const, style: undefined }
  }
  if (tier === breakpoints.length - 1) {
    return {
      tier,
      variant: 'default' as const,
      style: { backgroundColor: 'oklch(0.80 0.17 85)', color: 'oklch(0.20 0.06 85)', borderColor: 'transparent' },
    }
  }

  const blueTiers = breakpoints.length - 1
  const t = blueTiers <= 1 ? 0 : tier / (blueTiers - 1)
  const L = 0.78 - 0.33 * t
  const fg = L < 0.6 ? 'oklch(0.99 0 0)' : 'oklch(0.20 0.05 240)'
  return {
    tier,
    variant: 'default' as const,
    style: { backgroundColor: `oklch(${L.toFixed(2)} 0.15 240)`, color: fg, borderColor: 'transparent' },
  }
}

export type ControlsPanelProps = {
  currentSet: TFTSet
  enabledCosts: Set<number>
  onCostToggle: (cost: number) => void
  selectedChampionNodes: GraphNode[]
  filterText: string
  onFilterTextChange: (value: string) => void
  sortBy: 'alphabetical' | 'cost'
  onSortByChange: (value: 'alphabetical' | 'cost') => void
  sortedAndFilteredChampions: Champion[]
  selectedChampions: string[]
  onToggleChampion: (id: string, selected: boolean) => void
  showUniqueTraits: boolean
  showUniqueChampions: boolean
  onUniqueTraitsToggle: () => void
  onUniqueChampionsToggle: () => void
}

function SectionHeader({
  title,
  isOpen,
  onToggle,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <CardHeader>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 text-base leading-none font-semibold"
        aria-expanded={isOpen}
      >
        {isOpen ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
        <span>{title}</span>
      </button>
    </CardHeader>
  )
}

export function ControlsPanel({
  currentSet,
  enabledCosts,
  onCostToggle,
  selectedChampionNodes,
  filterText,
  onFilterTextChange,
  sortBy,
  onSortByChange,
  sortedAndFilteredChampions,
  selectedChampions,
  onToggleChampion,
  showUniqueTraits,
  showUniqueChampions,
  onUniqueTraitsToggle,
  onUniqueChampionsToggle,
}: ControlsPanelProps) {
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [traitsOpen, setTraitsOpen] = useState(true)
  const [championsOpen, setChampionsOpen] = useState(true)

  const traitProgress = useMemo(() => {
    const counts = new Map<string, number>()
    for (const node of selectedChampionNodes) {
      const champion = currentSet.champions.find(
        (c) => c.id === node.id.replace('champion-', ''),
      )
      if (!champion) continue
      for (const traitId of champion.traits) {
        counts.set(traitId, (counts.get(traitId) ?? 0) + 1)
      }
    }
    return [...counts.entries()]
      .map(([traitId, count]) => {
        const trait = currentSet.traits.find((t) => t.id === traitId)
        if (!trait) return null
        const breakpoints = getTraitBreakpoints(trait)
        return { trait, count, breakpoints, isActivated: count >= breakpoints[0] }
      })
      .filter(
        (entry): entry is {
          trait: NonNullable<typeof entry>['trait']
          count: number
          breakpoints: readonly number[]
          isActivated: boolean
        } => !!entry,
      )
      .sort((a, b) => b.count - a.count || a.trait.name.localeCompare(b.trait.name))
  }, [selectedChampionNodes, currentSet])

  const activatedTraits = traitProgress.filter((t) => t.isActivated)
  const inProgressTraits = traitProgress.filter((t) => !t.isActivated)

  const selectedSet = useMemo(() => new Set(selectedChampions), [selectedChampions])
  const selectedRows = useMemo(
    () => sortedAndFilteredChampions.filter((c) => selectedSet.has(c.id)),
    [sortedAndFilteredChampions, selectedSet],
  )
  const unselectedRows = useMemo(
    () => sortedAndFilteredChampions.filter((c) => !selectedSet.has(c.id)),
    [sortedAndFilteredChampions, selectedSet],
  )

  const renderTraitEntry = (
    entry: (typeof traitProgress)[number],
  ) => {
    const tierStyle = getTierStyle(entry.count, entry.breakpoints)
    return (
      <div
        key={entry.trait.id}
        data-testid={`activated-trait-${entry.trait.id}`}
        data-activated={entry.isActivated ? 'true' : 'false'}
        data-tier={tierStyle.tier}
        className="flex items-center gap-1.5"
      >
        <Badge
          className="gap-1 text-xs"
          style={tierStyle.style}
          variant={tierStyle.variant}
        >
          <span>{entry.trait.name}</span>
          <span
            data-testid={`activated-trait-count-${entry.trait.id}`}
            className="font-mono font-semibold"
          >
            {entry.count}
          </span>
        </Badge>
        <div
          data-testid={`activated-trait-breakpoints-${entry.trait.id}`}
          className="flex items-center gap-0.5 font-mono text-xs"
          aria-label={`Breakpoints: ${entry.breakpoints.join(', ')}`}
        >
          {entry.breakpoints.map((bp) => (
            <span
              key={bp}
              data-active={entry.count >= bp ? 'true' : 'false'}
              className={
                entry.count >= bp ? 'font-semibold text-foreground' : 'text-muted-foreground'
              }
            >
              {bp}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const renderChampionRow = (champion: Champion, isSelected: boolean) => (
    <button
      key={champion.id}
      type="button"
      onClick={() => onToggleChampion(champion.id, !isSelected)}
      data-testid={`champion-row-${champion.id}`}
      data-selected={isSelected ? 'true' : 'false'}
      className={`coarse:min-h-11 flex w-full flex-wrap items-center gap-2 rounded p-1.5 text-left transition-colors ${
        isSelected ? 'border border-selected bg-selected/20' : 'hover:bg-secondary/50'
      }`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {isSelected ? (
          <Minus size={14} className="shrink-0 text-selected" weight="bold" />
        ) : (
          <Plus size={14} className="shrink-0 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">{champion.name}</span>
        <Badge variant="outline" className="font-mono text-xs">
          {champion.cost}g
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1">
        {champion.traits.map((traitId) => {
          const trait = currentSet.traits.find((t) => t.id === traitId)
          return (
            <Badge
              key={traitId}
              className="text-xs whitespace-nowrap"
              style={{ backgroundColor: trait?.color }}
            >
              {trait?.name}
            </Badge>
          )
        })}
      </div>
    </button>
  )

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-2">
      <Card>
        <SectionHeader
          title="Filters"
          isOpen={filtersOpen}
          onToggle={() => setFiltersOpen((v) => !v)}
        />
        {filtersOpen && (
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5].map((cost) => (
                <div key={cost} className="flex items-center gap-2">
                  <Checkbox
                    id={`cost-${cost}`}
                    checked={enabledCosts.has(cost)}
                    onCheckedChange={() => onCostToggle(cost)}
                    className="coarse:size-5 border-2"
                  />
                  <Label
                    htmlFor={`cost-${cost}`}
                    className="coarse:min-h-11 coarse:py-2 flex cursor-pointer items-center gap-1.5 text-sm font-medium select-none"
                  >
                    <span
                      data-testid={`cost-swatch-${cost}`}
                      aria-hidden="true"
                      className="inline-block size-3 rounded-full border border-border"
                      style={{ backgroundColor: oklchToHex(getChampionColorByCost(cost)) }}
                    />
                    {cost}g
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filter-unique-traits"
                  checked={showUniqueTraits}
                  onCheckedChange={onUniqueTraitsToggle}
                  className="coarse:size-5 border-2"
                />
                <Label
                  htmlFor="filter-unique-traits"
                  className="coarse:min-h-11 coarse:py-2 cursor-pointer text-sm font-medium select-none"
                >
                  Unique traits
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="filter-unique-champions"
                  checked={showUniqueChampions}
                  onCheckedChange={onUniqueChampionsToggle}
                  className="coarse:size-5 border-2"
                />
                <Label
                  htmlFor="filter-unique-champions"
                  className="coarse:min-h-11 coarse:py-2 cursor-pointer text-sm font-medium select-none"
                >
                  Unique champions
                </Label>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card data-testid="traits-card">
        <SectionHeader
          title="Traits"
          isOpen={traitsOpen}
          onToggle={() => setTraitsOpen((v) => !v)}
        />
        {traitsOpen && (
          <CardContent>
            {traitProgress.length > 0 ? (
              <div className="space-y-1.5">
                {activatedTraits.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    {activatedTraits.map(renderTraitEntry)}
                  </div>
                )}
                {inProgressTraits.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    {inProgressTraits.map(renderTraitEntry)}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a champion to see traits</p>
            )}
          </CardContent>
        )}
      </Card>

      <Card className={championsOpen ? 'flex min-h-0 flex-1 flex-col' : ''}>
        <SectionHeader
          title="Champions"
          isOpen={championsOpen}
          onToggle={() => setChampionsOpen((v) => !v)}
        />
        {championsOpen && (
          <CardContent className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="relative">
              <MagnifyingGlass
                size={18}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Filter champions..."
                value={filterText}
                onChange={(e) => onFilterTextChange(e.target.value)}
                className="coarse:min-h-11 pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => onSortByChange('alphabetical')}
                variant={sortBy === 'alphabetical' ? 'default' : 'outline'}
                className="coarse:min-h-11 flex-1 gap-2"
                size="sm"
              >
                <SortAscending size={16} />
                A-Z
              </Button>
              <Button
                type="button"
                onClick={() => onSortByChange('cost')}
                variant={sortBy === 'cost' ? 'default' : 'outline'}
                className="coarse:min-h-11 flex-1 gap-2"
                size="sm"
              >
                <Coins size={16} />
                Cost
              </Button>
            </div>

            <div className="min-h-[12rem] flex-1 space-y-1 overflow-y-auto overscroll-contain">
              {selectedRows.map((c) => renderChampionRow(c, true))}
              {selectedRows.length > 0 && unselectedRows.length > 0 && (
                <div className="my-2 border-t border-border" />
              )}
              {unselectedRows.map((c) => renderChampionRow(c, false))}
              {sortedAndFilteredChampions.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No champions found
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
