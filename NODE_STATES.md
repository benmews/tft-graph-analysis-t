# Node State Terminology

This document clarifies the three distinct states that nodes can have in the TFT Graph Analysis Tool.

## The Three States

### 1. **Unselected** (Default State)
- **Definition**: Nodes that are neither selected nor expanded
- **Visual Appearance**: 
  - Standard size (80px for champions, 85px for traits)
  - Subtle gray border with low opacity (0.2)
  - Standard node colors (cost-based for champions, trait colors for traits)
- **User Interaction**: None - these are baseline nodes

### 2. **Selected** (via Sidebar)
- **Definition**: Champions that the user has chosen by clicking the +/- buttons in the "Available Champions" list in the sidebar
- **How to Select**: Click the champion name or +/- button in the sidebar's "Available Champions" section
- **How to Deselect**: 
  - Click the champion again in the sidebar
  - Click the selected champion node in the graph (a graph click toggles selection)
- **Visual Appearance** (CSS class: `.pinned`):
  - **Larger size**: 120px × 120px (125px for traits)
  - **Golden solid border**: 4px thick, color `#f4b740`
  - **Larger font**: 16px (vs 14px default)
- **State Storage**: `selectedChampions` array in App.tsx (stores champion IDs without "champion-" prefix)
- **Purpose**: Marks the user's core team composition that they're building around

### 3. **Expanded** (via "Expand All")
- **Definition**: Nodes (champions OR traits) that have been expanded to reveal their neighbors
- **How to Expand**: Use the **"Expand All"** button in the header. Graph clicks no longer expand — see "Graph Click Behavior" below.
- **How to Collapse**: Use the **"Reset Expansions"** button (clears all expanded nodes)
- **Visual Appearance** (CSS class: `.expanded`):
  - **Same size as unselected** (80px/85px)
  - **Black dotted border**: 4px thick, 100% opacity
  - **Standard node colors**
- **State Storage**: `expandedNodes` array in App.tsx (stores full node IDs including "champion-" or "trait-" prefix)
- **Purpose**: Temporarily reveals neighbors to explore the graph without committing to a team composition

## Important Behavioral Notes

### Priority Rules
- **Selected takes precedence over Expanded**: If a node is in both `selectedChampions` and `expandedNodes`, it displays as Selected (golden border, larger size)
- See `GraphVisualization.tsx` lines 224-228 for the CSS class assignment logic:
  ```typescript
  classes: [
    selectedNodes.includes(node.id) ? 'pinned' : '',
    expandedNodes.includes(node.id) && !selectedNodes.includes(node.id) ? 'expanded' : '',
  ]
  ```

### Graph Click Behavior
- **Champion node**: a click toggles it **selected ↔ unselected** (no longer expands)
- **Trait node**: a click toggles it as an **opponent trait ↔ unselected** (no longer expands)
- A click also drops the node from any prior expanded state, so the toggle stays an unambiguous two-state cycle
- This is handled by the `handleNodeClick` function in `App.tsx` (around line 91)

### State Reset
- **"Reset Expansions" button**: Clears only `expandedNodes`, keeps `selectedChampions`
- **"Reset All" button**: Clears both `expandedNodes` AND `selectedChampions`

## Code References

### App.tsx
- **Line 18**: `selectedChampions` state - IDs of champions selected via sidebar or a champion graph click
- **Line 19**: `expandedNodes` state - IDs of nodes expanded via the "Expand All" button
- **Line 20**: `opponentTraits` state - IDs of trait nodes marked as opponent via a trait graph click
- **~Line 91**: `handleNodeClick` - Toggles selection (champions) / opponent (traits) on graph clicks
- **~Lines 113-114**: `handleResetExpansions` and `handleResetAll` - Reset functions

### GraphVisualization.tsx
- **Lines 99-108**: `.pinned` class styles (selected nodes)
- **Lines 119-126**: `.expanded` class styles (expanded nodes)
- **Lines 224-228**: Class assignment logic showing priority rules
- **Lines 302-310**: Dynamic class updates when state changes

## Visual Summary

```
Unselected:  [80px, thin gray border, 14px font]
Selected:    [120px, thick GOLDEN border, 16px font] ← Selected via SIDEBAR
Expanded:    [80px, thick BLACK DOTTED border, 14px font] ← Expanded via GRAPH CLICK
```

## User Mental Model

Think of it this way:
- **Champion graph click / sidebar selection** = "This is MY team" → Golden, prominent, persistent
- **Trait graph click** = "An opponent is contesting this trait" → opponent highlight
- **"Expand All"** = "Show me the whole neighborhood" → Dotted border, broad exploration
- **Unselected** = Everything else
