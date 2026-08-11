# GridPaintingState Public API

`GridPaintingState` is a `ScriptableSingleton<GridPaintingState>` in `UnityEditor.Tilemaps` that controls the state of objects for painting with a Tile Palette.

**Source:** `Packages/com.unity.2d.tilemap/Editor/GridPaintingState.cs`

## Events

All events are static and can be subscribed to for monitoring painting state changes.

| Event | Type | Description |
|-------|------|-------------|
| `scenePaintTargetChanged` | `Action<GameObject>` | Fired when the active paint target changes |
| `scenePaintTargetEdited` | `Action<GameObject>` | Fired when the active paint target is edited |
| `brushChanged` | `Action<GridBrushBase>` | Fired when the active brush changes |
| `brushPickChanged` | `Action` | Fired when the brush's selection changes |
| `brushPickStoreChanged` | `Action` | Fired when the brush pick store changes |
| `brushToolsChanged` | `Action` | Fired when brush tools change |
| `beforePaletteChanged` | `Action` | Fired before the active palette changes |
| `paletteChanged` | `Action<GameObject>` | Fired when the active palette changes |
| `palettesChanged` | `Action` | Fired when the list of palettes changes |
| `validTargetsChanged` | `Action` | Fired when valid paint targets change |
| `editModeChanged` | `Action` | Fired when edit mode state changes |

**Example - Subscribing to events:**
```csharp
void OnEnable()
{
    GridPaintingState.scenePaintTargetChanged += OnTargetChanged;
    GridPaintingState.brushChanged += OnBrushChanged;
}

void OnDisable()
{
    GridPaintingState.scenePaintTargetChanged -= OnTargetChanged;
    GridPaintingState.brushChanged -= OnBrushChanged;
}

void OnTargetChanged(GameObject newTarget)
{
    Debug.Log($"Paint target changed to: {newTarget?.name}");
}

void OnBrushChanged(GridBrushBase newBrush)
{
    Debug.Log($"Brush changed to: {newBrush?.name}");
}
```

## Properties

### Paint Target

| Property | Type | Access | Description |
|----------|------|--------|-------------|
| `scenePaintTarget` | `GameObject` | get/set | The currently active painting target in the scene |
| `validTargets` | `GameObject[]` | get | All valid GameObjects that can be set as paint targets |

### Brush

| Property | Type | Access | Description |
|----------|------|--------|-------------|
| `gridBrush` | `GridBrushBase` | get/set | The currently active brush for painting |
| `brushes` | `IList<GridBrushBase>` | get | All available brushes |
| `brushPickStore` | `GridBrushPickStore` | get | Store of brush selection data for the current brush |
| `activeBrushEditor` | `GridBrushEditorBase` | get | The editor for the active brush |

### Palette

| Property | Type | Access | Description |
|----------|------|--------|-------------|
| `palette` | `GameObject` | get/set | The currently active palette GameObject |
| `palettes` | `IList<GameObject>` | get | All available palette GameObjects |
| `isPaletteEditable` | `bool` | get | Whether the active palette can be edited (false for model prefabs) |

### State

| Property | Type | Access | Description |
|----------|------|--------|-------------|
| `isEditing` | `bool` | get | Whether GridPaintingState is active for editing |
| `lastSceneViewMousePosition` | `Vector2` | get | Last mouse position on SceneView when painting is active |
| `lastSceneViewGridPosition` | `Vector3Int` | get | Last grid position on SceneView when painting is active |

## Methods

### IsPartOfActivePalette

```csharp
public static bool IsPartOfActivePalette(GameObject target)
```

Checks if a GameObject is part of the active palette.

**Parameters:**
- `target`: The GameObject to check

**Returns:** `true` if the target is part of the active palette, `false` otherwise

**Example:**
```csharp
if (GridPaintingState.IsPartOfActivePalette(selectedObject))
{
    Debug.Log("Selected object is part of the active palette");
}
```

### SetPickOnActiveGridBrush

```csharp
public static void SetPickOnActiveGridBrush(bool user, int index)
```

Retrieves a stored selection from the current `GridBrushPickStore` and copies it into the active `GridBrush`.

**Parameters:**
- `user`: If `true`, uses user-saved selections; if `false`, uses last-saved selections
- `index`: Index of the selection in the store to apply

**Example:**
```csharp
// Apply the first user-saved brush selection
GridPaintingState.SetPickOnActiveGridBrush(user: true, index: 0);

// Apply the second automatically-saved brush selection
GridPaintingState.SetPickOnActiveGridBrush(user: false, index: 1);
```

## Common Usage Patterns

### Setting up a custom paint target

```csharp
// Get available targets
GameObject[] targets = GridPaintingState.validTargets;
if (targets != null && targets.Length > 0)
{
    // Set the first valid target
    GridPaintingState.scenePaintTarget = targets[0];
}
```

### Changing the active brush

```csharp
// Get available brushes
IList<GridBrushBase> availableBrushes = GridPaintingState.brushes;
foreach (var brush in availableBrushes)
{
    if (brush is MyCustomBrush)
    {
        GridPaintingState.gridBrush = brush;
        break;
    }
}
```

### Changing the active palette

```csharp
// Get available palettes
IList<GameObject> availablePalettes = GridPaintingState.palettes;
if (availablePalettes.Count > 0)
{
    // Setting an invalid palette throws ArgumentException
    GridPaintingState.palette = availablePalettes[0];
}
```

### Monitoring edit state

```csharp
void Update()
{
    if (GridPaintingState.isEditing)
    {
        Vector3Int gridPos = GridPaintingState.lastSceneViewGridPosition;
        // Use grid position for custom visualization or logic
    }
}
```

## Related Types

- `GridBrushBase` - Base class for all tile brushes
- `GridBrush` - Default tile brush implementation
- `GridBrushEditorBase` - Base class for brush editors
- `GridBrushPickStore` - Stores brush selection history
- `GridPalettes` - Manages available palettes (`GridPalettes.palettes`)
- `GridPaletteBrushes` - Manages available brushes (`GridPaletteBrushes.brushes`)