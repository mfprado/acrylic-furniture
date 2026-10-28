// Brings main up to date when a session starts, so work always begins from the latest
// version. Run by the SessionStart hook in .claude/settings.json; other agents can run it
// by hand (node scripts/pull-main.mjs). Only fast-forwards: it never discards changes.
// Its output is a line for the agent to read.
import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const say = (msg) => console.log(`[pull-main] ${msg}`);
const why = (e) => (e.stderr || e.message || '').trim().split('\n').pop(); // git's last line is the reason

try {
  git('rev-parse', '--is-inside-work-tree');
} catch {
  process.exit(0); // not the project yet (e.g. the folder chosen before cloning)
}

// A fork set up by the contribute skill keeps the original project as "upstream".
const remote = git('remote').split('\n').includes('upstream') ? 'upstream' : 'origin';
const main = `${remote}/main`;
try {
  git('fetch', '-q', remote, 'main');
} catch (e) {
  say(`Could not reach ${remote} to update main (${why(e)}). Tell the user the project may be out of date.`);
  process.exit(0);
}

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
if (branch === 'main') {
  try {
    git('merge', '--ff-only', '-q', main);
    say(`main is up to date with ${main} (${git('rev-parse', '--short', 'HEAD')}).`);
  } catch (e) {
    say(`Could not fast-forward main to ${main}: ${why(e)}. Don't start new work until this is sorted; tell the user in plain words.`);
  }
} else {
  const behind = Number(git('rev-list', '--count', `HEAD..${main}`));
  say(`On branch ${branch}. ${behind ? `${main} has ${behind} commit(s) this branch doesn't have; merge it in before sending a PR.` : `It has everything on ${main}.`} New work starts from ${main}.`);
}
