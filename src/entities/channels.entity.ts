import { ObjectId } from 'mongodb';

export interface ChannelsEntity {
  users: [ObjectId, ObjectId];
  backgroundImage: string;
  isPinned: boolean;
  isMuted: boolean;
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}
