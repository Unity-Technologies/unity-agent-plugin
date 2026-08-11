---
name: auto-wire-asset
description: Automatically wire generated assets into Unity components, set up Animator Controllers, fit Collider2D to sprite bounds, and configure Rigidbody2D physics. ONLY use when the user explicitly asks to wire, attach, or connect a specific generated asset to a component or scene object (e.g., "wire the generated sprite", "attach the sound to the audio source", "add the new material to the model"). Do NOT use for general questions about Unity component setup or prefab configuration that do not involve a specific generated asset.
modes: [agent, ask]
---

Automatically wire generated assets into the user's project.


## Performance Notes
- Take your time to do this thoroughly.
- Quality is more important than speed.

## Workflow Prerequisite

Before wiring any asset:

1. **The asset must already exist.** This skill wires existing generated assets into Unity components — it does not generate new assets. If the asset doesn't exist yet, generation must happen first in a separate step.

2. **Enumerate before acting.** Identify the specific asset and target component before executing any wiring. Do not wire additional assets beyond what the user explicitly requested.

3. **You need a live Editor that can run C#.** Wiring means assigning a serialized reference on a component and registering an undo step — an Editor operation with no safe file-editing equivalent. **The `unity-cli` skill owns getting you there**: installing the CLI, confirming a connected Editor, adding the project's `com.unity.pipeline` package, telling a genuinely absent Editor apart from one stuck in Safe Mode, and discovering the command catalog. You need `eval` in particular, not just a reachable Editor — its presence depends on the Pipeline package version, not on the CLI. If it's unavailable, say so and stop; **do not hand-edit scenes or prefabs to fake a wiring**.

### Passing C# to `eval`

`eval` compiles a **statement block, not a file**. Two consequences, both of which cause a
compile error rather than a warning:

- **No `using` directives.** The compiler reads `using UnityEngine;` as a resource-disposal
  statement and rejects it (`CS0210`).
- **Types must be fully qualified.** A bare `AssetDatabase` or `Volume` does not resolve
  (`CS0246` / `CS0103`), and a bare `Object` is ambiguous with `object` (`CS0104`).

Where a snippet below is written as a file — with usings, for readability, or because it is
meant to be saved into the project — qualify the types before passing it to `eval`.

## Critical Goal

**27% of follow-ups are debugging issues. This should be 0%.**

After wiring, the asset MUST:
- Render correctly in scene
- Have no console errors
- Have no missing references
- Be properly scaled

## 1. Pre-Flight Check

Before wiring any asset:
1. **Identify the asset**: Get the asset path and type (Sprite, Texture2D, AudioClip, AnimationClip, Material, GameObject/Prefab)
2. **Verify it exists**: confirm the asset path resolves — `AssetDatabase.LoadAssetAtPath` through the Editor, or a file check on disk
3. **Understand context**: Check if user mentioned a specific target (component, script, prefab)

## 2. Wiring Strategy by Asset Type

### Sprites/Textures
**Common targets:**
- `SpriteRenderer.sprite` (Sprite)
- `Image.sprite` (UI Image, requires Sprite)
- `RawImage.texture` (UI RawImage, accepts Texture2D)
- `Material` texture properties (_MainTex, _BaseMap, etc.)
- Custom scripts with `Sprite` or `Texture2D` fields

### AudioClips
**Common targets:**
- `AudioSource.clip`
- Custom scripts with `AudioClip` fields

### AnimationClips
**Common targets:**
- `Animator` controller states
- `Animation` component legacy clips
- Custom scripts with `AnimationClip` fields

### Materials
**Common targets:**
- `Renderer.material` / `Renderer.sharedMaterial`
- `SpriteRenderer.material`
- Terrain layers

### Prefabs/GameObjects (3D Models)
**Common targets:**
- Instantiate in scene
- Replace existing placeholder
- Assign to spawn point / prefab reference fields

## 3. Auto-Wiring Workflow

### Step 1: Find Candidate Targets

Run C# through the connected Editor to find components with empty fields matching the asset type.

**Implementation Hint:**
- Use standard Unity APIs like `Object.FindObjectsByType` (e.g., for `SpriteRenderer` or `AudioSource`) or reflection for custom `MonoBehaviour` fields.
- **Return** the candidates and their `GetInstanceID()` from the snippet. Logs land in the Editor console; the returned value is what comes back to you.

### Step 2: Score and Select Best Target

