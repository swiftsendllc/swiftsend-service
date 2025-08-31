import axios from 'axios';
import { headerPools } from '../../util/constants';

export const getResponse = async (url: string, baseUrl: string) => {
  console.log('GETTING RESPONSE FROM AXIOS 🔵', getResponse.name);
  const fusedUrl = fuseUrl(url);
  const data = await axios.get(fusedUrl, {
    responseType: 'arraybuffer',
    headers: getRandomHeaders(baseUrl),
  });
  return data;
};

export const getRandomHeaders = (baseUrl: string) => {
  const headers = headerPools[Math.floor(Math.random() * headerPools.length)];
  return {
    ...headers,
    Referer: baseUrl,
  };
};

export const fuseUrl = (url: string) => {
  console.log('FUSING URL 🚀', fuseUrl.name);
  let newUrl = url;
  const hostName = new URL(url).hostname;
  console.log('NEW_URL ➡️', newUrl);
  return newUrl;
};
