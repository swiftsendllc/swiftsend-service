import * as fs from 'node:fs/promises';
import path from 'node:path';

export const scanDirectoryExistence = async (directory: string) => {
  try {
    await fs.access(directory);
    return true;
  } catch (error) {
    return false;
  }
};

export const handleScanOrCreateFolder = async (subDirectory: string): Promise<string> => {
  const directory = path.resolve(`./downloads/${subDirectory}`);
  try {
    const exists = await scanDirectoryExistence(directory);
    if (!exists) {
      const newDirectory = await fs.mkdir(directory, { recursive: true });
      return newDirectory as string;
    }
  } catch (error) {
    console.error('Error while creating directory: ', directory, error);
  }
  return directory;
};
