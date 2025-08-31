import { extname } from 'path';

export const handleFilterImageExtensions = (posts: string[]) => {
  const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
  return posts.filter((post) => validExtensions.includes(extname(post)));
};
