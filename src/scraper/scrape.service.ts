import axios from 'axios';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { createWriteStream, PathLike } from 'node:fs';
import * as fs from 'node:fs/promises';
import { extname } from 'node:path';
import path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { headerPools } from '../util/constants';
import { CreateScrapeInput } from './dto/create-scrape.dto';

export const getRandomHeaders = (baseUrl: string) => {
  const headers = headerPools[Math.floor(Math.random() * headerPools.length)];
  return {
    ...headers,
    Referer: baseUrl,
  };
};

export const scanDirectoryExistence = async (directory: string) => {
  try {
    await fs.access(directory);
    return true;
  } catch (error) {
    return false;
  }
};

export const handleScanOrCreateFolder = async (subDirectory: string): Promise<string> => {
  const directory = path.resolve(`./.downloads/${subDirectory}`);
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

export const handlePageEvaluate = async (page: Page): Promise<string[]> => {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map((a) => {
      const el = a as HTMLAnchorElement;
      return el.href;
    });
  });
};

export const handleCollectAnchors = async (page: Page) => {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map((a) => {
      const el = a as HTMLAnchorElement;
      return el.href;
    });
  });
};

export const createFileAndChangeExtension = (url: string, directory: string, idx: number) => {
  const extension = path.extname(new URL(url).pathname) || '.jpg';
  return path.join(directory, `public_${idx}_${randomUUID()}${extension}`);
};

export const sleep = async () => {
  const delay = Math.floor(Math.random() * 1500) + 3000;
  return await new Promise((resolve) => setTimeout(resolve, delay));
};

export const fuseUrl = (url: string) => {
  console.log('FUSING URL 🚀', fuseUrl.name);
  let newUrl = url;
  const hostName = new URL(url).hostname;
  console.log('NEW_URL ➡️', newUrl);
  return newUrl;
};

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

export const getResponse = async (url: string, baseUrl: string) => {
  console.log('GETTING RESPONSE FROM AXIOS 🔵', getResponse.name);
  const data = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: getRandomHeaders(baseUrl),
  });
  return data;
};

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

export const handleFilterImageExtensions = (posts: string[]) => {
  const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
  return posts.filter((post) => validExtensions.includes(extname(post)));
};

export const createHeadlessServerInstanceAndGetPosts = async (
  baseUrl: string,
  browser: Browser,
  downloadDir: string,
) => {
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });

  const posts = await handlePageEvaluate(page);
  console.log(`Found ${posts.length} images`);

  const validPosts = handleFilterImageExtensions(posts);

  await handleDownload(validPosts, downloadDir, baseUrl);
};

export const initiate = async (req: Request, res: Response): Promise<any> => {
  console.log('Started scraping...');
  const body = req.body as CreateScrapeInput;

  if (!body.domain && !body.subDirectory) {
    console.log('Not Found!');
    return;
  }

  const hasSubFolders = body.hasSubFolders;
  console.log('hasSubFolders>>>>>>>>>', hasSubFolders);

  const baseUrl = body.domain;
  console.log('base url>>>>>>>>>', baseUrl);

  const subDirectory = body.subDirectory.toLowerCase().replace(/\s+/g, '_');
  console.log('subDirectory>>>>>>>', subDirectory);

  const browser = await puppeteer.launch({ headless: true });

  try {
    if (hasSubFolders) {
      const page = await browser.newPage();

      try {
        await page.goto(baseUrl, { waitUntil: 'networkidle2' });

        const anchors = await handleCollectAnchors(page);
        const filteredAnchors = anchors.filter((anchor) => anchor.includes(`/${subDirectory}/post`));
        console.log('ANCHORS FOUND: ', filteredAnchors, filteredAnchors.length);

        const hostName = new URL(baseUrl).origin;
        console.log('HOSTNAME: ', hostName);

        for (const [i, anchor] of filteredAnchors.entries()) {
          try {
            await sleep();

            let newUrl: string;
            if (anchor.startsWith('http')) newUrl = anchor;
            else newUrl = new URL(anchor, hostName).toString();
            console.log('VISITING:', newUrl);

            const directory = await handleScanOrCreateFolder(`${subDirectory}/${randomUUID()}`);
            await createHeadlessServerInstanceAndGetPosts(newUrl, browser, directory);
          } catch (error) {
            console.error(`❌ Error processing anchor ${i}: ${anchor}`, error);
          }
        }
      } finally {
        await page.close();
      }
    } else {
      const downloadDir = await handleScanOrCreateFolder(subDirectory);
      console.log('downloadDir>>>>>', downloadDir);

      await createHeadlessServerInstanceAndGetPosts(baseUrl, browser, downloadDir);
    }
  } catch (error) {
    console.error('❌ Error in scraping process:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('Done!');
  return res.status(200).json({ message: 'OK' });
};
