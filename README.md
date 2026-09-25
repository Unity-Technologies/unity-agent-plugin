# Unity

Unity's official game development plugin. Build, monetize, and operate Unity games
with guidance grounded in Unity's documented practices.

Available for **Claude Code** and **Codex**.

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

### Verify it worked

Each agent surfaces an installed plugin differently.

**Claude Code** — type `/unity:` and the skills appear in the command list. `/plugin`
also shows `unity` as installed and enabled.

**Codex** — run `codex plugin list`:

```
PLUGIN                    STATUS              VERSION
unity@unity-agent-plugin  installed, enabled  0.1.6-beta
```

### Manual install

If you can't use the marketplace commands, clone the repo and link each skill into your personal skills directory. Run this from the folder you want the clone in:

```bash
git clone https://github.com/Unity-Technologies/unity-agent-plugin.git
cd unity-agent-plugin
```

**Claude Code**

```bash
mkdir -p ~/.claude/skills
for d in "$PWD"/skills/*; do ln -sfn "$d" ~/.claude/skills/"$(basename "$d")"; done
```

**Codex**

```bash
mkdir -p ~/.agents/skills
for d in "$PWD"/skills/*; do ln -sfn "$d" ~/.agents/skills/"$(basename "$d")"; done
```

The skills load in every project from your next session onward. To update them, run `git pull` in the clone. Skills installed this way don't appear under a `unity:` prefix, because they aren't installed as a plugin.

## Usage

> **Before you start:** the skills have your agent change your project directly. It edits scripts, scenes and assets, and when the Unity CLI is available it runs C# in your open Editor. Not every change is logged or can be undone from the Editor, so keep your project under version control and commit before asking for larger changes.

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

In Claude Code the skills also appear in the slash menu, so you can pick one
explicitly instead of describing the task.

For what each skill covers and how to prompt it, see
[About Unity's plugin](https://docs.unity.com/en-us/ai/unity-plugin/about-unity-plugin),
or browse the [skills folder](skills/).

## Works best with the Unity CLI

Many skills drive your open Unity Editor directly: they create GameObjects, change import settings, run C# in the Editor, and check the result, instead of hand-editing scene and asset files. They do this through the [Unity CLI](https://docs.unity.com/en-us/unity-cli), Unity's command-line tool, which also installs Editors, creates and opens projects, and runs builds and tests.

You don't have to set it up yourself. When a task needs the CLI, your agent checks whether it's installed and can install it for you, along with the small Unity package the CLI uses to talk to your open Editor. If you use the Unity Hub, you likely have the CLI already: the Hub now installs it automatically.

To install it yourself, or to use it on its own from your terminal, see [Use the Unity CLI](https://docs.unity.com/en-us/unity-cli/use-unity-cli).

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
