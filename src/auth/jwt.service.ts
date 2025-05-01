import { sign } from 'jsonwebtoken';
import { getEnv } from '../util/constants';

export const createToken = (input: { userId: string }) => {
  return sign(input, getEnv('JWT_SECRET')!);
};
