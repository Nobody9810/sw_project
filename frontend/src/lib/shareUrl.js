// Decode UTF-8 text for sharing, preserving escaped separators, spaces and "%".
// Decoding those ASCII bytes could change which page or query a link refers to.
export function readableShareUrl(url) {
  return url.replace(/(?:%[89a-f][0-9a-f])+/gi, encoded => {
    try {
      return decodeURIComponent(encoded)
    } catch {
      return encoded
    }
  })
}
