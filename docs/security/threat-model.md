# Threat Model (Task07 Baseline)

## Assets
- Oracle signing key
- Shard data and reconstruction session state
- Proof metadata and verification decisions
- Vault transaction payloads and payout configuration
- Audit/alert logs

## Threat Scenarios
1. Shard theft
- Vector: leaked claim token, compromised client storage, replayed submit payload
- Control:
  - Session TTL + wallet signature binding
  - Duplicate submission protection
  - No secret persistence during reconstruction

2. Oracle key leakage
- Vector: hardcoded key in production, CI log leak, host compromise
- Control:
  - `ORACLE_PRIVATE_KEY` required in production
  - Rotation and revocation runbook
  - Alert on dev key usage

3. Forged proof submission
- Vector: tampered metadata, invalid location/time/hash
- Control:
  - Hash integrity checks in verifier
  - Structured reject reasons
  - Verification-only-to-sign flow

4. Frontend tampering / malicious client
- Vector: manipulated request payload, bypassing UI constraints
- Control:
  - Backend enforces all critical checks
  - EIP-712 signatures verified on-chain
  - Emergency pause for dangerous API flows

## Residual Risks
- Local JSON storage is not immutable; hash-chained audit adds evidence but not full WORM guarantees.
- Production requires managed KMS/HSM and centralized SIEM to reduce single-host risk.
