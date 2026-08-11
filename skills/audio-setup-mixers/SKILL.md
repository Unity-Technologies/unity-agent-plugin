---
name: audio-setup-mixers
description: Scans the scene and audio assets to appropriately route Audio Sources into existing Audio Mixer Groups or new ones if necessary. Use when user asks about adjusting sound levels or quality in general, cleaning up mixer assignments or creating mixers.
required_editor_version: ">=6000.3.13"
---
# Audio Mixer Setup

The authoring APIs this skill uses (`AudioMixerController`, `AudioMixerGroupController`)
live in `UnityEditor.Audio` and only exist inside a running Editor. There is no file
you can write to create or re-route a mixer, so this skill needs a live Editor it can
execute C# in. Step 0 establishes that before anything else.

## Step 0: Confirm you can run C# in the Editor

Every C# step below runs inside a live Editor through the Unity CLI. **The `unity-cli` skill
owns getting you there** — installing the CLI, confirming a connected Editor, adding the
project's `com.unity.pipeline` package, telling a genuinely absent Editor apart from one
stuck in Safe Mode, and discovering the Editor's command catalog. Follow it first; don't
re-derive any of it here.

Two things it can't know for you:

- **You need `eval` in particular**, not just a reachable Editor. Confirm it appears in the
  catalog. Its presence depends on the Pipeline package version, not on the CLI, so a
  healthy install can still lack it — if it's missing, say so and stop.
- **Do not fall back to editing `.mixer` files by hand.** Mixer routing is not safely
  authorable blind, so an unreachable Editor is a stop, not a cue to improvise.

Once `eval` is available, that is how each C# step below runs.

Run C# through the connected Editor with the `eval` command. Discover its parameter shape
from `unity command --format json` rather than assuming one — the inline form is
`unity command eval --code '<snippet>'`, and some Pipeline versions also register
`eval_file` for running a snippet from a file. **Check the catalog before reaching for
`eval_file`; it is frequently absent.** `unity command` defaults to a 30 second timeout.

### Passing C# to `eval`

`eval` compiles a **statement block, not a file**. Two consequences, both of which cause a
compile error rather than a warning:

- **No `using` directives.** The compiler reads `using UnityEngine;` as a resource-disposal
  statement and rejects it (`CS0210`).
- **Types must be fully qualified.** A bare `AssetDatabase` or `Volume` does not resolve
  (`CS0246` / `CS0103`), and a bare `Object` is ambiguous with `object` (`CS0104`).

Where a snippet below is written as a file — with usings, for readability, or because it is
meant to be saved into the project — qualify the types before passing it to `eval`.

## Step 1: Pre-flight
If the user hasn't explicitly asked for Audio Mixers, confirm that they want to proceed with setting them up.

Then find existing mixers by running the snippet from [references/api.md](references/api.md)
through the Editor as described in Step 0, and **use the referenced API** to understand
their hierarchy and enumerate the leaf Mixer Group names.

## Step 2: Find scene references
Find all Audio Source components, look at their assigned Generator asset names, and generalize a fitting class or category of the sound name, ideally something already existing. 
Examples for Audio Clip asset names:
- "FootStep4_Sound" -> Foley
- "Dialogue_Female_Scene4" -> Vox/Voice/Dialogue
- "GunShot" -> SFX
- "Menu_Theme_Variation" -> Music

If the assigned asset isn't descriptive or non-existing, try to look at the GameObject name or potential adjacent MonoBehaviour names.
Ask to create an Uncategorized group if it seems hard or confidence is low in classifying how an Audio Source is being used.

## Step 3: Suggest and create new Mixer Groups
Suggest the compiled changelist and revise with user. 
WAIT for the user to respond before proceeding.

See if there's a good existing Audio Mixer with a fitting name and reasonable overlap in Mixer Group names, and suggest that OR offer to create a new Audio Mixer specific to this scene regardless.

**If** reusing an existing mixer and new groups need to be added, confirm the suggested changes with the user and wait before proceeding.

## Step 4: Walk Audio Sources and assign Audio Mixer Groups
Repeat the process now with settled Mixer Group names.

The Audio Mixer Group property of the Audio Source should be updated to point to the classified group.

## References
See [references/api.md](references/api.md)