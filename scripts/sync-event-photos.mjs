import { writeFile } from 'node:fs/promises';
import { listEventPhotos } from '../server/event-photos.mjs';

const categories = ['wedding', 'reception', 'other-days'];
const only = process.env.EVENT_PHOTO_CATEGORY;
if (only && !categories.includes(only)) throw new Error('Unknown Event Photos category');
const visible = only ? [only] : categories;

const catalog = Object.fromEntries(await Promise.all(visible.map(async category => {
  const photos = await listEventPhotos(category);
  console.log(`${category}: ${photos.length} photos`);
  return [category, photos.map(({ id, name }) => ({ id, name }))];
})));

await writeFile(new URL('../public/event-photos.json', import.meta.url), JSON.stringify(catalog) + '\n');
