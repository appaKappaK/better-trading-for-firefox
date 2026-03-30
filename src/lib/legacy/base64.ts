export function encodeUtf8Base64(input: string) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'utf8').toString('base64');
  }

  const bytes = new TextEncoder().encode(input);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export function decodeUtf8Base64(input: string) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'base64').toString('utf8');
  }

  const binary = atob(input);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeLatin1Base64(input: string) {
  if (typeof atob === 'function') {
    return atob(input);
  }

  return Buffer.from(input, 'base64').toString('latin1');
}
