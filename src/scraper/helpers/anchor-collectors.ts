import { Page } from 'puppeteer';

export const handleCollectAnchors = async (page: Page) => {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map((a) => {
      const el = a as HTMLAnchorElement;
      return el.href;
    });
  });
};