Score candidates based on:
1. **Name similarity** (0.5 weight): "playerSprite" field + "player_sprite.png" = high score
2. **Proximity** (0.3 weight): Same GameObject as generation context = bonus
3. **Component type match** (0.2 weight): SpriteRenderer for Sprite = bonus

You can evaluate these heuristics yourself based on the candidate list.

### Step 3: Execute Wiring

Run C# through the connected Editor to wire the asset to the selected component.

**Implementation Hint:**
- Load the asset using `AssetDatabase.LoadAssetAtPath`.
- Get the target component using `EditorUtility.InstanceIDToObject`.
- CRITICAL: Always use `Undo.RecordObject` before modifying, and `EditorUtility.SetDirty` after assigning the value.
- **`Undo.RecordObject` on its own is not enough here** — through `eval` it produces no undo
  entry. Use the full sequence in "Making a change undoable through `eval`" below.

### Step 4: Prefab Wiring (Special Case)

For prefabs, remember to use `PrefabUtility` in your script to properly modify and save the asset.

**Implementation Hint:**
- Use `PrefabUtility.LoadPrefabContents` to get the prefab root.
- Apply your modifications.
- Save with `PrefabUtility.SaveAsPrefabAsset`.
- Clean up with `PrefabUtility.UnloadPrefabContents`.

### Making a change undoable through `eval`

`Undo.RecordObject` alone does **not** produce an undo entry when the snippet runs through the
Editor's `eval` command (measured: nothing appeared on the undo stack). `RecordObject` takes a
*deferred* snapshot that Unity flushes at the end of an Editor event, and a snippet executed by
the Pipeline server is outside that loop.

Use the explicit group + immediate-snapshot + flush sequence instead, which does not rely on
the event loop:

```csharp
UnityEditor.Undo.IncrementCurrentGroup();
UnityEditor.Undo.SetCurrentGroupName("Wire sprite");     // the label the user will see
var group = UnityEditor.Undo.GetCurrentGroup();

UnityEditor.Undo.RegisterCompleteObjectUndo(target, "Wire sprite");   // immediate, not deferred
// ... make the modification, and for a newly created object:
// UnityEditor.Undo.RegisterCreatedObjectUndo(newObject, "Wire sprite");
UnityEditor.EditorUtility.SetDirty(target);

UnityEditor.Undo.FlushUndoRecordObjects();         // force the snapshot out now
UnityEditor.Undo.CollapseUndoOperations(group);    // one entry, not several

return UnityEditor.Undo.GetCurrentGroupName();     // report the label back to confirm it landed
```

**Verify it landed rather than assuming.** The returned group name tells you the group exists;
to confirm the entry is actually on the stack, have the user check `Edit > Undo <label>` in the
menu — it should read your label.

**If it still doesn't land, fall back to a scoped revert rather than dropping the guarantee.**
Before modifying, read the current value of the field you're about to change and report it with
a one-line snippet that restores it, so reverting is a single command:

```csharp
// captured before the change
var previous = spriteRenderer.sprite;             // report: previous = "Assets/Old.png"
// revert snippet to hand the user:
//   sr.sprite = AssetDatabase.LoadAssetAtPath<Sprite>("Assets/Old.png");
```

Scene and prefab files are text-serialized, so version control is the last resort, not the
first answer — offer the scoped revert before pointing at `git`.

## 4. Sprite-to-Collider Fitting

When wiring sprites to characters with physics components, you **MUST** fit the collider to the actual sprite bounds. The default collider sizes (e.g., `CapsuleCollider2D(1, 1.5)`) are almost never correct for generated sprites.

### Why This Matters

Generated sprites vary wildly in effective size:
- A 512x512 sprite at 100 PPU = 5.12 world units
- The same sprite at 32 PPU = 16 world units
- Transparent padding can make the visible content much smaller than the texture

Using default collider sizes results in:
- Colliders much larger than the visible sprite (character floats above ground)
- Colliders much smaller than the sprite (character clips through platforms)
- Poor gameplay feel requiring manual adjustment

### Automatic Collider Fitting & Advanced Pixel Analysis

After wiring a sprite to a `SpriteRenderer`, check if the GameObject has a `Collider2D` (e.g., `CapsuleCollider2D` or `BoxCollider2D`) and write a snippet to fit it.

**Implementation Hints:**
- **Standard Fitting:** Use `SpriteRenderer.bounds.size` to determine the visible dimensions and apply them to the collider's `size` property. Don't forget `Undo.RecordObject(collider, "Fit collider")` for undo support.
- **Advanced Fitting (Padding):** For sprites with significant transparent padding, temporarily set `TextureImporter.isReadable = true`, iterate through `texture.GetPixels32()` to find the min/max bounds of non-transparent pixels (alpha > 10), and calculate the world-space size using the sprite's `pixelsPerUnit`. Apply these precise dimensions to the collider.

