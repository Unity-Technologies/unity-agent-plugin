#!/usr/bin/env node
// Builds the zip uploaded to OpenAI's plugin portal for a Codex release.
//
//   node scripts/build-codex-zip.mts            writes dist/unity-codex-<version>.zip
//
// Run it on a clean checkout of merged main, after the version bump. The zip holds one folder,
// `unity`, with the skills (no evals/ or tests/), the root plugin.json, the Codex manifest, the
// README, the license and the logos the Codex manifest references. It refuses to build if the
// manifests disagree on the name or version, or drift from scripts/plugin-metadata.json.
//
// The directory takes the package's identity (name, version, description, author) from the root
// plugin.json and everything else from .codex-plugin/plugin.json, because the root manifest has
// no extensions.com.openai. Files for other clients stay out: .claude-plugin/, hooks/, rules/
// and com.github.copilot/.
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const meta: { version: string } = JSON.parse(
  readFileSync(join(root, 'scripts/plugin-metadata.json'), 'utf8'),
);

// 1. The manifests must already carry the release version.
execFileSync(process.execPath, [join(root, 'scripts/sync-manifests.mts'), '--check'], {
  cwd: root,
  stdio: 'inherit',
});
const manifests = ['plugin.json', '.codex-plugin/plugin.json'];
const names = new Set<string>();
for (const file of manifests) {
  const { name, version } = JSON.parse(readFileSync(join(root, file), 'utf8')) as { name: string; version: string };
  if (version !== meta.version) fail(`${file} is at ${version}, expected ${meta.version}`);
  names.add(name);
}
if (names.size !== 1) fail(`${manifests.join(' and ')} disagree on the name: ${[...names].join(', ')}`);

// 2. Stage the package as <tmp>/unity.
const excluded = new Set(['evals', 'tests', '.DS_Store', 'Thumbs.db']);
const contents = [
  'skills',
  'plugin.json',
  '.codex-plugin',
  'README.md',
  'LICENSE.md',
  'assets/unity.svg',
  'assets/unity-small.svg',
];
const stage = mkdtempSync(join(tmpdir(), 'unity-codex-'));
const pkg = join(stage, 'unity');
try {
  for (const entry of contents) {
    const from = join(root, entry);
    if (!existsSync(from)) fail(`missing ${entry}`);
    cpSync(from, join(pkg, entry), {
      recursive: true,
      filter: (src) => !excluded.has(basename(src)),
    });
  }

  // The Codex manifest sets "hooks": {} so that a git install never picks up hooks/hooks.json,
  // which is Claude Code's. The zip has no hooks/ folder, so the key has nothing to switch off
  // here, and the plugin directory takes no plugins with lifecycle hooks. Leave it out, so the
  // uploaded manifest declares none.
  const codexManifest = join(pkg, '.codex-plugin/plugin.json');
  const { hooks, ...packed } = JSON.parse(readFileSync(codexManifest, 'utf8')) as Record<string, unknown>;
  if (hooks !== undefined && JSON.stringify(hooks) !== '{}') {
    fail('.codex-plugin/plugin.json declares hooks; the plugin directory takes no plugins with lifecycle hooks');
  }
  writeFileSync(codexManifest, `${JSON.stringify(packed, null, 2)}\n`);

  // 3. Check what was staged before zipping it.
  const skills = readdirSync(join(pkg, 'skills')).filter((d) =>
    existsSync(join(pkg, 'skills', d, 'SKILL.md')),
  );
  const codex = JSON.parse(readFileSync(join(pkg, '.codex-plugin/plugin.json'), 'utf8')) as {
    interface?: { logo?: string; composerIcon?: string };
  };
  const assets = [codex.interface?.logo, codex.interface?.composerIcon];
  for (const asset of assets.filter((a): a is string => typeof a === 'string')) {
    if (!existsSync(join(pkg, asset))) fail(`the Codex manifest references ${asset}, which is not in the package`);
  }

  // 4. Zip it. Windows and macOS ship bsdtar, which writes zip archives; Linux uses zip.
  const dist = join(root, 'dist');
  mkdirSync(dist, { recursive: true });
  const out = join(dist, `unity-codex-${meta.version}.zip`);
  rmSync(out, { force: true });
  if (process.platform === 'linux') {
    execFileSync('zip', ['-r', '-X', '-q', out, 'unity'], { cwd: stage, stdio: 'inherit' });
  } else {
    const tar =
      process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
    execFileSync(tar, ['--format', 'zip', '-cf', out, 'unity'], { cwd: stage, stdio: 'inherit' });
  }

  console.log(`Built ${out}`);
  console.log(`  version ${meta.version}, ${skills.length} skills, ${(statSync(out).size / 1024).toFixed(0)} KB`);
  console.log('Next: upload it at https://platform.openai.com/plugins (Upload plugin to make changes).');
} finally {
  rmSync(stage, { recursive: true, force: true });
}

function fail(message: string): never {
  console.error(`build-codex-zip: ${message}`);
  process.exit(1);
}
