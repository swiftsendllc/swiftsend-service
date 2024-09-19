import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { UsersEntity } from '../entities/users.entity';
import { db } from '../rdb/mongodb';
import { Collections } from '../util/constants';
import { LoginInput } from './dto/login.dto';
import { SignUpInput } from './dto/signup.dto';
import { createToken } from './jwt.service';

const users = db.collection<UsersEntity>(Collections.USERS);

export const login = async (req: Request, res: Response) => {
  const body = req.body as LoginInput;
  const user = await users.findOne({ email: body.email });
  if (!user) return res.status(401).json({});
  if (user.password !== body.password) return res.status(401).json({});

  const userId = user._id.toString();
  const accessToken = createToken({ userId });

  return res.status(200).json({ userId, accessToken });
};

export const signup = async (req: Request, res: Response) => {
  const body = req.body as SignUpInput;

  const user = await users.findOne({ email: body.email });
  if (user) return res.status(400).json({ message: 'Email already exists' });

  const username = `${body.fullName
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')}-${randomBytes(3).toString('hex')}`;

  const _id = new ObjectId();
  await users.insertOne({
    _id,
    email: body.email,
    password: body.password,
    fullName: body.fullName,
    gender: body.gender,
    dateOfBirth: body.dateOfBirth,
    phoneNumber: body.phoneNumber,
    region: body.region,
    username,
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const userId = _id.toString();
  const accessToken = createToken({ userId });

  return res.json({ userId, accessToken });
};

export const getAuthUser = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);

  const user = await users.findOne({
    _id: userId,
  });
  return res.json(user);
};
