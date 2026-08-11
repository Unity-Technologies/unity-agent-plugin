## Architecture

All `AudioMixer`s in the editor are actually `AudioMixerController`s, that affords extra authoring APIs.
Similarly, `AudioMixerGroup`s are `AudioMixerGroupController`s. 

`AudioMixerController` and `AudioMixerGroupController` are **internal** to
`UnityEditor.Audio`. Editor-side `eval` does reach them (measured), so use the APIs below
directly. Only fall back to reflection if a compile error actually reports a visibility
problem — the API shapes below still apply either way.

All code should add these using namespaces:

```c#
using UnityEditor.Audio;
using UnityEngine.Audio;
```

## Finding existing Audio Mixers
```c#
using UnityEditor;
using System.Linq;

string[] guids = AssetDatabase.FindAssets("t:AudioMixer");
IEnumerable<AudioMixerController> mixers = guids.Select(AssetDatabase.GUIDToAssetPath).Select(AssetDatabase.LoadMainAssetAtPath).Cast<AudioMixerController>();
```

## Creating an Audio Mixer

```c#
AudioMixerController mixerController = AudioMixerController.CreateMixerControllerAtPath("TheNameOfTheMixer.mixer");
```

## Listing all Audio Mixer Groups

```c#
List<AudioMixerGroupController> groupsInMixer = mixerController.GetAllAudioGroupsSlow();
```

## Creating a new Audio Mixer Group
```c#
AudioMixerGroupController newGroup = mixerController.CreateNewGroup("the new group name, like 'SFX'", storeUndoState: true);

// Decide how the group should be parented - the default behaviour is to the master. Another locally created group can also be passed in here.
mixerController.AddChildToParent(newGroup, mixerController.masterGroup);
```

## Valid operations on Mixer Groups
```c#
AudioMixerGroupController group = /* ... */;

string name = group.name;
AudioMixerController mixerThisBelongsTo = group.controller;
AudioMixerEffectController[] effectsOnGroup = group.effects;

var volume = group.GetValueForVolume(mixerThisBelongsTo, mixerThisBelongsTo.TargetSnapshot);
group.SetValueForVolume(mixerThisBelongsTo, mixerThisBelongsTo.TargetSnapshot, Mathf.Clamp(volume + /* some relative change in decibels */, AudioMixerController.kMinVolume, AudioMixerController.GetMaxVolume()));
```
