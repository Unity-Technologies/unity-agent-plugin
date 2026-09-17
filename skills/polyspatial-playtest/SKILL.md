---
name: polyspatial-playtest
description: Use when you must prove that gameplay, UI, or behavior in a Unity project actually works or is actually broken — "verify my change in Play mode", "does the button do X", "play-test this", "why does the cupcake stop spinning", "check the fix", or whenever someone hands you a PolySpatial annotation reference like `MyRecording-2026-9-11-101947#7d29bfdc…`. Records the Play session as a PolySpatial .qrec, drives the game with simulated input, then answers from the recorded per-frame scene state instead of eyeballing a screenshot. Requires a running Editor with com.unity.pipeline and com.unity.polyspatial.annotation (`unity command --query polyspatial` lists `polyspatial_annotation_*`).
allowed-tools:
  - Bash
  - Read
---

# PolySpatial play-test and debug

Screenshots tell you what a frame looked like; a PolySpatial recording tells you what every
entity *was* on every frame — transforms, component properties, lifecycle, audio — and you can
query it after Play mode has ended. This skill is the loop: understand the request (often an
annotation someone left on a recording), change the code, then **play the game for real, record
it, and read the numbers back**. Use `capture_game_view` only to confirm what a frame looks like
once you already know from the data which frame matters.

Two kinds of call. Annotations have commands: `unity command polyspatial_annotation_list` and
`polyspatial_annotation_show`. Everything else about a recording is a C# query you run in the
Editor with `unity command eval_file --file <script.cs>` against the public `PolySpatialSceneState`
API. Always pass `--project-path <path>` when more than one Editor may be open. Read
[references/commands.md](references/commands.md) for every flag, the query API and the shape of
each result.

## 0. Preconditions (check once per session)

```bash
unity status                                   # an Editor for this project, state "ready"
unity command --query polyspatial --detail compact   # polyspatial_annotation_list / _show must be listed
unity command set_autotick --enable true      # an unfocused Editor barely advances frames otherwise
```

If the `polyspatial_annotation_*` commands are missing, the project lacks the PolySpatial
annotation package: say so, and fall back to `editor_play` plus `capture_game_view`. Do not
hand-edit `.unity`/`.prefab` files while an Editor is reachable (see the `unity-cli` skill).

The game must use the **Input System** for simulated input to reach it; legacy `Input.GetKey` code
cannot be driven. Check `ProjectSettings/ProjectSettings.asset` → `activeInputHandler` (1 or 2), or
just try `simulate_key` in Play mode and see whether the game reacts.

## 1. Start from an annotation reference

A reference looks like `<recording>#<annotation-id>` (people copy it with the `Ref` button in
Window ▸ PolySpatial ▸ Annotations). It may also arrive as a bare id or as a path to the
annotation's `.json`. Resolve it first; never guess what it points at:

```bash
unity command polyspatial_annotation_list                    # every annotation, one JSON line each
unity command polyspatial_annotation_show --ref "<recording>#<id>" --window 30
```

`polyspatial_annotation_show` returns:

- `annotation.text` — what the person said, and `frame`/`time` — when; `recordingPath` — the
  `.qrec` to query. `kind` is `entity` when they right-clicked an object (then `entityId`,
  `entityPath`, `worldPosition`, `worldBoundsSize`, `hitPoint` are set), `entities` for a box or
  lasso selection (`members`), `span` for a time range, or `moment` for the whole frame.
- `state` — the entity's subtree at that frame: world transform, components and their properties.
- `changes` — every property of that subtree that varied within ±`window` frames, with `from`, `to`,
  `firstChangeFrame`, `lastChangeFrame`. For a moment annotation you get `changedEntities` grouped by
  the top two hierarchy levels instead; drill in with a subtree query (section 4).

Read text and data together. "The cupcake stopped spinning" at frame 400 plus `world.rotation`
changing through frame 430 means it did *not* stop — the person is describing the expected
behavior, or noticed something else. "The guy is looking back" as a moment annotation plus
`changedEntities` naming only `DudeContainer` tells you which object to inspect.

### Delegate the measuring

Raw recording data is large and the arithmetic is mechanical, so keep both out of the main
conversation. In Claude Code, hand every quantitative question to the `recording-analyst` subagent
that ships with this plugin (`Agent` with `subagent_type: recording-analyst`), passing the project
path, the reference or recording, and the question verbatim. It only runs the annotation commands
and read-only scene-state queries and computes on their output, so what comes back is a measurement
with frames and seconds, and you decide afterwards whether the *why* needs the code. In Codex there
is no plugin subagent: copy
[references/codex-recording-analyst.toml](references/codex-recording-analyst.toml) into the project's
`.codex/agents/` and delegate the same way, or follow the rules below yourself.

### Answer from the recording first, explain from the code second

