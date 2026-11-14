// Every finding that is not fixed needs an explicit decision with a specific
// reason. There is no blanket override: a decision names one finding id, or
// one rule plus a file glob, and every decision is listed in the report.
import path from 'node:path'
import { globToRegExp, readJson, writeJson } from './files.mjs'

/** Findings that no reason can excuse. */
export const NOT_ALLOWABLE = new Set([
  'ai-tooling-file', // the export must not contain AI assistant configuration
  'redacted-value-left', // a value already judged sensitive is still there
  'final-check-missing', // the export was never tested after cleaning
  'final-check-stale', // files changed after the last test run
])

const VAGUE = /^(ok|okay|fine|n\/?a|na|none|not applicable|false positive|fp|needed|needed for (the )?tests?|keep|kept|allow|allowed|ignore|irrelevant|not pii|not an issue|no issue|safe)\.?$/i
const MIN_REASON = 15

function file(workRoot) {
  return path.join(workRoot, 'decisions.json')
}

export function loadDecisions(workRoot) {
  return readJson(file(workRoot), { byId: {}, byRule: [] })
}

export function validateReason(reason) {
  const r = (reason ?? '').trim()
  if (r.length < MIN_REASON || VAGUE.test(r)) {
    throw new Error(`reason too vague: "${r}". Say what the value is and why keeping it leaks nothing (at least ${MIN_REASON} characters).`)
  }
  return r
}

/** Records a decision. `findings` is the latest scan, used to check the decision matches something. */
export function addDecision(workRoot, { id, rule, glob }, reason, findings) {
  const why = validateReason(reason)
  const decisions = loadDecisions(workRoot)
  const at = new Date().toISOString()
  if (id) {
    const f = findings.find((x) => x.id === id)
    if (!f) throw new Error(`no finding ${id} in the latest scan. Run "scan" and copy an id from its output.`)
    if (NOT_ALLOWABLE.has(f.rule)) throw new Error(`"${f.rule}" cannot be allowed: fix it instead.`)
    decisions.byId[id] = { rule: f.rule, file: f.file, value: f.value, reason: why, at }
    writeJson(file(workRoot), decisions)
    return [f]
  }
  if (!rule) throw new Error('pass a finding id, or --rule <rule> with an optional --file <glob>')
  if (NOT_ALLOWABLE.has(rule)) throw new Error(`"${rule}" cannot be allowed: fix it instead.`)
  const g = glob || '**'
  const re = globToRegExp(g)
  const matched = findings.filter((f) => f.rule === rule && re.test(f.file))
  if (!matched.length) throw new Error(`--rule ${rule} --file ${g} matches no finding in the latest scan.`)
  decisions.byRule.push({ rule, glob: g, reason: why, at, matched: matched.length })
  writeJson(file(workRoot), decisions)
  return matched
}

export function decisionFor(finding, decisions) {
  if (NOT_ALLOWABLE.has(finding.rule)) return null
  const byId = decisions.byId[finding.id]
  if (byId) return byId.reason
  const byRule = decisions.byRule.find((d) => d.rule === finding.rule && globToRegExp(d.glob).test(finding.file))
  return byRule?.reason ?? null
}

/** Findings that still need a fix or a decision. Fixtures never do. */
export function unresolved(findings, decisions) {
  return findings.filter((f) => f.severity !== 'fixture' && !decisionFor(f, decisions))
}
