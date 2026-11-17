// What every scan needs to know, built the same way for the CLI and the tests.
import { createIdentityMatcher, identityRules, identityTokens, matchCase } from './identity.mjs'
import { canaries } from './leaks.mjs'

/**
 * identity: the identity list. rules: the rules redact used, when known (so
 * cleaned paths use the same placeholders). originals: raw values already
 * redacted. aiNames: removed AI commands and agents.
 */
export function scanContext(identity, { rules = identityRules(identity), originals = [], aiNames = [] } = {}) {
  const matcher = createIdentityMatcher(rules)
  const thirdParty = identity.mode === 'third-party'
  // Contributors' emails are caught by the email pattern wherever they appear; as byte-level
  // canaries only the operator's own emails count, which keeps big projects fast.
  const emails = thirdParty ? identity.operator?.emails ?? [] : identity.emails
  return {
    identity,
    matcher,
    keepNotices: thirdParty,
    cleanPath: (p) => matcher.replace(p, (m, rule) => matchCase(m, rule.placeholder)),
    aiNames,
    originals: canaries(originals),
    allValues: canaries(rules.map((r) => r.literal), emails, identity.literals.map((l) => l.value), originals),
    tokens: identityTokens(identity),
  }
}
