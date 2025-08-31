export const handleSelectorImage = () => {
  return Array.from(document.querySelectorAll('img')).map((a) => {
    const el = a as HTMLImageElement;
    return el.getAttribute('data-src') || (el.getAttribute('srcset')?.split(' ').pop() ?? '') || el.src;
  });
};
