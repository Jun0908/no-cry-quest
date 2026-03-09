# Oracle Key Management Policy

## Scope
Applies to all keys used by Oracle signing flows (`verify`, `unlock`).

## Storage Rules
- Development: `.env` only for local testing.
- Production: KMS/HSM managed key; plaintext private key files are prohibited.
- Never commit keys to repository or logs.

## Rotation Rules
- Planned rotation: every 90 days.
- Emergency rotation: within 1 hour after suspected compromise.
- Rotation steps:
  1. Generate new key in KMS/HSM.
  2. Update signer service configuration.
  3. Update on-chain oracle address by owner transaction.
  4. Verify signature compatibility on staging.
  5. Invalidate old key and archive incident note.

## Revocation Rules
- Trigger:
  - suspected leak,
  - unexplained signature failure bursts,
  - host compromise.
- Action:
  - set `EMERGENCY_PAUSE=1`,
  - revoke old key,
  - switch to rotated key,
  - document timeline and blast radius.

## Enforcement in Code
- Production denies missing `ORACLE_PRIVATE_KEY`.
- Alert generated when development key warning appears in signed responses.
