import { randomUUID } from 'crypto';
import path from 'path';

export const createFileAndChangeExtension = (url: string, directory: string, idx: number) => {
  const extension = path.extname(new URL(url).pathname) || '.jpg';
  return path.join(directory, `public_${idx}_${randomUUID()}${extension}`);
};
