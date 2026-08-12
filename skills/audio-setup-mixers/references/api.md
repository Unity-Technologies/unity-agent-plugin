## Architecture: what is public and what is not

Every `AudioMixer` in the Editor is really an `AudioMixerController`, and every `AudioMixerGroup` is
an `AudioMixerGroupController`. Those two controller types are **internal** to `UnityEditor.Audio`,
so naming either one in an `eval` snippet fails to compile:

```
CS0122: 'AudioMixerController' is inaccessible due to its protection level
```

What matters is that this only affects **authoring**. Both controllers derive from public runtime
types — `AudioMixerController : UnityEngine.Audio.AudioMixer` and
`AudioMixerGroupController : UnityEngine.Audio.AudioMixerGroup` — so loading, enumerating, and
assigning all work through the public API with no reflection at all. Reflection is needed for
exactly five members, listed below.

Measured on 6000.5.7f1: creating a mixer, adding a group, parenting it, changing a volume, saving,
and reloading from disk all succeed through this split, and the reloaded asset keeps its group
structure. Do not reach for a hand-written `.mixer` file as a substitute — the authoring calls
build the asset's subassets for you, and `CreateNewGroup`'s `storeUndoState` argument is what
registers the undo step.

| Operation | Route |
|---|---|
| Find mixers in the project | public — `AssetDatabase` + `UnityEngine.Audio.AudioMixer` |
| Enumerate a mixer's groups | public — `AudioMixer.FindMatchingGroups` |
| Assign a group to an Audio Source | public — `AudioSource.outputAudioMixerGroup` |
| Create a mixer asset | **reflection** — `CreateMixerControllerAtPath` |
| Read the master group | **reflection** — `masterGroup` |
| Create a group | **reflection** — `CreateNewGroup` |
| Parent a group | **reflection** — `AddChildToParent` |
| Read or write a group volume | **reflection** — `GetValueForVolume` / `SetValueForVolume` |

All snippets below are written for `unity command eval --code '<snippet>'`: fully qualified, no
`using` directives, returning their result rather than logging it.

## Reflection preamble

`eval` runs each snippet in a fresh scope, so put this at the top of any snippet that needs an
authoring call. It carries no dependency on the internal types being nameable.

```csharp
var flags = System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic
          | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Static;
var mixerType = System.Type.GetType("UnityEditor.Audio.AudioMixerController, UnityEditor");
var groupType = System.Type.GetType("UnityEditor.Audio.AudioMixerGroupController, UnityEditor");
if (mixerType == null || groupType == null) { return "audio mixer authoring types not found"; }
```

## Finding existing Audio Mixers — public, no reflection

```csharp
var guids = UnityEditor.AssetDatabase.FindAssets("t:AudioMixer");
var rows = new System.Collections.Generic.List<string>();
foreach (var guid in guids)
{
    var path = UnityEditor.AssetDatabase.GUIDToAssetPath(guid);
    var mixer = UnityEditor.AssetDatabase.LoadAssetAtPath<UnityEngine.Audio.AudioMixer>(path);
    var groups = mixer.FindMatchingGroups("");
    var names = System.Linq.Enumerable.Select(groups, g => g.name);
    rows.Add($"{path}: {groups.Length} groups [{string.Join(", ", names)}]");
}
return rows.Count == 0 ? "no AudioMixer assets in this project" : string.Join("\n", rows);
```

`LoadAssetAtPath<AudioMixer>` returns the controller instance — the same object the authoring calls
below expect — so a mixer loaded this way can be passed straight into them.

`FindMatchingGroups("")` returns every group as the public `AudioMixerGroup` type, which is enough
for classification and routing. It does not expose the parent/child shape; use
`GetAllAudioGroupsSlow` through reflection if the hierarchy itself matters, and note it returns a
`List<>` rather than an array.

## Creating an Audio Mixer — reflection

```csharp
// preamble above
var path = "Assets/Audio/TheNameOfTheMixer.mixer";
mixerType.GetMethod("CreateMixerControllerAtPath", flags).Invoke(null, new object[] { path });
UnityEditor.AssetDatabase.SaveAssets();
UnityEditor.AssetDatabase.Refresh();
var mixer = UnityEditor.AssetDatabase.LoadAssetAtPath<UnityEngine.Audio.AudioMixer>(path);
return mixer == null ? "creation failed" : $"created {path}";
```

The parent folder must already exist. Creating a mixer at a path whose folder is missing throws
`UnityException` rather than creating the folder for you, so call
`UnityEditor.AssetDatabase.CreateFolder` first.

