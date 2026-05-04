import { useState, useMemo } from 'react'
import { GraphVisualization } from './components/GraphVisualization'
import { tftSets, set13, set14 } from './lib/tft-data'
import { generateBipartiteGraph, generateTraitEdgeGraph, findNeighbors } from './lib/graph-utils'
import { VisualizationMode, GraphNode, GraphEdge, TFTSet } from './lib/types'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { Switch } from './components/ui/switch'
import { Badge } from './components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select'
import { 
  ArrowsLeftRight, 
  MagnifyingGlass, 
  Sparkle, 
  Graph,
  Plus,
  Minus,
  ArrowsClockwise
} from '@phosphor-icons/react'

function App() {
  const [currentSet, setCurrentSet] = useState<TFTSet>(set14)
  const [mode, setMode] = useState<VisualizationMode>('bipartite')
  const [selectedChampions, setSelectedChampions] = useState<string[]>(['ahri', 'ashe'])
  const [expandedNodes, setExpandedNodes] = useState<string[]>([])
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  const { nodes: allNodes, edges: allEdges } = useMemo(() => {
    if (mode === 'bipartite') {
      return generateBipartiteGraph(currentSet, selectedChampions)
    } else {
      return generateTraitEdgeGraph(currentSet, selectedChampions)
    }
  }, [mode, selectedChampions, currentSet])

  const visibleNodes = useMemo(() => {
    if (expandedNodes.length === 0 && selectedChampions.length === 0) {
      return allNodes.slice(0, 15)
    }

    const visible = new Set<string>()
    
    selectedChampions.forEach((champId) => {
      const nodeId = `champion-${champId}`
      visible.add(nodeId)
      
      const neighbors = findNeighbors(nodeId, allEdges, 1)
      neighbors.forEach((n) => visible.add(n))
    })

    expandedNodes.forEach((nodeId) => {
      visible.add(nodeId)
      const neighbors = findNeighbors(nodeId, allEdges, 1)
      neighbors.forEach((n) => visible.add(n))
    })

    return allNodes.filter((node) => visible.has(node.id))
  }, [allNodes, allEdges, selectedChampions, expandedNodes])

  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id))
    return allEdges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    )
  }, [visibleNodes, allEdges])

  const handleNodeClick = (nodeId: string) => {
    setExpandedNodes((prev) => {
      if (prev.includes(nodeId)) {
        return prev.filter((id) => id !== nodeId)
      }
      return [...prev, nodeId]
    })
  }

  const handleReset = () => {
    const defaultChampions = currentSet.id === 'set13' ? ['powder', 'vander'] : ['ahri', 'ashe']
    setSelectedChampions(defaultChampions)
    setExpandedNodes([])
  }

  const handleSetChange = (setId: string) => {
    const newSet = tftSets.find((s) => s.id === setId)
    if (newSet) {
      setCurrentSet(newSet)
      const defaultChampions = setId === 'set13' ? ['powder', 'vander'] : ['ahri', 'ashe']
      setSelectedChampions(defaultChampions)
      setExpandedNodes([])
    }
  }

  const handleModeToggle = (checked: boolean) => {
    setMode(checked ? 'traits-as-edges' : 'bipartite')
  }

  const selectedChampionNodes = visibleNodes.filter((node) => 
    node.type === 'champion' && selectedChampions.includes(node.id.replace('champion-', ''))
  )

  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="flex-1 p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Graph size={32} className="text-accent" weight="duotone" />
            <h1 className="text-3xl font-bold tracking-tight">TFT Graph Analysis</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={currentSet.id} onValueChange={handleSetChange}>
              <SelectTrigger className="w-[240px]">
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

            <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border">
              <span className="text-sm text-muted-foreground">Bipartite</span>
              <Switch 
                checked={mode === 'traits-as-edges'} 
                onCheckedChange={handleModeToggle}
              />
              <span className="text-sm text-muted-foreground">Trait Edges</span>
            </div>
            
            <Button 
              onClick={handleReset}
              variant="outline"
              className="gap-2"
            >
              <ArrowsClockwise />
              Reset
            </Button>
          </div>
        </div>

        <div className="flex-1 rounded-lg overflow-hidden">
          <GraphVisualization
            nodes={visibleNodes}
            edges={visibleEdges}
            mode={mode}
            onNodeClick={handleNodeClick}
            onNodeHover={setHoveredNode}
            selectedNodes={selectedChampions.map((id) => `champion-${id}`)}
            expandedNodes={expandedNodes}
          />
        </div>

        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{visibleNodes.length} nodes</span>
                <span>•</span>
                <span className="font-mono">{visibleEdges.length} edges</span>
                <span>•</span>
                <span>{mode === 'bipartite' ? 'Bipartite Graph' : 'Trait Edge Graph'}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Click nodes to expand neighbors • Scroll to zoom • Drag to pan
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-96 bg-card border-l border-border p-6 flex flex-col gap-4 overflow-y-auto">
        <div>
          <h2 className="text-xl font-semibold mb-4">Controls</h2>
          <Tabs defaultValue="explore" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="explore" className="gap-2">
                <MagnifyingGlass size={16} />
                Explore
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-2">
                <Sparkle size={16} />
                Insights
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="explore" className="space-y-4 mt-4">
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
                          className="flex items-center justify-between p-2 bg-secondary/50 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{node.label}</span>
                            <Badge variant="outline" className="font-mono text-xs">
                              {champion?.cost}g
                            </Badge>
                          </div>
                          <div className="flex gap-1">
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
                    <p className="text-sm text-muted-foreground">
                      No champions selected
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Available Champions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 max-h-96 overflow-y-auto">
                  {currentSet.champions.map((champion) => {
                    const isSelected = selectedChampions.includes(champion.id)
                    return (
                      <button
                        key={champion.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedChampions((prev) =>
                              prev.filter((id) => id !== champion.id)
                            )
                          } else {
                            setSelectedChampions((prev) => [...prev, champion.id])
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded transition-colors ${
                          isSelected
                            ? 'bg-selected/20 border border-selected'
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
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="insights" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get AI-powered suggestions for optimal trait combinations and synergies.
                  </p>
                  <Button className="w-full gap-2" disabled>
                    <Sparkle weight="fill" />
                    Analyze Current Team
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Coming soon
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Champions</span>
                    <span className="font-mono font-semibold">{currentSet.champions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Traits</span>
                    <span className="font-mono font-semibold">{currentSet.traits.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visible Nodes</span>
                    <span className="font-mono font-semibold">{visibleNodes.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expanded Nodes</span>
                    <span className="font-mono font-semibold">{expandedNodes.length}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default App