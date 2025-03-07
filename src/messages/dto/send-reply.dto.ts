import { ObjectId } from 'mongodb';

export interface SendReplyInput {
  message: string | null;
  imageUrls: string[] | null;
  blurredImageUrls:string[] | null;
  isExclusive:boolean;
  price:number | null
  messageId: ObjectId;
  receiverId: ObjectId;
}
