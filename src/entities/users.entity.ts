import { ObjectId } from 'mongodb';

export interface UsersEntity {
  _id: ObjectId;
  email: string;
  password: string;
  fullName: string;
  username?: string;
  dateOfBirth: Date;
  gender: string;
  phoneNumber: number;
  lastLoginAt: Date;
  lastActiveAt: Date;
}
