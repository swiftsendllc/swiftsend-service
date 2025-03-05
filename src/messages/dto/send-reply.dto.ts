import { ObjectId } from 'mongodb';

export interface SendReplyInput {
  message: string | null;
  imageURL: string | null;
  blurredImageURL:string | null;
  isExclusive:boolean;
  price:number
  messageId: ObjectId;
  receiverId: ObjectId;
}
