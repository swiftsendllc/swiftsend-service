import { sign } from 'jsonwebtoken';
import { configService } from '../util/constants';

export const createToken = (input: { userId: string }) => {
  return sign(input, configService('JWT_SECRET')!);
};
