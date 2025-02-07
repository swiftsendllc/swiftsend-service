import { ObjectId } from 'mongodb';

export interface GroupChannelsEntity {
  channelName: string;
  description: string;
  createdAt: Date;
  senderId: ObjectId;
  participants: ObjectId[];
}
