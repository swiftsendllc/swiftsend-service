import { NextFunction, Request, Response } from 'express';
import { JwtPayload, verify } from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { configService } from '../util/config';
export const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const [, token] = req.headers.authorization!.split(' ');
    req.user = verify(token, configService.JWT_SECRET) as JwtPayload as {
      userId: string;
    };
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

export const validateObjectId = (parameters: string[]) => {
  const validate = (req: Request, res: Response, next: NextFunction) => {
    const isInvalid = parameters.some((parameter) => {
      const id = req.params[parameter];
      return !ObjectId.isValid(id);
    });
    if (isInvalid) return res.status(404).json({ message: `Invalid parameter` });
    next();
  };
  return validate;
};
