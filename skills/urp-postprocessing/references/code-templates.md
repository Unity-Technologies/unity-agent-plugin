## Code Templates

Each template is a snippet to run through the Editor's `eval` command. Hard stops `throw`,
so the eval fails loudly; anything the caller needs to read is `return`ed.

### Creating a Global Volume with Effects

```csharp
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEditor;

// Verify HDR is enabled on the URP Asset
var urpAsset = UniversalRenderPipeline.asset;
if (urpAsset == null) { throw new System.Exception("No UniversalRenderPipelineAsset active."); }
if (!urpAsset.supportsHDR) { throw new System.Exception("HDR is disabled on the URP Asset. Enable it for Bloom/Tonemapping."); }

var profile = ScriptableObject.CreateInstance<VolumeProfile>();
var assetPath = AssetDatabase.GenerateUniqueAssetPath("Assets/Settings/PostProcessProfile.asset");
AssetDatabase.CreateAsset(profile, assetPath);

// MUST set overrideState = true on each property
var bloom = profile.Add<Bloom>();
bloom.threshold.overrideState = true;
bloom.threshold.value = 0.9f;
bloom.intensity.overrideState = true;
bloom.intensity.value = 1f;
bloom.scatter.overrideState = true;
bloom.scatter.value = 0.7f;

var tonemapping = profile.Add<Tonemapping>();
tonemapping.mode.overrideState = true;
tonemapping.mode.value = TonemappingMode.ACES;

var volumeObj = new GameObject("Global Volume");
var volume = volumeObj.AddComponent<Volume>();
volume.isGlobal = true;
volume.profile = profile;

Undo.RegisterCreatedObjectUndo(volumeObj, "Create Global Volume");
EditorUtility.SetDirty(profile);
AssetDatabase.SaveAssets();

return "Created Global Volume with Bloom and ACES Tonemapping.";
```

### Enabling Post-Processing on Camera

```csharp
using UnityEngine;
using UnityEngine.Rendering.Universal;

var cam = Camera.main;
if (cam == null) { throw new System.Exception("No Main Camera found."); }

if (!cam.TryGetComponent<UniversalAdditionalCameraData>(out var data)) { throw new System.Exception("Missing UniversalAdditionalCameraData. Is URP active?"); }

UnityEditor.Undo.RecordObject(data, "Enable Post-Processing");
data.renderPostProcessing = true;
UnityEditor.EditorUtility.SetDirty(data);
return $"Post-processing enabled on '{cam.name}'.";
```

### Modifying an Existing Volume Profile

```csharp
var volumeObj = GameObject.Find("Global Volume");
if (volumeObj != null && volumeObj.TryGetComponent<Volume>(out var volume) && volume.profile != null)
{
    if (volume.profile.TryGet<Bloom>(out var bloom))
    {
bloom.intensity.overrideState = true;
bloom.intensity.value = 2f;
    }
    EditorUtility.SetDirty(volume.profile);
}
```

### Making a change undoable through `eval`

`Undo.RecordObject` alone does **not** produce an undo entry when the snippet runs through the
Editor's `eval` command (measured: nothing appeared on the undo stack). `RecordObject` takes a
*deferred* snapshot that Unity flushes at the end of an Editor event, and a snippet executed by
the Pipeline server is outside that loop.

Use the explicit group + immediate-snapshot + flush sequence instead, which does not rely on
the event loop:

```csharp
using UnityEditor;

Undo.IncrementCurrentGroup();
Undo.SetCurrentGroupName("Set up post-processing");          // this is the label the user will see
var group = Undo.GetCurrentGroup();

Undo.RegisterCompleteObjectUndo(target, "Set up post-processing");   // immediate, not deferred
// ... make the modification, and for a newly created object:
// Undo.RegisterCreatedObjectUndo(newObject, "Set up post-processing");
EditorUtility.SetDirty(target);

Undo.FlushUndoRecordObjects();                    // force the snapshot out now
Undo.CollapseUndoOperations(group);               // one entry, not several

return Undo.GetCurrentGroupName();                // report the label back to confirm it landed
```

**Verify it landed rather than assuming.** The returned group name tells you the group exists;
to confirm the entry is actually on the stack, have the user check `Edit > Undo <label>` in the
menu — it should read your label.

**If it still doesn't land, fall back to a scoped revert rather than dropping the guarantee.**
Before modifying, read the current value of the field you're about to change and report it with
a one-line snippet that restores it, so reverting is a single command:

```csharp
// captured before the change
var previous = data.renderPostProcessing;         // report: previous = false
// revert snippet to hand the user:
//   data.renderPostProcessing = false;
```

Scene and prefab files are text-serialized, so version control is the last resort, not the
first answer — offer the scoped revert before pointing at `git`.
