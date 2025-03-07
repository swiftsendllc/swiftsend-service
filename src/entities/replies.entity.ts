import { ObjectId } from 'mongodb';

export interface RepliesEntity {
  replierId: ObjectId
  messageId: ObjectId;
  repliedAt: Date;
  message: string |  null;
  imageUrls:string[] | null;
  receiverId:ObjectId | ObjectId[]
}
