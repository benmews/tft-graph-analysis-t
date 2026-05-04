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
  - Click the selected champion node in the graph (special case - unselects instead of expanding)
- **Visual Appearance** (CSS class: `.pinned`):
  - **Larger size**: 120px × 120px (125px for traits)
  - **Golden solid border**: 4px thick, color `#f4b740`
  - **Larger font**: 16px (vs 14px default)
- **State Storage**: `selectedChampions` array in App.tsx (stores champion IDs without "champion-" prefix)
- **Purpose**: Marks the user's core team composition that they're building around

### 3. **Expanded** (via Graph Click)
- **Definition**: Nodes (champions OR traits) that the user has clicked on in the graph visualization to reveal their neighbors
- **How to Expand**: Click any node in the graph (except selected champion nodes, which deselect instead)
- **How to Collapse**: Click the expanded node again in the graph
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

### Special Click Behavior for Selected Champions
- When you click a **selected champion node** in the graph, it **deselects** (removes from `selectedChampions`) rather than expanding
- This is handled in `App.tsx` lines 90-95 in the `handleNodeClick` function
- All other nodes toggle their expanded state when clicked

### State Reset
- **"Reset Expansions" button**: Clears only `expandedNodes`, keeps `selectedChampions`
- **"Reset All" button**: Clears both `expandedNodes` AND `selectedChampions`

## Code References

### App.tsx
- **Line 38**: `selectedChampions` state - IDs of champions selected via sidebar
- **Line 40**: `expandedNodes` state - IDs of nodes expanded via graph clicks  
- **Lines 87-103**: `handleNodeClick` - Handles clicks on graph nodes
- **Lines 104-111**: `handleResetExpansions` and `handleResetAll` - Reset functions

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
- **Sidebar selection** = "This is MY team" → Golden, prominent, persistent
- **Graph expansion** = "Let me explore around this node" → Dotted border, temporary investigation
- **Unselected** = Everything else
