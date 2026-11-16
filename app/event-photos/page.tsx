import type { Metadata } from 'next';
import Link from 'next/link';
import EventPhotoGallery from './EventPhotoGallery';
import styles from './event-photos.module.css';

export const metadata: Metadata = { title: 'Event Photos' };

export default function EventPhotosPage() {
  return (
    <main className={styles.gallery}>
      <Link className={styles.back} href="/">← Back to the invitation</Link>
      <header className={styles.header}>
        <h1>Event Photos</h1>
      </header>
      <EventPhotoGallery only="wedding" />
    </main>
  );
}
