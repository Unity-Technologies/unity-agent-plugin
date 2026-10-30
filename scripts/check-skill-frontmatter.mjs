#!/usr/bin/env node
// Fails when any skills/*/SKILL.md has frontmatter that a strict YAML parser rejects,
// or that lacks a non-empty `name` matching its folder or a non-empty `description`.
// Agents parse the frontmatter with a real YAML parser and silently drop a skill that
// fails, so this is the only place the defect becomes visible.
//
// Also enforces two checks from the Claude Code plugin directory's scan: no angle brackets
// (like `<genre>`) in a skill description, and a root README.md of at least 40 words.
// A failed scan holds the release back, and the scan reports it only after submission.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const root = process.argv[2] ?? 'skills';
const readme = 'README.md';
const minReadmeWords = 40;
let checked = 0;
const failures = [];

for (const dir of readdirSync(root, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const path = join(root, dir.name, 'SKILL.md');
  if (!existsSync(path)) {
    failures.push(`${path}: missing`);
    continue;
  }
  const text = readFileSync(path, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    failures.push(`${path}: no YAML frontmatter block`);
    continue;
  }
  let data;
  try {
    data = yaml.load(match[1]);
  } catch (error) {
    failures.push(`${path}: frontmatter is not valid YAML: ${error.message.split('\n')[0]}`);
    continue;
  }
  if (typeof data !== 'object' || data === null) {
    failures.push(`${path}: frontmatter is not a mapping`);
    continue;
  }
  if (typeof data.name !== 'string' || data.name.trim() === '') {
    failures.push(`${path}: missing or empty name`);
  } else if (data.name !== dir.name) {
    failures.push(`${path}: name "${data.name}" does not match folder "${dir.name}"`);
  }
  if (typeof data.description !== 'string' || data.description.trim() === '') {
    failures.push(`${path}: missing or empty description`);
  } else if (/[<>]/.test(data.description)) {
    failures.push(`${path}: description contains angle brackets; reword or use a plain placeholder`);
  }
  checked += 1;
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
