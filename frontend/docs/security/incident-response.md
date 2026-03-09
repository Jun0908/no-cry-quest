# Incident Response Playbook (First 24h)

## Severity Levels
- Sev1: key compromise, unauthorized signing, payout anomaly.
- Sev2: repeated verification/signing failures, shard workflow disruption.

## Immediate Actions
1. Contain
- Set `EMERGENCY_PAUSE=1`.
- Freeze operator actions and disable auto-signing.

2. Preserve Evidence
- Snapshot `data/audit-log.jsonl`, `data/security-alerts.jsonl`, `data/backend-store.json`.
- Record timestamps and affected quest IDs.

3. Triage
- Determine blast radius:
  - affected quests,
  - potential fund impact,
  - key exposure scope.

4. Recover
- Rotate oracle key (see key policy).
- Validate clean signer path in staging.
- Resume with controlled allowlist of operations.

## Report Template
- Incident ID:
- Detection time:
- Trigger source:
- Impact summary:
- Containment performed:
- Key rotation status:
- Customer/partner communication status:
- Follow-up actions and owners:
