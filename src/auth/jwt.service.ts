import { sign } from 'jsonwebtoken';

export const createToken = (input: { userId: string }) => {
  return sign(input, process.env.JWT_SECRET!);
};
