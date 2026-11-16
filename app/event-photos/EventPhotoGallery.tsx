'use client';

import { Download } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import styles from './event-photos.module.css';

const categories = [
  { id: 'wedding', label: 'Wedding', folder: '1ShzNLPwAr-JTAGRRhz0NEJLgb2NL-cko' },
  { id: 'reception', label: 'Reception', folder: '15Hq4i-vEmBhvm_-WaW6cq2cz8Tz8EDG4' },
  { id: 'other-days', label: 'Other Days', folder: '19jvxm-WIhG6h7t_y7mbN6ymoUtK7oQ_P' },
] as const;

export type Category = typeof categories[number]['id'];
type PhotoList = { state: 'error' } | { state: 'ready'; photos: string[] };
const endpoint = process.env.NEXT_PUBLIC_EVENT_PHOTOS_ENDPOINT;

const maxSelection = 20;

function requestUrl(base: string, category: Category, params: Record<string, string> = {}) {
  const query = new URLSearchParams({ category, ...params });
  return `${base}?${query}`;
}

export default function EventPhotoGallery({ only }: { only?: Category }) {
  const visibleCategories = only ? categories.filter(({ id }) => id === only) : categories;
  const [active, setActive] = useState<Category>(only ?? 'wedding');
  const [results, setResults] = useState<Partial<Record<Category, PhotoList>>>({});
  const [selections, setSelections] = useState<Partial<Record<Category, string[]>>>({});
  const [selecting, setSelecting] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!endpoint) return;
    const request = new AbortController();

    for (const { id } of categories) {
      if (only && id !== only) continue;
      fetch(requestUrl(endpoint, id), { cache: 'no-store', signal: request.signal })
        .then(async response => {
          if (!response.ok) throw new Error('Could not load photos');
          const { photos } = await response.json() as { photos: string[] };
          if (!request.signal.aborted) {
            setResults(previous => ({ ...previous, [id]: { state: 'ready', photos } }));
          }
        })
        .catch(() => {
          if (!request.signal.aborted) setResults(previous => ({ ...previous, [id]: { state: 'error' } }));
        });
    }
    return () => request.abort();
  }, [only]);

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

      {visibleCategories.map(({ id, label, folder }) => {
        const result = results[id];
        const selected = selections[id] ?? [];
        return (
          <section key={id} role={only ? undefined : 'tabpanel'} id={`photos-${id}`}
            aria-label={only ? label : undefined} aria-labelledby={only ? undefined : `tab-${id}`}
            tabIndex={only ? undefined : 0} hidden={id !== active}>
            {id === active && (
              !endpoint ? <iframe className={styles.embed} title={`${label} photos`}
                src={`https://drive.google.com/embeddedfolderview?id=${folder}#grid`} />
              : !result ? <p className={styles.message} role="status">Loading photos…</p>
              : (result.state === 'error' || result.photos.length === 0 ?
                <div className={styles.message} role="status"><h2>Coming soon</h2></div> :
                <>
                  <div className={styles.actions}>
                    <button type="button" aria-pressed={selecting} onClick={() => setSelecting(value => !value)}>
                      {selecting ? 'Done selecting' : 'Select photos'}
                    </button>
                    {selected.length > 0 && (
                      <a href={requestUrl(endpoint, id, { zip: result.photos.filter(photo => selected.includes(photo)).join(',') })}>
                        <Download size={16} aria-hidden="true" /> Download selected ({selected.length})
                      </a>
                    )}
                  </div>
                  {selecting && selected.length === maxSelection &&
                    <p className={styles.limit} role="status">You can download up to {maxSelection} photos at a time.</p>}
                  <div className={styles.grid}>
                    {result.photos.map((photo, index) => {
                      const photoLabel = `${label} photo ${index + 1}`;
                      const checked = selected.includes(photo);
                      return (
                        <div className={styles.tile} key={photo} data-selected={checked}>
                          <a className={styles.photo} href={`https://drive.google.com/file/d/${photo}/view`} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={requestUrl(endpoint, id, { photo })} alt={photoLabel} loading="lazy" />
                          </a>
                          {selecting && <label className={styles.checkbox}>
                            <input type="checkbox" checked={checked} aria-label={`Select ${photoLabel}`}
                              disabled={!checked && selected.length >= maxSelection}
                              onChange={() => toggleSelection(id, photo)} />
                          </label>}
                          <a className={styles.download} href={requestUrl(endpoint, id, { photo, download: '1' })}
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