## Creating and parenting a Mixer Group — reflection

`AddChildToParent` takes the child first and the parent second. Getting that order wrong is the one
mistake to watch for here: passing `(parent, child)` throws nothing, and the group you just created
disappears from the tree — `FindMatchingGroups` comes back with `Master` alone. Verify the group
list after parenting rather than trusting the call to have worked.

```csharp
// preamble above
var mixer = UnityEditor.AssetDatabase.LoadAssetAtPath<UnityEngine.Audio.AudioMixer>(
    "Assets/Audio/TheNameOfTheMixer.mixer");
var master = mixerType.GetProperty("masterGroup", flags).GetValue(mixer);

// storeUndoState: true is what makes this one undo step for the user — keep it true.
var newGroup = mixerType.GetMethod("CreateNewGroup", flags)
    .Invoke(mixer, new object[] { "SFX", true });

// Parent to master, or to another group created the same way.
mixerType.GetMethod("AddChildToParent", flags).Invoke(mixer, new object[] { newGroup, master });

UnityEditor.AssetDatabase.SaveAssets();
UnityEditor.AssetDatabase.Refresh();
var names = System.Linq.Enumerable.Select(mixer.FindMatchingGroups(""), g => g.name);
return string.Join(", ", names);
```

## Reading and writing a group volume — reflection

Volume is per-snapshot, so both calls need the mixer's current target snapshot. Clamp to the
range the mixer itself defines rather than inventing bounds.

```csharp
// preamble above
var mixer = UnityEditor.AssetDatabase.LoadAssetAtPath<UnityEngine.Audio.AudioMixer>(
    "Assets/Audio/TheNameOfTheMixer.mixer");
var snapshot = mixerType.GetProperty("TargetSnapshot", flags).GetValue(mixer);
var group = System.Array.Find(mixer.FindMatchingGroups(""), g => g.name == "SFX");

var getVolume = groupType.GetMethod("GetValueForVolume", flags);
var current = (float)getVolume.Invoke(group, new object[] { mixer, snapshot });

var min = (float)mixerType.GetField("kMinVolume", flags).GetValue(null);
var max = (float)mixerType.GetMethod("GetMaxVolume", flags).Invoke(null, null);
var target = UnityEngine.Mathf.Clamp(current - 6f, min, max);

groupType.GetMethod("SetValueForVolume", flags)
    .Invoke(group, new object[] { mixer, snapshot, target });
UnityEditor.AssetDatabase.SaveAssets();
return $"volume {current} -> {(float)getVolume.Invoke(group, new object[] { mixer, snapshot })}";
```

## Assigning a group to an Audio Source — public, no reflection

`AudioSource.outputAudioMixerGroup` is typed as the public `AudioMixerGroup`, and the controller
instances returned above are assignable to it, so no cast or reflection is involved.

```csharp
var mixer = UnityEditor.AssetDatabase.LoadAssetAtPath<UnityEngine.Audio.AudioMixer>(
    "Assets/Audio/TheNameOfTheMixer.mixer");
var group = System.Array.Find(mixer.FindMatchingGroups(""), g => g.name == "SFX");
var sources = UnityEngine.Object.FindObjectsByType<UnityEngine.AudioSource>(
    UnityEngine.FindObjectsInactive.Include, UnityEngine.FindObjectsSortMode.None);

var changed = new System.Collections.Generic.List<string>();
foreach (var source in sources)
{
    if (source.gameObject.name != "TheGameObjectName") { continue; }
    UnityEditor.Undo.RecordObject(source, "Assign mixer group");
    source.outputAudioMixerGroup = group;
    UnityEditor.EditorUtility.SetDirty(source);
    changed.Add(source.gameObject.name);
}
return changed.Count == 0 ? "no matching Audio Source" : $"routed: {string.Join(", ", changed)}";
```

Assigning the property changes the **scene**, not the mixer asset, so the scene has to be saved for
it to persist — `UnityEditor.SceneManagement.EditorSceneManager.SaveOpenScenes()`. Report to the
user that the scene was modified.

## Valid operations on a group object

Reachable off a group returned by `FindMatchingGroups` with no reflection: `name`, and the
`UnityEngine.Audio.AudioMixerGroup` surface. `controller` and `effects` are declared on the
internal controller type, so read them reflectively off `groupType` if the effect chain matters —
that is the path the mixer-audit step in the skill body uses.
