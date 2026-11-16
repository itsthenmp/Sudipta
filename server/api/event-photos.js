import { once } from 'node:events';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Zip, ZipPassThrough } from 'fflate';
import { fetchEventThumbnail, fetchOriginal, listEventPhotos } from '../event-photos.mjs';

const maxSelection = 20;

function downloadName(photo, index) {
  const name = photo.name.replace(/[\x00-\x1f\x7f/\\:*?"<>|]+/g, '_').slice(0, 180);
  return index === undefined ? name : `${String(index + 1).padStart(2, '0')}-${name}`;
}

function attachment(response, filename) {
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, char => '%' + char.charCodeAt(0).toString(16));
  response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encoded}`);
}

async function sendZip(response, files, category) {
  const controller = new AbortController();
  const stop = () => controller.abort();
  response.once('close', stop);
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(55000)]);

  try {
    const first = await fetchOriginal(files[0].id, signal);
    response.setHeader('Content-Type', 'application/zip');
    attachment(response, `${category}-photos.zip`);
    const zip = new Zip((error, bytes, complete) => {
      if (error) response.destroy(error);
      else if (complete) response.end(bytes);
      else response.write(bytes);
    });

    for (const [index, photo] of files.entries()) {
      const original = index === 0 ? first : await fetchOriginal(photo.id, signal);
      const entry = new ZipPassThrough(downloadName(photo, index));
      zip.add(entry);
      for await (const chunk of Readable.fromWeb(original.body)) {
        entry.push(chunk);
        if (response.writableNeedDrain) await once(response, 'drain', { signal });
        signal.throwIfAborted();
      }
      entry.push(new Uint8Array(), true);
    }
    zip.end();
  } finally {
    response.off('close', stop);
  }
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { category, photo, download, zip } = request.query;
  if (zip !== undefined && typeof zip !== 'string') {
    return response.status(400).json({ error: 'Invalid photo selection' });
  }
  const selected = zip === undefined ? [] : [...new Set(zip.split(','))];
  if (zip !== undefined && (selected.length > maxSelection || selected.some(id => !/^[\w-]{1,128}$/.test(id)))) {
    return response.status(400).json({ error: `Choose up to ${maxSelection} photos` });
  }

  try {
    const listing = selected.length === 0 && photo === undefined;
    const photos = await listEventPhotos(category, { ordered: listing });
    if (photos === null) return response.status(404).json({ error: 'Unknown photo category' });
    if (listing) return response.status(200).json({ photos: photos.map(file => file.id) });

    const files = new Map(photos.map(file => [file.id, file]));
    if (selected.length) {
      if (!selected.every(id => files.has(id))) return response.status(404).json({ error: 'A selected photo is no longer available' });
      await sendZip(response, selected.map(id => files.get(id)), category);
      return;
    }

    const file = files.get(photo);
    if (!file) return response.status(404).end();
    const image = download === '1'
      ? await fetchOriginal(file.id, AbortSignal.timeout(45000))
      : await fetchEventThumbnail(file.id);
    if (!image?.body) return response.status(502).end();
    if (download === '1') {
      attachment(response, downloadName(file));
      response.setHeader('Content-Type', 'application/octet-stream');
    } else {
      response.setHeader('Content-Type', image.headers.get('content-type'));
    }
    await pipeline(Readable.fromWeb(image.body), response);
  } catch {
    if (response.destroyed) return;
    if (response.headersSent) return response.destroy();
    return response.status(502).json({ error: 'Could not load this photo category or download' });
  }
}
