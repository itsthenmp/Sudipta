export type GalleryPhoto = { id: string; name: string };

export function originalPhotoUrl(id: string) {
  const query = new URLSearchParams({ id, export: 'download', confirm: 't' });
  return `https://drive.usercontent.google.com/download?${query}`;
}

export function thumbnailUrl(id: string) {
  return `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w800`;
}

const maxBytes = 150 * 1024 * 1024;

export async function downloadPhotoZip(photos: GalleryPhoto[], category: string, signal: AbortSignal) {
  const { Zip, ZipPassThrough } = await import('fflate');
  const parts: BlobPart[] = [];
  let zipError: Error | undefined;
  let size = 0;
  const zip = new Zip((error, chunk) => {
    if (error) zipError = error;
    else parts.push(new Uint8Array(chunk));
  });

  try {
    for (const [index, photo] of photos.entries()) {
      const response = await fetch(originalPhotoUrl(photo.id), { signal });
      const type = response.headers.get('content-type')?.split(';')[0] ?? '';
      if (!response.ok || !response.body || (!type.startsWith('image/') && type !== 'application/octet-stream')) {
        await response.body?.cancel();
        throw new Error('A selected photo could not be downloaded. Try again or download it individually.');
      }
      if (size + Number(response.headers.get('content-length')) > maxBytes) {
        await response.body.cancel();
        throw new Error('This selection is over 150 MB. Choose fewer photos and try again.');
      }

      const filename = photo.name.replace(/[\x00-\x1f\x7f/\\:*?"<>|]+/g, '_');
      const entry = new ZipPassThrough(`${String(index + 1).padStart(2, '0')}-${filename}`);
      zip.add(entry);
      const reader = response.body.getReader();
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.length;
          if (size > maxBytes) throw new Error('This selection is over 150 MB. Choose fewer photos and try again.');
          entry.push(chunk.value);
          if (zipError) throw zipError;
        }
      } finally {
        await reader.cancel();
      }
      entry.push(new Uint8Array(), true);
    }
    zip.end();
    if (zipError) throw zipError;

    const url = URL.createObjectURL(new Blob(parts, { type: 'application/zip' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${category}-photos.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  } finally {
    zip.terminate();
  }
}
