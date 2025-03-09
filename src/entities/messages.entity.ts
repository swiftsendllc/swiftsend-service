import { ObjectId } from 'mongodb';

export interface MessagesEntity {
  senderId: ObjectId;
  receiverId: ObjectId;
  channelId: ObjectId;
  message: string | null;
  imageUrls: string[] | null;
  blurredImageUrls:string[] | null;
  isExclusive:boolean;
  price:number | null;
  createdAt: Date | null;
  deletedAt: Date | null;
  editedAt: Date | null;
  deleted: boolean;
  edited: boolean;
  delivered: boolean;
  seen: boolean;
  repliedTo: ObjectId | null;
  purchasedBy:ObjectId[]
}
