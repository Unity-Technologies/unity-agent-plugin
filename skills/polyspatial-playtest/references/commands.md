# Command reference

Every command is `unity command <name> [--flag value] [--project-path <project>]`. Results come
back in the `result` field; several are NDJSON (one JSON object per line) so they stream and grep.

## Annotations

| Command | Flags | Result |
|---|---|---|
| `polyspatial_annotation_list` | `--recording all\|latest\|<name>` (default all) | One line per annotation: `reference`, `recording`, `recordingPath`, `frame`, `frameEnd`, `time`, `kind` (`entity`\|`moment`), `text`, `created`, `createdBy`, and for entity annotations `entityId`, `entityName`, `entityPath`, `worldPosition`, `worldBoundsCenter`, `worldBoundsSize`, `hitPoint`; `camera` is the Scene view camera when it was written. |
| `polyspatial_annotation_show` | `--ref <recording>#<id> \| <id> \| <path.json>` (required), `--window 30`, `--include-components true`, `--max-changes 300` | `annotation` (as above), `recordingFrames`, `changeWindow {from,to}`, `state` (entity annotations: NDJSON lines of the subtree at the frame, parsed into an array), `changes` (entity) or `changedEntities` (moment), `changeCount`, `changesTruncated`, `entityResolvedByName`, `entityMissing`. |

`kind` is `entity`, `entities` (a box or lasso selection in the Scene view: `entityIds`, `entityPaths`, `entityCount`; show returns `members`, their `state` and only their `changes`), `span` (`frame`–`frameEnd`) or `moment`.

A `changes` entry: `{ entity, component?, property, from, to, firstChangeFrame, lastChangeFrame, keyframes }`.
A `changedEntities` entry: `{ entity, changedProperties, properties[], firstChangeFrame, lastChangeFrame }`.

## Recording and playback (through `eval`)

No `polyspatial_*` command enters Play mode. Call the public `UnityEditor.PolySpatial.Utilities.RecordingPlaybackScene` API through `unity command eval --code "..."`:

| Call | Result |
|---|---|
| `return R.StartRecording();` | The new `.qrec` path, or `Error: ...` (already in Play mode, untitled scene). Enters Play mode. |
| `return $"{R.IsLiveSession} {R.LiveFrame}";` | `True <frame>` once the recorder runs; `LiveFrame` is the recording frame counter. |
| `unity command editor_stop` | Leaves Play mode; the file finalizes. Poll `Load(path).TotalFrameCount` through `eval` for it. |
| `return R.StartPlaybackAt("<path>", <frame>, true);` | Rebuilds `<path>` on a timeline inside the open scene, parked on `<frame>`; `null` on success. Never enters Play mode; the scene's own objects are deactivated until `StopPlayback`. |
| `R.SeekTo(<frame>, true); return R.CurrentFrame;` | Rebuilds that frame directly, in either direction. |
| `R.IsPaused = false;` / `R.IsPaused = true;` | Plays in real time / pauses. |
| `return $"{R.IsPlayingBack} {R.CurrentFrame} {R.PlaybackEnded}";` | Replay status. |
| `R.StopPlayback();` | Tears the timeline down and reactivates the scene's objects. |

`R` stands for the full `UnityEditor.PolySpatial.Utilities.RecordingPlaybackScene`; `eval` has no `using`, so spell it out.

## Reading a recording (through `eval_file`)

