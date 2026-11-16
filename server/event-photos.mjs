import exifr from 'exifr';

const folders = {
  wedding: '1ShzNLPwAr-JTAGRRhz0NEJLgb2NL-cko',
  reception: '15Hq4i-vEmBhvm_-WaW6cq2cz8Tz8EDG4',
  'other-days': '19jvxm-WIhG6h7t_y7mbN6ymoUtK7oQ_P',
};
const folderMime = 'application/vnd.google-apps.folder';
const safeId = /^[\w-]{1,128}$/;
const exifCache = new Map();
const driveKey = process.env.GOOGLE_DRIVE_API_KEY;

export function readDriveEntries(html) {
  if (!html.includes('class="flip-entries"')) {
    throw new Error('Google Drive did not return a folder listing');
  }

  const entries = html.split(/<div\b[^>]*\bclass="flip-entry"[^>]*\bid="entry-([\w-]+)"[^>]*>/i);
  const files = [];
  for (let index = 1; index < entries.length; index += 2) {
    const id = entries[index];
    const entry = entries[index + 1];
    if (!safeId.test(id)) continue;
    const name = entry.match(/class="flip-entry-title"[^>]*>([^<]*)/)?.[1] || id;
    if (entry.includes(`https://drive.google.com/drive/folders/${id}`)) {
      files.push({ id, name, mimeType: folderMime });
    } else {
      const mimeType = entry.match(/src="[^"]*\/type\/(image\/[^"]+)"/i)?.[1];
      if (mimeType) files.push({ id, name, mimeType });
    }
  }
  return files;
}

async function listChildren(folder, signal) {
  if (!driveKey) {
    const url = new URL('https://drive.google.com/embeddedfolderview');
    url.searchParams.set('id', folder);
    const response = await fetch(url, { cache: 'no-store', signal });
    if (!response.ok) throw new Error('Google Drive could not load the folder');
    return readDriveEntries(await response.text());
  }

  const files = [];
  let pageToken;
  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `'${folder}' in parents and trashed = false`);
    url.searchParams.set('fields', 'nextPageToken,files(id,name,mimeType,createdTime,imageMediaMetadata(time))');
    url.searchParams.set('pageSize', '1000');
    url.searchParams.set('key', driveKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url, { cache: 'no-store', signal });
    if (!response.ok) throw new Error('Google Drive API could not load the folder');
    const page = await response.json();
    files.push(...page.files);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return files;
}

export async function flattenPhotos(folder, children) {
  const visited = new Set();
  const photos = new Map();
  let pending = [folder];
  while (pending.length) {
    const batch = pending.splice(0, 5).filter(id => {
      if (visited.has(id)) return false;
      visited.add(id);
      return true;
    });
    const lists = await Promise.all(batch.map(children));
    for (const entry of lists.flat()) {
      if (!safeId.test(entry.id)) continue;
      if (entry.mimeType === folderMime) pending.push(entry.id);
      else if (entry.mimeType.startsWith('image/')) photos.set(entry.id, entry);
    }
  }
  return [...photos.values()];
}

export async function fetchOriginal(id, signal, range) {
  const url = new URL('https://drive.google.com/uc');
  url.searchParams.set('export', 'download');
  url.searchParams.set('id', id);
  const response = await fetch(url, { signal, headers: range ? { Range: range } : {} });
  const type = response.headers.get('content-type')?.split(';')[0];
  if (response.ok && response.body && (type?.startsWith('image/') || type === 'application/octet-stream')) return response;
  await response.body?.cancel();
  throw new Error('Google Drive could not return the original image');
}

function fileTime(value, offset = '+05:30') {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3').replace(' ', 'T');
  const zoned = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : normalized + offset;
  const result = Date.parse(zoned);
  return Number.isFinite(result) ? result : null;
}

async function readCaptureTime(id) {
  if (exifCache.get(id)?.expires > Date.now()) return exifCache.get(id).time;
  try {
    const response = await fetchOriginal(id, AbortSignal.timeout(5000), 'bytes=0-131071');
    const reader = response.body.getReader();
    const data = Buffer.alloc(131072);
    let size = 0;
    try {
      while (size < data.length) {
        const chunk = await reader.read();
        if (chunk.done) break;
        const portion = chunk.value.subarray(0, data.length - size);
        data.set(portion, size);
        size += portion.length;
      }
    } finally {
      await reader.cancel();
    }

    const metadata = await exifr.parse(data.subarray(0, size), {
      pick: ['DateTimeOriginal', 'OffsetTimeOriginal', 'CreateDate', 'OffsetTimeDigitized'],
      reviveValues: false,
    });
    const time = fileTime(metadata?.DateTimeOriginal, metadata?.OffsetTimeOriginal)
      ?? fileTime(metadata?.CreateDate, metadata?.OffsetTimeDigitized);
    if (exifCache.size >= 2048) exifCache.delete(exifCache.keys().next().value);
    exifCache.set(id, { time, expires: Date.now() + 10 * 60_000 });
    return time;
  } catch {
    return null;
  }
}

export function sortEventPhotos(files) {
  return [...files].sort((a, b) =>
    (a.time ?? Infinity) - (b.time ?? Infinity)
      || a.name.localeCompare(b.name, 'en', { numeric: true })
      || a.id.localeCompare(b.id)
  );
}

export async function listEventPhotos(category, { ordered = true } = {}) {
  if (typeof category !== 'string' || !Object.hasOwn(folders, category)) return null;
  const signal = AbortSignal.timeout(12000);
  const files = await flattenPhotos(folders[category], id => listChildren(id, signal));
  if (!ordered) return files;

  const dated = [];
  // Bound the number of simultaneous reads when several photographers upload at once.
  for (let index = 0; index < files.length; index += 12) {
    const batch = await Promise.all(files.slice(index, index + 12).map(async file => ({
      ...file,
      time: fileTime(file.imageMediaMetadata?.time)
        ?? await readCaptureTime(file.id)
        ?? fileTime(file.createdTime),
    })));
    dated.push(...batch);
  }
  return sortEventPhotos(dated);
}

export async function fetchEventThumbnail(id) {
  const url = new URL('https://drive.google.com/thumbnail');
  url.searchParams.set('id', id);
  url.searchParams.set('sz', 'w800');
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const type = response.headers.get('content-type')?.split(';')[0];
  if (response.ok && /^image\/(jpeg|png|webp|gif|avif)$/.test(type ?? '')) return response;
  await response.body?.cancel();
  return null;
}
