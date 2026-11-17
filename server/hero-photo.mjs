const folderId = '1yPqNa7F5y8LqtY2kMolfGJ9GdubVIccT';

function decodeTitle(title) {
  return title.replace(/&(?:#(\d+)|#x([\da-f]+)|amp|lt|gt|quot|apos);/gi, (entity, decimal, hex) => {
    const point = decimal ? Number(decimal) : hex ? Number.parseInt(hex, 16) : NaN;
    if (Number.isInteger(point) && point >= 0 && point <= 0x10ffff) return String.fromCodePoint(point);
    return ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" })[entity] ?? entity;
  });
}

export function selectHeroPhoto(html, random = Math.random) {
  if (!/class="[^"]*\bflip-contents\b/.test(html)) {
    throw new Error('Google Drive did not return a public folder listing');
  }
  const weddings = [];
  let fallback = null;
  const entries = html.split(/<div\b[^>]*\bclass="flip-entry"[^>]*\bid="entry-([\w-]+)"[^>]*>/i);
  for (let index = 1; index < entries.length; index += 2) {
    const id = entries[index];
    const entry = entries[index + 1];
    const title = entry.match(/<div\b[^>]*\bclass="flip-entry-title"[^>]*>([^<]*)<\/div>/i)?.[1];
    if (!title || !/src="[^"]*\/type\/image\//i.test(entry)) continue;
    const name = decodeTitle(title).trim().toLowerCase();
    if (name === 'default.jpg') fallback ??= id;
    if (name.includes('wedding')) weddings.push(id);
  }
  return {
    photo: weddings.length ? weddings[Math.floor(random() * weddings.length)] : fallback,
    fallback,
  };
}

export async function lookupHeroPhoto() {
  const url = new URL('https://drive.google.com/embeddedfolderview');
  url.searchParams.set('id', folderId);
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(`Google Drive returned ${response.status}`);
  return selectHeroPhoto(await response.text());
}

// Stream the public thumbnail as a fallback for browsers that block Drive's redirect.
export async function fetchHeroThumbnail(id) {
  if (typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id)) return null;
  const url = new URL('https://drive.google.com/thumbnail');
  url.searchParams.set('id', id);
  url.searchParams.set('sz', 'w1600');
  const image = await fetch(url, { signal: AbortSignal.timeout(6000) });
  const contentType = image.headers.get('content-type')?.split(';')[0];
  return image.ok && /^(image\/(jpeg|png|webp|gif|avif))$/.test(contentType ?? '') ? image : null;
}
