let cspNonce: string | undefined;

export function setCspNonce(nonce: string | undefined) {
  cspNonce = nonce;
}

export function getCspNonce(): string | undefined {
  return cspNonce;
}