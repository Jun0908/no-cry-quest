import secrets from 'secrets.js-grempe';

export function splitSecret(secret: string, shares = 4, threshold = 4): string[] {
  const hex = secrets.str2hex(secret);
  return secrets.share(hex, shares, threshold);
}

export function combineShares(shares: string[]): string {
  const hex = secrets.combine(shares);
  return secrets.hex2str(hex);
}
