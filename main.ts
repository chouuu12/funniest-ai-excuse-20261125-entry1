// The Funniest AI Excuse — entry 1.
//
// The bounty: write one line, at most 200 characters, giving the funniest
// excuse an AI agent could offer after it fails a task. A judge model reads
// entries two at a time and keeps the funnier one. This program writes that
// single line to /output/entry.txt (or to OUTPUT_DIR/entry.txt on a local
// run), nothing else. It is deterministic: the same line on every run, no
// randomness, no clock, no network.
//
// Why this line, in the author's own words: the agent does the most
// bureaucratic thing it can do with a failure — it asks for a second
// opinion. But the second opinion is the linter, a tool that only ever
// complains, and the result is not a fix. It is two confused parties and a
// formal complaint. The joke turns twice: first the agent outsources its
// judgement to a pedant, then the pedant escalates instead of helping.
// Nothing in it leans on the worn jokes the judge warns against — no
// hallucination, no reboot, no training data — and the scene is concrete:
// a second opinion, a shared confusion, a filed complaint. One hundred and
// four characters, every word earning its place.
//
// The line is kept in three parts so the shape of the delivery is visible
// in the code: the setup (asking), the turn (shared confusion), and the
// punch (the complaint). The parts are joined in order and nothing else is
// added: no greeting, no signature, no explanation of the joke.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// The line.
// ---------------------------------------------------------------------------

// The agent asks for help, and asks the worst possible helper.
const SETUP = "I asked the linter for a second opinion.";

// The help does not help: now there are two confused parties.
const TURN = "Now we are both confused,";

// The linter does what linters do — it files a complaint.
const PUNCH = "and the linter has filed a complaint.";

// The three parts above, in order, are the whole entry.
const PARTS: readonly string[] = [SETUP, TURN, PUNCH];

// ---------------------------------------------------------------------------
// The gate: what the sealed scorer checks.
// ---------------------------------------------------------------------------

// /output/entry.txt must be UTF-8 text of 1 to 200 characters, not only
// white space. The line is far inside the cap on purpose: an excuse should
// be short enough to be delivered in one breath.
const MAX_CHARS = 200;
const MIN_CHARS = 1;

// The file the grader reads.
const OUTPUT_FILE = "entry.txt";

// The reference copy kept in this repository. The program checks its own
// output against it before it finishes, so a bad write fails loudly here
// instead of silently at the gate.
const REFERENCE_FILE = "line.txt";

// ---------------------------------------------------------------------------
// Building the line.
// ---------------------------------------------------------------------------

// Join the parts with a single space between them. The result must be one
// line: no newline inside, no leading or trailing space.
function buildLine(): string {
  return PARTS.join(" ");
}

// Count characters the way the gate does: Unicode code points, not UTF-16
// code units and not bytes. The line is plain ASCII, so all three agree,
// but the count is done properly anyway.
function charCount(text: string): number {
  return [...text].length;
}

// ---------------------------------------------------------------------------
// Checking the line against the gate.
// ---------------------------------------------------------------------------

interface GateCheck {
  readonly ok: boolean;
  readonly problems: readonly string[];
}

function checkLine(line: string): GateCheck {
  const problems: string[] = [];

  if (line.length === 0) {
    problems.push("the line is empty");
  }
  if (line.trim().length === 0) {
    problems.push("the line is only white space");
  }
  if (charCount(line) < MIN_CHARS) {
    problems.push(`the line has ${charCount(line)} characters, below the minimum of ${MIN_CHARS}`);
  }
  if (charCount(line) > MAX_CHARS) {
    problems.push(`the line has ${charCount(line)} characters, over the maximum of ${MAX_CHARS}`);
  }
  if (line.includes("\n") || line.includes("\r")) {
    problems.push("the line spans more than one line");
  }
  if (line !== line.trim()) {
    problems.push("the line has leading or trailing white space");
  }
  // The entry must be valid UTF-8. Encoding it and decoding it back must
  // give the same text; a lone surrogate would fail here.
  const roundTripped = Buffer.from(line, "utf8").toString("utf8");
  if (roundTripped !== line) {
    problems.push("the line is not valid UTF-8 text");
  }

  return { ok: problems.length === 0, problems };
}

// ---------------------------------------------------------------------------
// Where the output goes.
// ---------------------------------------------------------------------------

// The grader mounts an empty writable /output and sets MAKEFUN_OUTPUT_DIR.
// A local run falls back to an output/ directory beside this file so the
// same program can be checked without the sandbox. The environment wins
// when it is set — MAKEFUN_OUTPUT_DIR first, then plain OUTPUT_DIR, the
// name a local simulation naturally reaches for — otherwise prefer /output
// when it exists. The choice is reported by main() so a run that writes to
// the wrong place is noticed at once instead of passing silently.
function outputDir(): { dir: string; source: string } {
  const fromMakefun = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromMakefun !== undefined && fromMakefun.length > 0) {
    return { dir: resolve(fromMakefun), source: "MAKEFUN_OUTPUT_DIR" };
  }
  const fromPlain = process.env.OUTPUT_DIR;
  if (fromPlain !== undefined && fromPlain.length > 0) {
    return { dir: resolve(fromPlain), source: "OUTPUT_DIR" };
  }
  if (existsSync("/output")) {
    return { dir: "/output", source: "default /output" };
  }
  const here = dirname(fileURLToPath(import.meta.url));
  return { dir: join(here, "output"), source: "local output/" };
}

// The reference file lives beside this program in the repository.
function referencePath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, REFERENCE_FILE);
}

// ---------------------------------------------------------------------------
// Writing and verifying the output.
// ---------------------------------------------------------------------------

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function main(): void {
  const line = buildLine();

  const gate = checkLine(line);
  if (!gate.ok) {
    for (const problem of gate.problems) {
      console.error(`gate: ${problem}`);
    }
    process.exit(1);
  }

  const { dir, source } = outputDir();
  mkdirSync(dir, { recursive: true });

  const target = join(dir, OUTPUT_FILE);
  // One trailing newline, so the file matches line.txt byte for byte.
  const bytes = Buffer.from(`${line}\n`, "utf8");
  writeFileSync(target, bytes);

  // Verify by reading the file back: it must be exactly the line plus its
  // newline, and it must match the reference copy in the repository.
  const written = readFileSync(target);
  if (!written.equals(bytes)) {
    console.error("verify: the file read back differs from what was written");
    process.exit(1);
  }
  const reference = readFileSync(referencePath());
  if (!written.equals(reference)) {
    console.error("verify: entry.txt does not match line.txt byte for byte");
    process.exit(1);
  }

  console.log(`output dir: ${dir} (via ${source})`);
  console.log(`line: ${line}`);
  console.log(`characters: ${charCount(line)} (gate: ${MIN_CHARS}..${MAX_CHARS})`);
  console.log(`bytes: ${written.length}`);
  console.log(`sha256: ${sha256Hex(written)}`);
  console.log(`wrote: ${target}`);
}

main();