When the question is about what happened ("how many times did it rotate", "did it ever leave the
platform", "how long was the button disabled"), the recording is the source of truth and the
answer is a number you compute from it. Do that **before** opening any scene or script, and report
it as soon as you have it. Only then, if the person asked *why*, read the code that drives the
entity — and say plainly which part of your answer is measured and which is inferred from code.
Do not spend the session grepping `.unity` files while the measured answer sits unreported.

Worked example, "how many times did the cupcake rotate?". The recording gives you samples;
the arithmetic is yours — write the keyframes to a file and compute in a short script, exactly as
you would with any dataset:

```bash
unity command polyspatial_annotation_show --ref "<recording>#<id>"     # entityId: 4711, entityPath: …/Cupcake/Wiggle/MMCupcake/Cup, recordingPath
cat > /tmp/cup.cs <<'CS'
var state = UnityEditor.PolySpatial.Serialization.SceneState.PolySpatialSceneStateRecordingLoader.Load("<recordingPath>");
string Rotation(long id) => state.Query()
    .FilterBySubtree(id)
    .FilterProperties(include: new[] { "transform.rotation" })
    .LocalTransforms()
    .IncludeComponents(false).IncludeAssets(false).IncludeInputs(false)
    .ToJson();
System.IO.File.WriteAllText("Temp/cup.ndjson", Rotation(4711));            // the annotated Cup
System.IO.File.WriteAllText("Temp/mmcupcake.ndjson", Rotation(<parentId>)); // its parent, from the Cup's path in the summary
return $"frames={state.TotalFrameCount}";
CS
unity command eval_file --file /tmp/cup.cs --timeout 120
# python over Temp/*.ndjson: transform.rotation is [[frame,[x,y,z,w]],...]; for consecutive quaternions
# q0,q1 take delta = q1 * inverse(q0), convert to angle-axis, accumulate signed angle about the dominant
# axis; sum / 360 = turns; runs of |delta| > 0 = bursts.
```

Result on the sample recording: `Cup` never turns relative to its parent (one distinct rotation
in 779 frames); `MMCupcake` turns 13.9 times about x in two bursts, frames 336–380 (6.9) and
384–428 (6.9). Answer with those numbers and frames first: "the cupcake spun ~13.9 turns in two
~7-turn bursts at 7.4–8.4 s and 8.5–9.5 s; the rotation is on the parent MMCupcake, the annotated
Cup mesh is rigid." Then, only if asked why: the MMF_Rotation feedback on that object.

The same pattern answers "how many times did the color change" (`FilterProperties(include: new[] {
"Image.color" })` and count that keyframe array), "how far did the player travel" (`WorldTransforms()`
on `transform.position`, sum the deltas), "was it ever inactive" (the `lifecycle` keyframes). There
is no per-question command; there are keyframes and your computation. Write anything longer than a
screen to `Temp/` and compute on the file, print only the result.

Rules for measuring:

- A property that is constant on the annotated entity usually lives on an ancestor: walk up the
  `entityPath` one level at a time. `WorldTransforms()` gives the composed result, `LocalTransforms()`
  the value relative to the parent.
- Net rotation and total rotation differ: a wiggle travels many degrees and nets zero. Report
  the one the question asks for, and say which.
- Keyframes are stored only where the value changed; a value constant over the range is written
  bare. Hold the last value across frames when you need per-frame samples.
- Convert frames to seconds with the `time` field of the annotation, or query by seconds with
  `FilterByTimeRange(s0, s1)`; quote both in the answer.

To see the moment, replay and park on the frame, then capture:

```bash
R=UnityEditor.PolySpatial.Utilities.RecordingPlaybackScene
unity command eval --code "return $R.StartPlaybackAt(\"<recordingPath>\", 400, true);"   # rebuilds the recording in the open scene, parked on frame 400; null on success; no Play mode
unity command eval --code "return \$\"{$R.IsPlayingBack} {$R.CurrentFrame}\";"            # "True 400"
unity command capture_game_view --save_path Temp/annotation-400.png                       # camera capture; "screen" needs Play mode
unity command eval --code "$R.StopPlayback(); return $R.IsPlayingBack;"                   # restores the scene's own objects
```

If the task is to change behavior, then go read the code that drives that entity (the hierarchy
path names the GameObjects), fix or implement, and prove it with section 2.

## 2. Verify by playing: record → drive → stop → query

Decide **before** recording what "correct" means as numbers: which entity, which property, which
frames or seconds, which value or change. Then:

```bash
# 1. Open the scene to test (must be a saved scene; recording refuses untitled scenes).
R=UnityEditor.PolySpatial.Utilities.RecordingPlaybackScene
unity command eval --code "return $R.StartRecording();"                      # arms a .qrec and enters Play mode; returns its path
unity command eval --code "return \$\"{$R.IsLiveSession} {$R.LiveFrame}\";"  # poll until True; note the frame

# 2. Drive the game. Timed sequences run over real frames; poll status until completed.
unity command simulate_input_script --script '{"steps":[{"at":0.5,"key":"W","action":"hold","duration":1.0},{"at":2.0,"x":640,"y":360,"action":"click"}]}'
unity command simulate_input_script_status        # "fired" lists time and Time.frameCount per event
unity command click_ui_element --name "Play Button"   # uGUI by GameObject name; scrolls it into view
unity command eval --code "return $R.LiveFrame;"  # note the frame again: the recording frames you drove

# 3. Stop and wait for the file.
unity command editor_stop                          # the .qrec finalizes on exit
L=UnityEditor.PolySpatial.Serialization.SceneState.PolySpatialSceneStateRecordingLoader
unity command eval --code "return $L.Load(\"<path>\").TotalFrameCount;" --timeout 120   # poll until it answers

# 4. Ask the recording (one script, several questions; see references/commands.md).
cat > /tmp/verify.cs <<'CS'
var state = UnityEditor.PolySpatial.Serialization.SceneState.PolySpatialSceneStateRecordingLoader.Load("<path>");
System.IO.File.WriteAllText("Temp/summary.ndjson", state.Query().Summarize().OrderAlphabetically().ToJson());   // what exists, with instanceIds
System.IO.File.WriteAllText("Temp/player.ndjson", state.Query().FilterBySubtree(<playerId>).FilterByFrameRange(<A>, <B>).WorldTransforms().ToJson());
System.IO.File.WriteAllText("Temp/changes.ndjson", state.Query().Diff(<A>, <B>).WithOutputMode(Unity.PolySpatial.Serialization.SceneState.OutputMode.PropertyPerLine).ToJson());
return $"frames={state.TotalFrameCount}";
CS
unity command eval_file --file /tmp/verify.cs --timeout 120
```

Rules of evidence:

- Quote frames and values from the recording in your answer ("frame 1210–1290: `world.position.y`
  rose from 0.00 to 2.31, then fell back by frame 1350"), and name the `.qrec` path so a person can
  replay it. A screenshot alone is not proof.
- Entity names repeat (a UI scene has hundreds of `Text`). Resolve by `path` in the summary and
  query by `instanceId`, never by name alone.
- `LiveFrame` while recording is the recording frame counter; `Time.frameCount`
  in `simulate_input_script_status` is the game's counter. Bracket with status before and after
  driving, or query by seconds with `FilterByTimeRange`.
- The Editor throttles when unfocused: expect frame rates that differ from a focused run, and use
  seconds, not frame counts, when timing input.
- Leave Play mode with `editor_stop`; the scene that was open
  before is restored. Never leave the Editor in Play mode.

## 3. Inspect an existing recording without an annotation

```bash
ls -t Library/PolySpatialRecordings/*.qrec | head -3
cat > /tmp/inspect.cs <<'CS'
var state = UnityEditor.PolySpatial.Serialization.SceneState.PolySpatialSceneStateRecordingLoader.Load("<path>");
System.IO.File.WriteAllText("Temp/summary.ndjson", state.Query().Summarize().OrderAlphabetically().ToJson());
System.IO.File.WriteAllText("Temp/first5s.ndjson", state.Query().FilterByTimeRange(0, 5).FilterByDepth(2).IncludeComponents(false).ToJson());
return $"frames={state.TotalFrameCount}";
CS
unity command eval_file --file /tmp/inspect.cs --timeout 120
```

Start wide (`Summarize()`, `FilterByDepth(2)`) and narrow to one subtree and a short frame range;
whole-scene keyframe dumps run to hundreds of kilobytes.

## 4. Query cheat sheet

`state.Query()` returns a `SceneStateQuery`; every call chains and `ToJson()` ends it with NDJSON.
`FilterBySubtree(instanceId)`, `FilterByFrameRange(a, b)`, `FilterByTimeRange(s0, s1)`,
`FilterByDepth(n)`, `FilterByComponentType("MeshRenderer")`, `FilterProperties(include, exclude)`,
`Summarize()`, `Diff(a, b)`, `WorldTransforms()` / `LocalTransforms()`, `IncludeComponents(false)`,
`IncludeAssets(false)`, `IncludeInputs(false)`, `WithSignificantTransformDigits(5)`,
`WithOutputMode(OutputMode.PropertyPerLine)`. Loading takes seconds on a long recording: one
script per recording, several questions inside it.

## Gotchas

- Entering or leaving Play mode reloads the domain: `unity command` may fail to connect for a few
  seconds. Retry; do not assume the Editor died.
- `StartRecording` returns `Error: ...` when already in Play mode or when the scene is untitled;
  `StartPlaybackAt` refuses a scene with unsaved changes. Save first. Recording and playback have no
  `polyspatial_*` commands of their own: drive them through `eval` as shown above.
- `eval` has no `using`: spell out `UnityEditor.PolySpatial.Serialization.SceneState.…` and
  `Unity.PolySpatial.Serialization.SceneState.…`. The types are public from polyspatial #4964.
- Input screen coordinates are Game view pixels with the origin bottom-left; `capture_game_view`
  reports the size it rendered at.
- Audio needs `UnityEngine.AudioSource` in PolySpatial Settings ▸ Generic Tracking Excluded Types
  to be recorded as play/stop events; without it, audio shows no state changes.
