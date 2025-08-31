export const handleSelectorAnchor = () => {
  return Array.from(document.querySelectorAll('a')).map((a) => {
    const el = a as HTMLAnchorElement;
    return el.href;
  });
};
