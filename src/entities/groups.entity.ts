import { ObjectId } from 'mongodb';

export interface GroupsEntity {
  groupAvatar: string | null;
  groupName: string;
  description: string;
  createdAt: Date;
  admin: ObjectId;
  participants: ObjectId[];
  moderators: ObjectId[];
}
