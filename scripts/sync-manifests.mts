#!/usr/bin/env node
// Keeps the values every platform manifest shares (version, author, homepage, repository,
// license, keywords, category) in one place: scripts/plugin-metadata.json.
//
//   node scripts/sync-manifests.mts          write the shared values into every manifest
//   node scripts/sync-manifests.mts --check  fail if any manifest has drifted (CI runs this)
//
// To release, change "version" in plugin-metadata.json and run the script without --check.
// Platform-only fields (descriptions, the Codex interface block, Antigravity prompts) stay in
// each manifest and are not touched.
import { readFileSync, writeFileSync } from 'node:fs';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

interface Metadata {
  version: string;
  author: { name: string; url?: string; email?: string };
  homepage: string;
  repository: string;
  license: string;
  category: string;
  keywords: string[];
}

interface Marketplace extends JsonObject {
  plugins: JsonObject[];
}

const check = process.argv.includes('--check');
const meta: Metadata = JSON.parse(readFileSync('scripts/plugin-metadata.json', 'utf8'));
const shared = ['version', 'author', 'homepage', 'repository', 'license', 'keywords'] as const;

// Each target names a manifest and where each shared key lives in it.
const targets: { file: string; set: (manifest: JsonObject) => void }[] = [
  { file: '.claude-plugin/plugin.json', set: (m) => assign(m, shared) },
  {
    file: '.codex-plugin/plugin.json',
    set: (m) => {
      assign(m, shared);
      (m.interface as JsonObject).category = meta.category;
    },
  },
  {
    // No category: agy 1.4 reports it as an unknown field, which fails `validate --strict`.
    file: '.antigravity-plugin/plugin.json',
    set: (m) => {
      assign(m, shared);
      delete m.category;
    },
  },
  {
    // The entry must not carry a version: plugin.json wins at install, and validate warns.
    file: '.claude-plugin/marketplace.json',
    set: (m) => {
      const entry = pluginEntry(m as Marketplace);
      delete entry.version;
      entry.category = meta.category;
    },
  },
  {
    file: '.agents/plugins/marketplace.json',
    set: (m) => {
      pluginEntry(m as Marketplace).category = meta.category;
    },
  },
];

// Where a key goes when a manifest doesn't have it yet, so new keys sit beside related ones.
const anchors: Record<string, string> = { repository: 'homepage', license: 'repository' };

function assign(manifest: JsonObject, keys: readonly (keyof Metadata)[]): void {
  for (const key of keys) setKey(manifest, key, structuredClone(meta[key]));
}

function setKey(obj: JsonObject, key: string, value: Json): void {
  const anchor = anchors[key];
  if (key in obj || !anchor || !(anchor in obj)) {
    obj[key] = value;
    return;
  }
  const entries = Object.entries(obj);
  const at = entries.findIndex(([k]) => k === anchor) + 1;
  entries.splice(at, 0, [key, value]);
  for (const k of Object.keys(obj)) delete obj[k];
  Object.assign(obj, Object.fromEntries(entries));
}

function pluginEntry(marketplace: Marketplace): JsonObject {
  const entry = marketplace.plugins?.find((p) => p.name === 'unity');
  if (!entry) throw new Error('no "unity" entry in plugins[]');
  return entry;
}

const drifted: string[] = [];
for (const { file, set } of targets) {
  const before = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const manifest = JSON.parse(before);
  set(manifest);
  const after = `${JSON.stringify(manifest, null, 2)}\n`;
  if (after === before) continue;
  if (check) drifted.push(file);
  else writeFileSync(file, after);
}

// The sample `codex plugin list`, `agy plugin list` and `copilot plugin list` output in the
// README shows the version. Only those three lines are matched, so other version numbers in
// the README are left alone.
const readme = '.github/README.md';
// Group 1 is the text before the version, group 2 the version itself.
const samples = [
  /^(unity@unity-agent-plugin\s+installed, enabled\s+)(\S+)$/m,
  /^(- unity \(enabled, )([^)]+)\)$/m,
  /^(\s+• unity@unity-agent-plugin \(v)([^)]+)\)$/m,
];
let readmeText = readFileSync(readme, 'utf8').replace(/\r\n/g, '\n');
const staleVersions = new Set<string>();
for (const sample of samples) {
  const match = sample.exec(readmeText);
  if (!match) throw new Error(`${readme}: no line matches ${sample}; update the pattern in this script`);
  const [, head, version] = match;
  if (version === meta.version) continue;
  staleVersions.add(version);
  const start = match.index + head.length;
  readmeText = readmeText.slice(0, start) + meta.version + readmeText.slice(start + version.length);
}
if (staleVersions.size > 0) {
  if (check) drifted.push(`${readme} (sample output shows ${[...staleVersions].join(', ')})`);
  else writeFileSync(readme, readmeText);
}

if (drifted.length > 0) {
  console.error('These files differ from scripts/plugin-metadata.json:');
  for (const file of drifted) console.error(`  ${file}`);
  console.error('Run `node scripts/sync-manifests.mts` and commit the result.');
  process.exit(1);
}
console.log(check ? 'Manifests match scripts/plugin-metadata.json' : 'Manifests updated');
