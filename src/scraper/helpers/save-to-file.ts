import { createWriteStream, PathLike } from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

export const saveToFile = async (path: PathLike, data: Iterable<any> | AsyncIterable<any>) => {
  console.log('SAVING TO FILE USING STREAM: 📁', saveToFile.name);
  const readable = Readable.from(data);
  const writeable = createWriteStream(path);
  try {
    await pipeline(readable, writeable);
    console.log('Saved: 💾', saveToFile.name, path);
  } catch (error) {
    console.error('❌ Error: ', saveToFile.name, error);
  }
};
