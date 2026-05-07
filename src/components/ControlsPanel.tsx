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
import { getChampionColorByCost } from '@/lib/graph-utils'
import { oklchToHex } from '@/lib/color-utils'

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
  return (
    <div className="w-full space-y-4">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available Champions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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

            <div className="max-h-[min(24rem,50dvh)] space-y-1 overflow-y-auto overscroll-contain md:max-h-96">
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
