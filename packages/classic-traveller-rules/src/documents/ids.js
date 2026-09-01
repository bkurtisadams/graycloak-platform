function hash32(text, seed) {
  let hash = seed >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function stableDocumentId(prefix, seed) {
  if (typeof prefix !== 'string' || !/^[a-z][a-z0-9-]*$/.test(prefix)) {
    throw new TypeError('prefix must be a lowercase identifier');
  }
  if (typeof seed !== 'string' || !seed.length) throw new TypeError('seed must be a nonblank string');
  return `${prefix}-${hash32(seed, 0x811c9dc5)}${hash32(seed, 0x9e3779b9)}`;
}
