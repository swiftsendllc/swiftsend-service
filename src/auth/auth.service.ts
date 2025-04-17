import bcryptjs from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { UserProfilesEntity } from '../entities/user-profiles.entity';
import { UsersEntity } from '../entities/users.entity';
import { db } from '../rdb/mongodb';
import { Collections } from '../util/constants';
import { LoginInput } from './dto/login.dto';
import { SignUpInput } from './dto/signup.dto';
import { createToken } from './jwt.service';
import { usersRepository, userProfilesRepository } from '../util/repositories';
const saltRounds = 10;

export const login = async (req: Request, res: Response) => {
  try {
    const body = req.body as LoginInput;
    const email = body.email.toLowerCase().trim();

    const user = await usersRepository.findOne({ email });
    if (!user) return res.status(401).json({});

    const isCorrect = await bcryptjs.compare(body.password, user.password);
    if (!isCorrect) return res.status(401).json({});

    const userId = user._id.toString();
    const accessToken = createToken({ userId });

    return res.status(200).json({ userId, accessToken });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const signup = async (req: Request, res: Response) => {
  try {
    const body = req.body as SignUpInput;

    const email = body.email.toLowerCase().trim();

    const user = await usersRepository.findOne({ email });
    if (user) return res.status(400).json({ message: 'Email already exists' });

    const password = await bcryptjs.hash(body.password, saltRounds);

    const username = `${body.fullName
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9]/g, '')}-${randomBytes(3).toString('hex')}`;

    const _id = new ObjectId();
    const currentTime = new Date();
    await usersRepository.insertOne({
      _id,
      email,
      password,
      gender: body.gender,
      dateOfBirth: new Date(body.dateOfBirth),
      lastLoginAt: currentTime,
      lastActiveAt: currentTime,
      createdAt: currentTime,
    });
    await userProfilesRepository.insertOne({
      userId: _id,
      fullName: body.fullName,
      username,
      bio: '',
      gender: body.gender,
      avatarURL: '',
      bannerURL: '',
      websiteURL: '',
      region: body.region,
      followerCount: 0,
      followingCount: 0,
      postCount: 0,
      pronouns: '',
      updatedAt: currentTime,
      createdAt: currentTime,
      lastSeen: currentTime,
      stripeCustomerId: null,
    });

    const userId = _id.toString();
    const accessToken = createToken({ userId });

    return res.json({ userId, accessToken });
  } catch (error) {
    console.error('SignUp error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAuthUser = async (req: Request, res: Response) => {
  const userId = new ObjectId(req.user!.userId);
  const user = await usersRepository.findOne({
    _id: userId,
  });
  if (!user) return res.status(404).json({ message: 'user not found' });

  const userProfile = await userProfilesRepository.findOne({ userId });
  if (!userProfile) return res.status(404).json({ message: 'Profile not found' });

  return res.status(200).json(userProfile);
};
