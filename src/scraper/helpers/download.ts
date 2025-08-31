import { sleep } from '../scrape.service';
import { getResponse } from './axios-response';
import { createFileAndChangeExtension } from './create-file-extension';
import { saveToFile } from './save-to-file';

export const handleDownload = async (posts: string[], downloadDir: string, baseUrl: string) => {
  for (const [i, url] of posts.entries()) {
    console.log('URL ➡️', url);
    try {
      await sleep();
      const filePath = createFileAndChangeExtension(url, downloadDir, i);
      const { data } = await getResponse(url, baseUrl);
      saveToFile(filePath, data);
    } catch (error) {
      console.log('❌ FAILED TO SAVE!', handleDownload.name, url);
    }
  }
};
