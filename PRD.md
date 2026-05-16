# TFT Graph Analysis Tool

An interactive graph visualization tool for analyzing champion-trait relationships in Teamfight Tactics, helping players discover optimal trait combinations, plan progression paths, and identify uncontested champion pools.

**Experience Qualities**:
1. **Explorative** - Users should feel empowered to discover hidden synergies through intuitive graph navigation and expansion
2. **Strategic** - The interface should surface actionable insights about trait optimization and champion availability
3. **Responsive** - All interactions (node expansion, layout changes, filtering) must feel immediate and fluid

**Complexity Level**: Complex Application (advanced functionality, likely with multiple views)
The tool combines graph theory algorithms, real-time layout calculations, multiple visualization modes, state management for player selections and opponent tracking, and AI-assisted path finding - all requiring sophisticated interaction patterns.

## Essential Features

### Interactive Graph Visualization
- **Functionality**: Display champions and traits as an interactive node-link diagram with expand/collapse capability
- **Purpose**: Allow users to explore champion-trait relationships beyond immediate neighbors to find optimal synergy circles
- **Trigger**: User selects initial champions or loads a team composition
- **Progression**: Select champions → Graph renders with immediate neighbors → Click champion nodes to select / trait nodes to mark as opponent (or use "Expand All" to reveal the whole neighborhood) → Layout adjusts smoothly → Repeat to explore deeper connections → Pin important nodes
- **Success criteria**: Users can navigate from any champion to discover all reachable trait combinations within 3 clicks; layout remains readable with up to 30 visible nodes

### Bipartite vs Edge-Toggle Visualization
- **Functionality**: Switch between two graph modes: champions↔traits as separate node types, or traits represented as edges between champions
- **Purpose**: Provide multiple mental models for understanding the same data structure
- **Trigger**: Toggle button in toolbar
- **Progression**: Click toggle → Graph smoothly transitions to alternate layout → Node/edge styling updates → Interactions adapt to new mode
- **Success criteria**: Mode switch completes in <500ms with smooth animation; all exploration features work in both modes

### Champion Progression Path Analysis
- **Functionality**: Visualize how team composition can transition from early-game (low-cost) to late-game (high-cost) champions
- **Purpose**: Help players plan their trait evolution across game rounds
- **Trigger**: User marks current team and desired end-game team
- **Progression**: Select current champions → Select target champions → System highlights transition paths → User explores intermediate states → Identifies critical pivot points
- **Success criteria**: Shows at least 2 viable transition paths; clearly indicates which traits remain active during transitions

### Opponent Contestedness Tracking
- **Functionality**: Input opponents' champion/trait choices to identify least-contested areas of the graph
- **Purpose**: Increase roll probability by targeting uncontested champion pools
- **Trigger**: User enters opponent team compositions
- **Progression**: Input opponent picks → Graph nodes update with contestedness heat map → Filter shows "cold" zones → User adjusts strategy
- **Success criteria**: Visual heat map clearly distinguishes highly-contested vs open pools; updates in real-time as user modifies opponent data

### AI-Assisted Path Discovery
- **Functionality**: Use LLM to suggest optimal trait combinations and champion sequences
- **Purpose**: Surface non-obvious synergies that human analysis might miss
- **Trigger**: User requests suggestions for their current board state
- **Progression**: User clicks "Analyze" → AI evaluates current champions + available options → Returns ranked suggestions with reasoning → User can visualize each suggestion on graph
- **Success criteria**: Provides 3-5 actionable suggestions within 2 seconds; reasoning is clear and strategically sound

## Edge Case Handling
- **Empty Graph State**: Show tutorial overlay with sample team to explore
- **3-Trait Champions**: Bipartite mode displays 3 edges; edge mode shows champion on multiple trait paths
- **Circular Trait Dependencies**: Layout algorithm prevents edge overlapping; uses hierarchical arrangement where possible
- **Large Graph Rendering**: Auto-hide distant nodes (>3 hops); show edge count indicators; implement virtualization for 100+ nodes
- **Invalid Opponent Data**: Graceful validation with inline error messages; allow partial data entry
- **No Viable Paths**: AI suggests fallback strategies; graph shows why constraints are impossible

## Design Direction
The design should evoke the feeling of a tactical war room mixed with constellation mapping - strategic, technical, and explorative. Think dark mode command center aesthetics with vibrant trait-color coding and fluid, physics-based graph animations that feel organic yet precise.

## Color Selection
A dark tactical theme with vibrant trait-specific accent colors that create clear visual hierarchies and make pattern recognition effortless.

- **Primary Color**: Deep navy blue `oklch(0.25 0.05 250)` - Communicates strategic depth and focuses attention on graph content
- **Secondary Colors**: 
  - Cool slate `oklch(0.35 0.02 240)` for UI panels and containers
  - Bright cyan `oklch(0.75 0.15 200)` for selected/active champions
