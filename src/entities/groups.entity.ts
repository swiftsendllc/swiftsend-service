import { ObjectId } from 'mongodb';

export interface GroupsEntity {
  channelAvatar: string
  channelName: string;
  description: string;
  createdAt: Date;
  admin: ObjectId;
  participants: ObjectId[];
  moderators: ObjectId[]
}
