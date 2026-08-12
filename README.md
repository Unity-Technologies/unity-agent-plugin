# Unity

Unity's official game development plugin. Build, monetize, and operate Unity games
with guidance grounded in Unity's documented practices.

Available for **Claude Code**, **Codex**, and **Grok**.

## Install

**Claude Code**

```
/plugin marketplace add Unity-Technologies/unity-agent-plugin
```

```
/plugin install unity@unity-agent-plugin
```

**Codex**

```bash
codex plugin marketplace add Unity-Technologies/unity-agent-plugin
```

```bash
codex plugin add unity@unity-agent-plugin
```

**Grok**

```bash
grok plugin install Unity-Technologies/unity-agent-plugin --trust
```

Grok asks for explicit trust before it installs anything from a repository. This
plugin ships skills only — no hooks and no MCP servers.

### Verify it worked

Each agent surfaces an installed plugin differently.

**Claude Code** — type `/unity:` and the skills appear in the command list. `/plugin`
also shows `unity` as installed and enabled.

**Codex** — run `codex plugin list`:

```
PLUGIN                    STATUS              VERSION
unity@unity-agent-plugin  installed, enabled  0.1.0-beta
```

**Grok** — type `/` and the skills appear in the slash menu. Grok uses the plain skill
name, and switches to the plugin-qualified form (`/unity:ui-uitk`) when another
installed skill shares the same name. `grok plugin list` shows `unity`, and
`grok plugin details unity` lists what it provides.

### Manual install

If you can't use the marketplace commands, clone the repo and link it into your personal skills directory instead:

```bash
git clone https://github.com/Unity-Technologies/unity-agent-plugin.git
ln -s "$(pwd)/unity-agent-plugin" ~/.claude/skills/unity
```

It loads automatically in every project from your next session onward.

## Usage

Once installed, your agent uses the relevant skill automatically when you ask it to
do something in your Unity project. For example:

> "Add in-app purchases so players can buy a coin pack"
>
> "I want to build a settings screen"
>
> "My pixel art looks blurry and jitters when the camera moves"
>
> "Show rewarded video ads so players can earn coins"
>
> "Create a hexagonal tile palette for my level"
>
> "Chinese characters show up as empty boxes in my TextMeshPro labels"
>
> "Set up gamepad and keyboard controls for my player"
>
> "Review my ScriptableRendererFeature for Render Graph problems"

In Claude Code and Grok the skills also appear in the slash menu, so you can pick one
explicitly instead of describing the task.

## Available skills

**2D and tilemaps**

| Skill | |
|---|---|
| `2d-pixel-perfect` | Pixel-perfect 2D rendering — pipeline detection, filter modes, camera setup, reference resolution |
| `manage-sprite-atlas` | Sprite atlases via a prebuild pipeline — master and variant atlases, packing and platform settings |
| `tilemap-palette-create` | Tile Palette assets for rectangular, hexagonal, or isometric grids |
| `tilemap-ruletile-createempty` | Blank RuleTile, HexagonalRuleTile, or IsometricRuleTile |
| `tilemap-ruletile-createfromsegment` | RuleTile tiling rules built from your terrain sprites |
| `sprite-segment-3x3grid` | Analyzes a sprite into a 3×3 colour-match pattern |

**UI, text, and localization**

| Skill | |
|---|---|
| `ui` | Detects which UI system your project uses and routes to the right one below |
| `ui-uitk` | UI Toolkit — UXML and USS authoring, flex layout, custom elements, Painter2D, runtime binding |
| `ui-ugui` | uGUI — Canvas hierarchies, RectTransform anchoring, Layout Groups, prefab UI |
| `ui-imgui` | IMGUI editor tooling — EditorWindows, custom Inspectors, PropertyDrawers |
| `optimize-text-mesh-pro` | TextMeshPro font stacks, dynamic atlases, SDF quality, CJK fallback, text memory |
| `localization` | Unity Localization — locales, String and Asset Tables, CJK fonts, Addressables |

**Monetization and live services**

| Skill | |
|---|---|
| `implement-in-app-purchases` | Unity IAP — catalogs, subscriptions, receipt validation, store extensions, D2C, migrating from other billing SDKs |
| `levelplay-unity-integration` | LevelPlay ad mediation — SDK install, dependency resolution, rewarded, interstitial and banner, privacy, ILRD |
| `build-live-game` | Unity Services backends — cloud save, cloud code, remote config, leaderboards, economy, player accounts |
| `setup-multiplayer-services` | Multiplayer topology, sessions, lobbies, matchmaking, discovery |

**Rendering and shaders**

| Skill | |
|---|---|
| `validate-urp-render-graph-renderer-feature` | Reviews a Unity 6+ URP `ScriptableRendererFeature` built on Render Graph |
| `shader-graph-create-custom-node` | Custom Shader Graph nodes from HLSL |

**Input, audio, and platform**

| Skill | |
|---|---|
| `setup-game-inputs` | Input System — action maps, bindings, control schemes, rebinding |
| `setup-audiorandomcontainer` | AudioRandomContainer assets for randomized playback |
| `android-add-adaptive-performance` | Android thermal and power signals mapped to dynamic quality tiers |

## Works with

Unity 6+.

## Issues and feedback

Found a bug or have a suggestion? Post in the
[Unity Discussions forum](https://discussions.unity.com/).

## Brand guidelines

See [Unity's branding and trademark guidelines](https://unity.com/legal/branding-trademarks)
for displaying any Unity marks or icons contained in this repo.

## License

[Unity Companion License](LICENSE.md).
