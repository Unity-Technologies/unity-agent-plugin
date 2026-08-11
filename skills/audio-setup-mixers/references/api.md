## Architecture

All `AudioMixer`s in the editor are actually `AudioMixerController`s, that affords extra authoring APIs.
Similarly, `AudioMixerGroup`s are `AudioMixerGroupController`s. 

`AudioMixerController` and `AudioMixerGroupController` are **internal** to `UnityEditor.Audio`,
and that matters for how you reach them.

**Measured: naming these types directly in an `eval` snippet fails to compile** —
`CS0122: 'AudioMixerController' is inaccessible due to its protection level`. Reflection does
reach them:

```c#
var mixerType = System.Type.GetType("UnityEditor.Audio.AudioMixerController, UnityEditor");
var groupType = System.Type.GetType("UnityEditor.Audio.AudioMixerGroupController, UnityEditor");
```

So treat the signatures below as the **API shapes**, not as code to paste: invoke them through
reflection, or run the code as a compiled Editor script in the project rather than through
`eval`. Don't paste a snippet that names the type and expect it to build.

Types are otherwise fully qualified below, because `eval` rejects `using` directives. If you
save any of this into a `.cs` file instead, add `using UnityEditor.Audio;` and
`using UnityEngine.Audio;` and drop the qualification.

## Finding existing Audio Mixers
```c#
string[] guids = UnityEditor.AssetDatabase.FindAssets("t:AudioMixer");
var mixers = System.Linq.Enumerable.Cast<UnityEditor.Audio.AudioMixerController>(
    System.Linq.Enumerable.Select(
        System.Linq.Enumerable.Select(guids, UnityEditor.AssetDatabase.GUIDToAssetPath),
        UnityEditor.AssetDatabase.LoadMainAssetAtPath));
```

## Creating an Audio Mixer

```c#
var mixerController = UnityEditor.Audio.AudioMixerController.CreateMixerControllerAtPath("TheNameOfTheMixer.mixer");
```

## Listing all Audio Mixer Groups

```c#
var groupsInMixer = mixerController.GetAllAudioGroupsSlow();
```

## Creating a new Audio Mixer Group
```c#
var newGroup = mixerController.CreateNewGroup("the new group name, like 'SFX'", storeUndoState: true);

// Decide how the group should be parented - the default behaviour is to the master. Another locally created group can also be passed in here.
mixerController.AddChildToParent(newGroup, mixerController.masterGroup);
```

## Valid operations on Mixer Groups
```c#
var group = /* an AudioMixerGroupController */;

string name = group.name;
var mixerThisBelongsTo = group.controller;
var effectsOnGroup = group.effects;

var volume = group.GetValueForVolume(mixerThisBelongsTo, mixerThisBelongsTo.TargetSnapshot);
group.SetValueForVolume(mixerThisBelongsTo, mixerThisBelongsTo.TargetSnapshot, UnityEngine.Mathf.Clamp(volume + /* some relative change in decibels */, UnityEditor.Audio.AudioMixerController.kMinVolume, UnityEditor.Audio.AudioMixerController.GetMaxVolume()));
```
