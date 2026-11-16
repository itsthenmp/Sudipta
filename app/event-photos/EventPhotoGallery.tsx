'use client';

import { Download } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { downloadPhotoZip, originalPhotoUrl, thumbnailUrl, type GalleryPhoto } from './photo-downloads';
import styles from './event-photos.module.css';

const categories = [
  { id: 'wedding', label: 'Wedding' },
  { id: 'reception', label: 'Reception' },
  { id: 'other-days', label: 'Other Days' },
] as const;

export type Category = typeof categories[number]['id'];
type PhotoLists = Partial<Record<Category, GalleryPhoto[]>>;
const endpoint = process.env.NEXT_PUBLIC_EVENT_PHOTOS_ENDPOINT;
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const maxSelection = 20;

function requestUrl(base: string, category: Category, params: Record<string, string> = {}) {
  const query = new URLSearchParams({ category, ...params });
  return `${base}?${query}`;
}

export default function EventPhotoGallery({ only }: { only?: Category }) {
  const visibleCategories = only ? categories.filter(({ id }) => id === only) : categories;
  const [active, setActive] = useState<Category>(only ?? 'wedding');
  const [results, setResults] = useState<PhotoLists | null>(null);
  const [usingApi, setUsingApi] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const downloadRequest = useRef<AbortController | null>(null);
  const [selections, setSelections] = useState<Partial<Record<Category, string[]>>>({});
  const [selecting, setSelecting] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const request = new AbortController();

    async function loadPhotos() {
      if (endpoint) {
        try {
          const visible = categories.filter(({ id }) => !only || id === only);
          const entries = await Promise.all(visible.map(async ({ id }) => {
            const response = await fetch(requestUrl(endpoint, id), { cache: 'no-store', signal: request.signal });
            if (!response.ok) throw new Error('Photo service unavailable');
            const { photos } = await response.json() as { photos: string[] };
            return [id, photos.map(photo => ({ id: photo, name: photo }))] as const;
          }));
          if (request.signal.aborted) return;
          setUsingApi(true);
          setResults(Object.fromEntries(entries));
          return;
        } catch {
          if (request.signal.aborted) return;
        }
      }

      try {
        const response = await fetch(`${basePath}/event-photos.json`, { cache: 'no-cache', signal: request.signal });
        if (!response.ok) throw new Error('Photo catalog unavailable');
        const catalog = await response.json() as PhotoLists;
        if (!request.signal.aborted) setResults(catalog);
      } catch {
        if (!request.signal.aborted) setResults({});
      }
    }

    void loadPhotos();
    return () => {
      request.abort();
      downloadRequest.current?.abort();
    };
  }, [only]);

  async function downloadSelected(photos: GalleryPhoto[], category: Category) {
    if (downloadRequest.current) return;
    const request = new AbortController();
    downloadRequest.current = request;
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadPhotoZip(photos, category, request.signal);
    } catch (error) {
      if (!request.signal.aborted) {
        setDownloadError(error instanceof Error ? error.message : 'Could not download the selection.');
      }
    } finally {
      downloadRequest.current = null;
      setDownloading(false);
    }
  }

  function toggleSelection(id: Category, photo: string) {
    setSelections(previous => {
      const current = previous[id] ?? [];
      const next = current.includes(photo)
        ? current.filter(item => item !== photo)
        : [...current, photo];
      return { ...previous, [id]: next };
    });
  }

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = categories.length - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % categories.length; break;
      case 'ArrowLeft': next = (index + last) % categories.length; break;
      case 'Home': next = 0; break;
      case 'End': next = last; break;
      default: return;
    }
    event.preventDefault();
    setActive(categories[next].id);
    tabs.current[next]?.focus();
  }

  return (
    <>
      {!only && <div className={styles.tabs} role="tablist" aria-label="Photo categories">
        {categories.map(({ id, label }, index) => (
          <button key={id} type="button" role="tab" id={`tab-${id}`}
            ref={element => { tabs.current[index] = element; }}
            aria-selected={id === active} aria-controls={`photos-${id}`}
            tabIndex={id === active ? 0 : -1} onClick={() => setActive(id)}
            onKeyDown={event => moveTab(event, index)}>
            {label}
          </button>
        ))}
      </div>}

      {visibleCategories.map(({ id, label }) => {
        const photos = results?.[id] ?? [];
        const selected = selections[id] ?? [];
        const chosen = photos.filter(photo => selected.includes(photo.id));
        return (
          <section key={id} role={only ? undefined : 'tabpanel'} id={`photos-${id}`}
            aria-label={only ? label : undefined} aria-labelledby={only ? undefined : `tab-${id}`}
            tabIndex={only ? undefined : 0} hidden={id !== active}>
            {id === active && (
              !results ? <p className={styles.message} role="status">Loading photos…</p>
              : (photos.length === 0 ?
                <div className={styles.message} role="status"><h2>Coming soon</h2></div> :
                <>
                  <div className={styles.actions}>
                    <button type="button" aria-pressed={selecting} onClick={() => setSelecting(value => !value)}>
                      {selecting ? 'Done selecting' : 'Select photos'}
                    </button>
                    {chosen.length > 0 && (usingApi && endpoint ? (
                      <a href={requestUrl(endpoint, id, { zip: chosen.map(photo => photo.id).join(',') })}>
                        <Download size={16} aria-hidden="true" /> Download selected ({chosen.length})
                      </a>
                    ) : (
                      <button type="button" disabled={downloading} onClick={() => void downloadSelected(chosen, id)}>
                        <Download size={16} aria-hidden="true" /> {downloading ? 'Preparing ZIP…' : `Download selected (${chosen.length})`}
                      </button>
                    ))}
                  </div>
                  {downloadError && <p className={styles.limit} role="alert">{downloadError}</p>}
                  {selecting && selected.length === maxSelection &&
                    <p className={styles.limit} role="status">You can download up to {maxSelection} photos at a time.</p>}
                  <div className={styles.grid}>
                    {photos.map(({ id: photo }, index) => {
                      const photoLabel = `${label} photo ${index + 1}`;
                      const checked = selected.includes(photo);
                      return (
                        <div className={styles.tile} key={photo} data-selected={checked}>
                          <a className={styles.photo} href={`https://drive.google.com/file/d/${photo}/view`} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={usingApi && endpoint ? requestUrl(endpoint, id, { photo }) : thumbnailUrl(photo)} alt={photoLabel} loading="lazy" />
                          </a>
                          {selecting && <label className={styles.checkbox}>
                            <input type="checkbox" checked={checked} aria-label={`Select ${photoLabel}`}
                              disabled={!checked && selected.length >= maxSelection}
                              onChange={() => toggleSelection(id, photo)} />
                          </label>}
                          <a className={styles.download} href={usingApi && endpoint ? requestUrl(endpoint, id, { photo, download: '1' }) : originalPhotoUrl(photo)}
                            aria-label={`Download ${photoLabel}`} title="Download original">
                            <Download size={17} aria-hidden="true" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </>
              )
            )}
          </section>
        );
      })}
    </>
  );
}
