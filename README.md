# Unity

Unity's official game development plugin. Build, monetize, and operate Unity games
with guidance grounded in Unity's documented practices.

Available for **Claude Code**, **Codex**, and **Grok**.

## Install

**Claude Code** — these two are slash commands, so type them inside a Claude Code
session rather than in a terminal:

```
/plugin marketplace add Unity-Technologies/unity-agent-plugin
```

```
/plugin install unity@unity-agent-plugin
```

From a terminal instead, use the `claude` CLI. Installs done this way load the next
time you start Claude Code, or when you run `/reload-plugins` in an open session:

```bash
claude plugin marketplace add Unity-Technologies/unity-agent-plugin
claude plugin install unity@unity-agent-plugin
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
> "Review my ScriptableRendererFeature for Render Graph problems"

In Claude Code and Grok the skills also appear in the slash menu, so you can pick one
explicitly instead of describing the task.

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
