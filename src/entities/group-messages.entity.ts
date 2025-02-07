import { ObjectId } from 'mongodb';

export interface GroupMessagesEntity {
  senderId: ObjectId;
  receiversId: ObjectId[];
  channelId: ObjectId;
  message: string | null;
  imageURL: string | null;
  createdAt: Date | null;
  deletedAt: Date | null;
  editedAt: Date | null;
  deleted: boolean;
  edited: boolean;
}