- **Accent Color**: Electric orange `oklch(0.70 0.20 45)` - High-energy CTA color for analysis buttons and important discoveries
- **Foreground/Background Pairings**: 
  - Background (Dark Navy `oklch(0.15 0.03 250)`): Light gray text `oklch(0.95 0 0)` - Ratio 12.8:1 ✓
  - Card (Cool Slate `oklch(0.25 0.02 240)`): White text `oklch(1 0 0)` - Ratio 14.5:1 ✓
  - Accent (Electric Orange `oklch(0.70 0.20 45)`): Dark navy text `oklch(0.15 0.03 250)` - Ratio 8.2:1 ✓
  - Trait Nodes: Use trait-specific colors from TFT (gold, purple, green, etc.) with sufficient contrast against dark backgrounds

## Font Selection
Typography should feel technical and precise like a data analysis tool, with excellent readability for labels and numbers, and clear hierarchy for insights vs raw data.

- **Primary Font**: Space Grotesk - geometric and technical feeling, excellent for graph labels and UI text
- **Monospace Font**: JetBrains Mono - for champion costs, stats, and numerical data

- **Typographic Hierarchy**:
  - H1 (Page Title): Space Grotesk Bold / 32px / tight letter-spacing (-0.02em)
  - H2 (Panel Headers): Space Grotesk SemiBold / 20px / normal letter-spacing
  - Node Labels: Space Grotesk Medium / 14px / normal letter-spacing
  - Body Text: Space Grotesk Regular / 16px / relaxed line-height (1.6)
  - Champion Cost: JetBrains Mono Medium / 12px / tabular-nums
  - Code/Data: JetBrains Mono Regular / 14px / tabular-nums

## Animations
Animations should reinforce the graph's physical nature and make complex state changes comprehensible - smooth node expansion with spring physics, gentle layout adjustments that maintain mental map, and quick micro-interactions for hover states.

- **Node Expansion**: Spring animation (200ms) with slight overshoot when new nodes appear
- **Layout Transitions**: Smooth position interpolation (400ms ease-out) when layout recalculates
- **Mode Toggle**: Crossfade between visualization modes (300ms) with scale transformation
- **Hover States**: Quick highlight (100ms) with subtle glow effect on related nodes
- **Path Highlighting**: Animated path tracing (500ms) along edges when showing progression routes
- **Contestedness Updates**: Color transitions (250ms) when heat map values change

## Component Selection
- **Components**:
  - **Graph Canvas**: Custom Cytoscape.js integration (not shadcn) - primary visualization area taking 70% of viewport
  - **Sidebar**: shadcn Sheet/Sidebar for control panels and champion selection
  - **Tabs**: shadcn Tabs for switching between "Explore", "Progression", "Contestedness", "AI Insights" views
  - **Button**: shadcn Button with Phosphor icons for all actions (expand, collapse, analyze, reset)
  - **Toggle**: shadcn Switch for bipartite/edge mode
  - **Input**: shadcn Input for opponent team entry with autocomplete
  - **Card**: shadcn Card for AI suggestions and path analysis results
  - **Badge**: shadcn Badge for trait labels and cost indicators
  - **Tooltip**: shadcn Tooltip for champion details on hover
  - **Dialog**: shadcn Dialog for champion detail modal
  - **Select**: shadcn Select for choosing TFT set/season data

- **Customizations**:
  - Custom graph interaction layer with click, drag, pan, zoom handlers
  - Custom champion/trait node renderers with SVG icons
  - Custom heat map overlay component for contestedness visualization
  - Custom path visualization component with animated edge highlighting

- **States**:
  - Buttons: Default dark with subtle border, hover with orange glow, active with pressed effect, disabled with 40% opacity
  - Nodes: Default with trait color, hover with scale(1.1) and shadow, selected with thick border, expanded with pulse effect
  - Inputs: Default with subtle border, focus with orange ring, error with red border and shake animation

- **Icon Selection**:
  - Graph (network icon) for main visualization mode
  - MagnifyingGlass for exploration/search
  - Path/ArrowsLeftRight for progression analysis
  - Fire/Flame for contestedness heat
  - Sparkle/MagicWand for AI insights
  - Plus/Minus for expand/collapse nodes
  - Lock for pinned nodes
  - ArrowsClockwise for reset/reload

- **Spacing**:
  - Page padding: p-6 (24px)
  - Panel gaps: gap-4 (16px)
  - Card padding: p-4 (16px)
  - Button padding: px-4 py-2 (16px horizontal, 8px vertical)
  - Section spacing: space-y-6 (24px vertical)
  - Tight groupings: gap-2 (8px)

- **Mobile**:
  - Sidebar collapses to overlay drawer
  - Graph takes full viewport width
  - Tabs become horizontal scrollable strip
  - Node labels reduce font size to 12px
  - Touch targets minimum 44x44px
  - Pinch-to-zoom enabled on graph
  - Bottom sheet for AI suggestions instead of side panel
