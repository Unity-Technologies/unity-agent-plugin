---
name: tilemap-palette-gridpaintingstate
description: Manages Tile Palette painting states. Use when working with Tile Palette painting targets, brushes, palettes, or responding to painting state changes (active Grid Brush, active Target, etc.).
required_packages:
  com.unity.2d.tilemap: ">=1.0.0"
modes: [agent]
---

# Tile Palette Grid Painting State

## Step 0: Confirm you can run C# in the Editor

`GridPaintingState` and `GridPaintPaletteWindow` are Editor-only types that describe the
*live* state of the Tile Palette window. Nothing on disk holds that state, so this skill
needs an Editor it can execute C# in.

**The `unity-cli` skill owns getting you there** — installing the CLI, confirming a connected
Editor, adding the project's `com.unity.pipeline` package, telling a genuinely absent Editor
apart from one stuck in Safe Mode, and discovering the Editor's command catalog. Follow it
first; don't re-derive any of it here.

Two things it can't know for you:

- **You need `eval` in particular**, not just a reachable Editor. Confirm it appears in the
  catalog. Its presence depends on the Pipeline package version, not on the CLI — if it's
  missing, say so and stop.
- **These types live in `UnityEditor.Tilemaps` and some are internal.** `eval` does reach
  them (measured), so use them directly — only fall back to reflection if a compile error
  actually reports a visibility problem.

Run C# through the connected Editor with the `eval` command. Discover its parameter shape
from `unity command --format json` rather than assuming one — the inline form is
`unity command eval --code '<snippet>'`, and some Pipeline versions also register
`eval_file` for running a snippet from a file. **Check the catalog before reaching for
`eval_file`; it is frequently absent.** `unity command` defaults to a 30 second timeout.

## Workflow

### Step 1: Pre-Flight Check
Ensure that the Tile Palette Window is open using:
```csharp
EditorWindow.GetWindow<GridPaintPaletteWindow>();
```

Do not use `MenuItem` patterns to open the Tile Palette Window.

### Step 2: Generate and Execute Script
Create a script using the core pattern, run it through the Editor as described in Step 0,
and report the results.

### Step 3: Validate Results
Check the Unity console for errors and verify changes in the Project window.

### Step 4: Iterate (Max 3 Times)
If errors occur, fix and re-execute. After 3 attempts, **WAIT** for user guidance.

## Reference

**API Reference**: [references/references.md](references/references.md)

## Important Notes

- Always include a pre-flight check in generated scripts.
- Do NOT use `AssetDatabase` patterns for retrieving available assets such as palettes and brushes. Use the existing methods in GridPaintingState to retrieve them.
- Generate standalone snippets only — no `MenuItem`, no `AssetPostprocessor`. Return the
  values you need to read; logs land in the Editor console.
- **Enum assignments:** Always use enum values and cast to numeric types. Never use raw numbers.
    - ✅ Correct: `(int)SpriteAlignment.Center`
    - ❌ Wrong: `1` (magic number)