Recordings are `Library/PolySpatialRecordings/*.qrec`; `ls -t` finds the newest. Load one into a
`PolySpatialSceneState` and shape the answer with `SceneStateQuery`, in a `.cs` script run by
`unity command eval_file --file <script> --timeout 120`. The script's `return` value is the result;
write anything large to `Temp/<name>.ndjson` and compute on the file. `eval` has no `using`, so the
types are spelled out: `UnityEditor.PolySpatial.Serialization.SceneState.PolySpatialSceneStateRecordingLoader`
and `Unity.PolySpatial.Serialization.SceneState.SceneStateQuery` / `OutputMode` (public from
polyspatial #4964). Loading a long recording takes seconds: one script per recording, several
questions inside it.

```csharp
var state = UnityEditor.PolySpatial.Serialization.SceneState.PolySpatialSceneStateRecordingLoader.Load("<recordingPath>");
var summary = state.Query().Summarize().OrderAlphabetically().ToJson();                 // what exists: path, instanceId, lifecycle
var subtree = state.Query().FilterBySubtree(<instanceId>).FilterByFrameRange(<A>, <B>)   // one entity and its children over a range
    .FilterProperties(include: new[] { "transform.position" }).WorldTransforms()
    .IncludeComponents(false).IncludeAssets(false).IncludeInputs(false).ToJson();
var changes = state.Query().Diff(<A>, <B>)                                                // what differs between two frames
    .WithOutputMode(Unity.PolySpatial.Serialization.SceneState.OutputMode.PropertyPerLine).ToJson();
System.IO.File.WriteAllText("Temp/subtree.ndjson", subtree);
return $"frames={state.TotalFrameCount}\n{summary}";
```

| Query | Result |
|---|---|
| `state.TotalFrameCount` | Frame count; also confirms a stopped recording has finalized. |
| `.Summarize().OrderAlphabetically()` | NDJSON, one line per entity: `path`, `instanceId`, `lifecycle`, no values. Resolve names here, then query by `instanceId`. |
| `.FilterBySubtree(instanceId)` | Only that entity and its descendants. |
| `.FilterByFrameRange(a, b)` / `.FilterByTimeRange(s0, s1)` | Keyframes inside the range plus the value held at its start; frames are 1-based, times are seconds from the start. |
| `.FilterProperties(include, exclude)` | Keep only the named properties (`transform.position`, `transform.rotation`, `lifecycle`, `Image.color`, …); entity headers stay. The cheap way to ask "how many times did Image.color change": count that keyframe array. |
| `.WorldTransforms()` / `.LocalTransforms()` | Composed world values, or values relative to the parent. |
| `.Diff(a, b)` | Only what differs between two frames; with `WithOutputMode(OutputMode.PropertyPerLine)` one property per line with both values. |
| `.FilterByDepth(n)`, `.FilterByComponentType("MeshRenderer")`, `.IncludeComponents/IncludeAssets/IncludeInputs(bool)`, `.WithSignificantTransformDigits(n)` | Narrow or widen the output. |
| `.ToJson()` | NDJSON: a header line, then one line per entity with `path`, `lifecycle`, `world.position/rotation/scale`, `components[]` and `Component.property` values. A value constant over the range is written bare; a changing one as `[[frame,value],...]`. Rotations are quaternions `x, y, z, w`. |

The Muse Editor skills `play-session-recording-inspect`, `-analyze` and `-explain` (polyspatial
#4963) issue the same queries through RunCommand; their templates carry over by replacing
`result.Log(x)` with `return x`.

## Driving the game (com.unity.pipeline)

| Command | Flags | Result |
|---|---|---|
| `simulate_key` | `--key Space`, `--action press\|down\|up` | `{ Success, Detail, Error }`. Input System key names. |
| `simulate_pointer` | `--x --y`, `--action click\|move\|down\|up`, `--button left\|right\|middle` | Same. Screen pixels, origin bottom-left. |
| `simulate_input_script` | `--script '{"steps":[…],"releaseAtEnd":true}'` | `{ Status, ScriptId, StepCount, EventCount, EventsFired, StartFrame, EndFrame, StartTime, ElapsedSeconds, Fired[], Released[], Error }`. Steps: `{at, key, action: down\|up\|press\|hold, duration}` or `{at, x, y, button, action: move\|down\|up\|click\|hold, duration}`. Runs over the following frames; one script at a time. |
| `simulate_input_script_status` / `_cancel` | | The same status object. |
| `click_ui_element` | `--name <GameObject>`, `--button left`, `--index 0`, `--hold 0` | Status object; the first `Fired` line names the resolved path and screen position, and whether it scrolled the element into view. Fails with the position when the element is off screen. |
| `editor_play` / `editor_stop` / `editor_pause` | | Plain Play mode control without recording. |
| `capture_game_view` | `--source screen`, `--save_path <project-relative>` | PNG of the Game view; `screen` includes overlay UI and needs Play mode. |
| `set_autotick` | `--enable true` | Keeps the Editor ticking while unfocused. |
