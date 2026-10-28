// Sets up an AI coding agent (Claude Code, Codex, or both) to work on this project the way
// the owner does: the same design skills and a browser it can drive to check its own work.
// Safe to run again; it skips what's already done. Run from the project folder:
//   node scripts/setup.mjs
// Skills that live in the repo (contribute, add-idea, frontend-design) need no setup. This
// adds what can't be committed here and the tools each agent uses to see the site.
import { spawnSync } from 'node:child_process';

const SKILLS_CLI = 'skills@1.7.4'; // pinned: npx would otherwise run whatever is newest
const PLAYWRIGHT_MCP = '@playwright/mcp@0.0.83';

const win = process.platform === 'win32';
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', shell: win, ...opts });
const has = (cmd) => run(cmd, ['--version']).status === 0;
const say = (msg) => console.log(`[setup] ${msg}`);
const problems = [];

// 1. Tools the project itself needs.
const [major] = process.versions.node.split('.').map(Number);
if (major < 18) problems.push(`Node ${process.versions.node} is too old; install Node 18 or later from https://nodejs.org`);
if (!has('git')) problems.push('git is missing; install it from https://git-scm.com (on a Mac: xcode-select --install)');
if (!has('gh')) say('Optional: the GitHub CLI (https://cli.github.com) lets the agent fork and open pull requests for you.');

const claude = has('claude');
const codex = has('codex');
if (!claude && !codex) say('Neither the claude nor the codex command was found; installing skills for both anyway.');

// 2. Web design review skill (Vercel's Web Interface Guidelines). It has no licence to copy
// it into this repo, so it's installed per checkout and git-ignored.
const agents = ['-a', 'claude-code', '-a', 'codex'];
const skill = run('npx', ['-y', SKILLS_CLI, 'add', 'vercel-labs/agent-skills', '--skill', 'web-design-guidelines', ...agents, '-y'], { stdio: 'inherit' });
if (skill.status === 0) say('Installed the web-design-guidelines skill.');
else problems.push('Could not install the web-design-guidelines skill (see the output above).');

// 3. A browser the agent can drive for screenshots and checks.
if (claude) {
  // .claude/settings.json already asks for this plugin; installing it here avoids relying on
  // the prompt, which doesn't always appear.
  const p = run('claude', ['plugin', 'install', 'playwright@claude-plugins-official', '--scope', 'project']);
  if (p.status === 0) say('Claude Code: Playwright browser plugin ready.');
  else problems.push(`Claude Code: could not install the Playwright plugin: ${(p.stderr || p.stdout).trim().split('\n').pop()}`);
}
if (codex) {
  const list = run('codex', ['mcp', 'list']);
  if (/\bplaywright\b/.test(list.stdout)) say('Codex: Playwright browser already set up.');
  else {
    const p = run('codex', ['mcp', 'add', 'playwright', '--', 'npx', '-y', PLAYWRIGHT_MCP]);
    if (p.status === 0) say('Codex: added the Playwright browser.');
    else problems.push(`Codex: could not add the Playwright browser: ${(p.stderr || p.stdout).trim().split('\n').pop()}`);
  }
}

if (problems.length) {
  for (const p of problems) say(`Problem: ${p}`);
  process.exit(1);
}
say('Done. Restart your agent so it picks up the new skills. Design rules are in DESIGN.md.');
