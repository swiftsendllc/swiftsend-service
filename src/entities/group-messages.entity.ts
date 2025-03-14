import { ObjectId } from 'mongodb';

export interface GroupMessagesEntity {
  senderId: ObjectId;
  receiversId: ObjectId[];
  groupId: ObjectId;
  message: string | null;
  imageURL: string | null;
  createdAt: Date | null;
  deletedAt: Date | null;
  editedAt: Date | null;
  isExclusive:boolean;
  price:number;
  purchasedBy:ObjectId[]
  deleted: boolean;
  edited: boolean;
  repliedTo:ObjectId | null
}
