import { sign } from 'jsonwebtoken';
import { ENV } from '../util/constants';

export const createToken = (input: { userId: string }) => {
  return sign(input, ENV("JWT_SECRET")!);
};
