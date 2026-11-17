import { writeFile } from 'node:fs/promises';
import { lookupHeroPhoto } from '../server/hero-photo.mjs';

const selection = await lookupHeroPhoto();
await writeFile(new URL('../public/hero-photo.json', import.meta.url), JSON.stringify(selection) + '\n');
