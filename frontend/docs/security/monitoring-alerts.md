# Monitoring and Alerts Baseline

## Log Sources
- `data/audit-log.jsonl` (hash-chained audit records)
- `data/security-alerts.jsonl` (derived alerts)

## Alert Conditions
1. `DEV_KEY_IN_USE` (critical)
- Condition: signature issued with development key warning.
- Action: stop signing, rotate key, investigate config leak.

2. `REPEATED_FAILURES` (warn)
- Condition: >=3 verification/signature failures for same quest within 10 minutes.
- Action: inspect payload validity and abuse patterns.

3. `SIGNATURE_FAILURE` (warn)
- Condition: any signature issuance failure.
- Action: check nonce, quest state, key health, and API misuse.

## API
- `GET /api/security/alerts?limit=50`
- Returns: pause state and recent alerts for operator dashboard.

## Retention
- Audit logs: minimum 180 days.
- Security alerts: minimum 365 days.
- Export weekly snapshot to immutable storage (S3 Object Lock or equivalent).