### When to Apply Collider Fitting

Apply collider fitting whenever you:
1. Wire a sprite to a new character GameObject with Collider2D
2. Create a character with `Rigidbody2D` + `Collider2D` components
3. Set up a platformer character from generated sprites
4. Notice the collider size doesn't match the visual sprite

### Collider Fitting Checklist

After fitting, verify:
- [ ] Collider bounds visually match the sprite (enable Gizmos to see)
- [ ] Character stands on ground correctly (not floating or clipping)
- [ ] GroundCheck position updated if present
- [ ] Character can jump and land properly

## 5. Graceful Degradation

If no suitable target is found automatically, provide manual guidance:

1. **List potential targets**: Show components that could accept this asset type
2. **Explain how to wire manually**:
   - "Drag the asset from Project view to the field in Inspector"
   - "Select the GameObject, find the component, assign the field"
3. **Offer to create a component**: "Would you like me to add a SpriteRenderer to hold this sprite?"

Example guidance message:
```
I couldn't find an existing component to wire this sprite to automatically.

**Manual wiring options:**
1. Select a GameObject in the scene
2. Add a SpriteRenderer component (Component > Rendering > Sprite Renderer)
3. Drag 'Assets/GeneratedAssets/my_sprite.png' to the Sprite field

**Or, on request, perform one of:**
- Create a new GameObject with SpriteRenderer and assign the sprite
- Add a SpriteRenderer to an existing GameObject the user specifies
```

## 6. Success Confirmation

After successful wiring:

```
**Asset Wired Successfully**

Asset: player_sprite.png
Target: Player/SpriteRenderer.sprite


The sprite is now visible on the Player object. Undo it with Edit > Undo "Wire sprite".
(If the undo entry didn't land, report the scoped revert snippet instead — see below.)
```

## 7. Animation Controller Setup (Sprite Animations)

When setting up AnimatorControllers for sprite-based characters, use the **exact API names** below. These are commonly hallucinated incorrectly.

### CRITICAL: Correct Unity Animation API Names

| WRONG (Hallucinated) | CORRECT |
|---------------------|---------|
| `AnimatorController.CreateAnimatorControllerAtProjectSpace` | `AnimatorController.CreateAnimatorControllerAtPath` |
| `EditorCurveData` | `EditorCurveBinding` |
| `curveData.type` | `curveBinding.type` |
| `curveData.propertyName` | `curveBinding.propertyName` |

### Required Using Directives

```csharp
using UnityEngine;
using UnityEditor;
using UnityEditor.Animations;  // For AnimatorController, AnimatorState, etc.
using System.Collections.Generic;
```

### Implementation Hints

- Use standard `UnityEditor.Animations` APIs to create your controllers and state machines.
- Add your parameters (e.g., `IsRunning`, `IsGrounded`) and configure state transitions with appropriate conditions and `hasExitTime` settings.
- For sprite animations, use `ObjectReferenceKeyframe` mapped to the `m_Sprite` property. Ensure you set `clip.frameRate` BEFORE creating your keyframes, or the timing will be wrong.
- When using `AddAnyStateTransition`, set `canTransitionToSelf = false` to prevent self-transition loops.

### Common Mistakes to Avoid

1. **Wrong method name**: `CreateAnimatorControllerAtProjectSpace` does NOT exist. Use `CreateAnimatorControllerAtPath`.

2. **Wrong type name**: `EditorCurveData` does NOT exist. Use `EditorCurveBinding`.

3. **Missing frameRate**: Set `clip.frameRate` BEFORE creating keyframes, or keyframe timing will be wrong.

4. **Self-transition loops**: When using `AddAnyStateTransition`, set `canTransitionToSelf = false` to prevent the jump state from constantly re-triggering.

5. **Missing hasExitTime**: Set `hasExitTime = false` for immediate transitions based on conditions.

## 8. Important Notes

- Always use `Undo.RecordObject()` before modifying any object
- Use `EditorUtility.SetDirty()` after modifications
- For prefabs, use `PrefabUtility.LoadPrefabContents()` and `SaveAsPrefabAsset()`
- Check if the scene needs saving after wiring scene objects
- Respect user's project organization - don't move assets unexpectedly
- **Never leave the user with a broken scene**
