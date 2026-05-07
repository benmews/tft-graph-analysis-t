import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MagnifyingGlass,
  Plus,
  Minus,
  SortAscending,
  Coins,
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

  // Distribute the non-gold tiers across a lightness gradient.
  const blueTiers = breakpoints.length - 1 // last tier is gold
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
}: ControlsPanelProps) {
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
      .sort((a, b) => {
        // Activated first, then by count desc, then alphabetical.
        if (a.isActivated !== b.isActivated) return a.isActivated ? -1 : 1
        return b.count - a.count || a.trait.name.localeCompare(b.trait.name)
      })
  }, [selectedChampionNodes, currentSet])

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter by Cost</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card data-testid="traits-card">
          <CardHeader>
            <CardTitle className="text-base">Traits</CardTitle>
          </CardHeader>
          <CardContent>
            {traitProgress.length > 0 ? (
              <div className="space-y-1.5">
                {traitProgress.map(({ trait, count, breakpoints, isActivated }) => {
                  const tierStyle = getTierStyle(count, breakpoints)
                  return (
                  <div
                    key={trait.id}
                    data-testid={`activated-trait-${trait.id}`}
                    data-activated={isActivated ? 'true' : 'false'}
                    data-tier={tierStyle.tier}
                    className="flex items-center gap-2"
                  >
                    <Badge
                      className="gap-1.5 text-xs"
                      style={tierStyle.style}
                      variant={tierStyle.variant}
                    >
                      <span>{trait.name}</span>
                      <span
                        data-testid={`activated-trait-count-${trait.id}`}
                        className="font-mono font-semibold"
                      >
                        {count}
                      </span>
                    </Badge>
                    <div
                      data-testid={`activated-trait-breakpoints-${trait.id}`}
                      className="flex items-center gap-1 font-mono text-xs"
                      aria-label={`Breakpoints: ${breakpoints.join(', ')}`}
                    >
                      {breakpoints.map((bp) => (
                        <span
                          key={bp}
                          data-active={count >= bp ? 'true' : 'false'}
                          className={
                            count >= bp
                              ? 'font-semibold text-foreground'
                              : 'text-muted-foreground'
                          }
                        >
                          {bp}
                        </span>
                      ))}
                    </div>
                  </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a champion to see traits</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selected Champions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedChampionNodes.length > 0 ? (
              selectedChampionNodes.map((node) => {
                const champion = currentSet.champions.find(
                  (c) => c.id === node.id.replace('champion-', '')
                )
                return (
                  <div
                    key={node.id}
                    className="flex flex-col gap-2 rounded bg-secondary/50 p-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{node.label}</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {champion?.cost}g
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {champion?.traits.map((traitId) => {
                        const trait = currentSet.traits.find((t) => t.id === traitId)
                        return (
                          <Badge
                            key={traitId}
                            className="text-xs"
                            style={{ backgroundColor: trait?.color }}
                          >
                            {trait?.name}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">No champions selected</p>
            )}
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-1 flex-col">
          <CardHeader>
            <CardTitle className="text-base">Available Champions</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
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
              {sortedAndFilteredChampions.map((champion) => {
                const isSelected = selectedChampions.includes(champion.id)
                return (
                  <button
                    key={champion.id}
                    type="button"
                    onClick={() => onToggleChampion(champion.id, !isSelected)}
                    className={`coarse:min-h-11 flex w-full items-center justify-between rounded p-2 transition-colors ${
                      isSelected
                        ? 'border border-selected bg-selected/20'
                        : 'hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <Minus size={16} className="text-selected" weight="bold" />
                      ) : (
                        <Plus size={16} className="text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium">{champion.name}</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {champion.cost}g
                      </Badge>
                    </div>
                  </button>
                )
              })}
              {sortedAndFilteredChampions.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No champions found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
    </div>
  )
}
