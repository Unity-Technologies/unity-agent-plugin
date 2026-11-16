#!/usr/bin/env node
// Fails when a skill's frontmatter is something a strict YAML parser rejects, or lacks a
// non-empty `name` matching its folder or a non-empty `description`. Agents parse the
// frontmatter with a real YAML parser and silently drop a skill that fails, so this is
// the only place the defect becomes visible.
//
// The plugin ships the index shape: `skills/` holds one skill, `using-unity`, whose
// SKILL.md lists every skill, and each skill is `skills/using-unity/references/<name>/<name>.md`
// (renamed from SKILL.md so agents don't register it on its own). The publish job in
// unity/skills writes that layout. When `skills/using-unity` exists this checks it: the
// index skill's own frontmatter, each skill's file, that `skills/` holds nothing else, and
// that the index lists exactly the skills in `references/`, each with its file. Without it,
// every `skills/<name>/SKILL.md` is checked, as in the flat layout the plugin used before.
//
// Also enforces two checks from the Claude Code plugin directory's scan: no angle brackets
// (like `<genre>`) in a skill description, and a root README.md of at least 40 words.
// A failed scan holds the release back, and the scan reports it only after submission.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const root = process.argv[2] ?? 'skills';
const indexSkill = 'using-unity';
const readme = 'README.md';
const minReadmeWords = 40;
let checked = 0;
const failures = [];

const dirs = (path) =>
  readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

/** Checks one skill file's frontmatter; returns its text, or undefined if it's missing. */
function checkSkillFile(path, name) {
  if (!existsSync(path)) {
    failures.push(`${path}: missing`);
    return undefined;
  }
  const text = readFileSync(path, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    failures.push(`${path}: no YAML frontmatter block`);
    return text;
  }
  let data;
  try {
    data = yaml.load(match[1]);
  } catch (error) {
    failures.push(`${path}: frontmatter is not valid YAML: ${error.message.split('\n')[0]}`);
    return text;
  }
  if (typeof data !== 'object' || data === null) {
    failures.push(`${path}: frontmatter is not a mapping`);
    return text;
  }
  if (typeof data.name !== 'string' || data.name.trim() === '') {
    failures.push(`${path}: missing or empty name`);
  } else if (data.name !== name) {
    failures.push(`${path}: name "${data.name}" does not match folder "${name}"`);
  }
  if (typeof data.description !== 'string' || data.description.trim() === '') {
    failures.push(`${path}: missing or empty description`);
  } else if (/[<>]/.test(data.description)) {
    failures.push(`${path}: description contains angle brackets; reword or use a plain placeholder`);
  }
  checked += 1;
  return text;
}

if (existsSync(join(root, indexSkill))) {
  for (const name of dirs(root).filter((name) => name !== indexSkill)) {
    failures.push(`${join(root, name)}: only ${indexSkill} belongs in ${root}/; this folder loads as a separate skill`);
  }
  const indexPath = join(root, indexSkill, 'SKILL.md');
  const index = checkSkillFile(indexPath, indexSkill) ?? '';
  const referencesDir = join(root, indexSkill, 'references');
  const skills = existsSync(referencesDir) ? dirs(referencesDir) : [];
  if (skills.length === 0) {
    failures.push(`${referencesDir}: no skills`);
  }
  for (const name of skills) {
    checkSkillFile(join(referencesDir, name, `${name}.md`), name);
  }
  // Index lines: "- **<name>**: <description> File: `references/<name>/<name>.md`".
  const listed = new Map();
  for (const line of index.split(/\r?\n/)) {
    const entry = line.match(/^- \*\*([^*]+)\*\*: .* File: `([^`]+)`$/);
    if (entry) listed.set(entry[1], entry[2]);
  }
  for (const name of skills) {
    if (!listed.has(name)) {
      failures.push(`${indexPath}: doesn't list ${name}, so agents can't reach it`);
    } else if (listed.get(name) !== `references/${name}/${name}.md`) {
      failures.push(`${indexPath}: lists ${name} with file ${listed.get(name)}, expected references/${name}/${name}.md`);
    }
  }
  for (const name of listed.keys()) {
    if (!skills.includes(name)) {
      failures.push(`${indexPath}: lists ${name}, which isn't in ${referencesDir}`);
    }
  }
} else {
  for (const name of dirs(root)) {
    checkSkillFile(join(root, name, 'SKILL.md'), name);
  }
}

if (!existsSync(readme)) {
  failures.push(`${readme}: missing at the repo root`);
} else {
  const words = readFileSync(readme, 'utf8').split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
  if (words < minReadmeWords) {
    failures.push(`${readme}: ${words} words, the plugin directory needs at least ${minReadmeWords}`);
  }
}

if (failures.length > 0) {
  console.error(`${failures.length} problem(s) in ${checked} skill(s):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`${checked} skills: frontmatter OK; ${readme} OK`);
