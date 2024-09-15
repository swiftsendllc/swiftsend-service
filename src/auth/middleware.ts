import { NextFunction, Request, Response } from 'express';
import { JwtPayload, verify } from 'jsonwebtoken';
export const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const [, token] = req.headers.authorization!.split(' ');
    req.user = verify(token, process.env.JWT_SECRET!) as JwtPayload as {
      userId: string;
    };
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};
