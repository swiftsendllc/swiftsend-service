import { ObjectId } from 'mongodb';

export interface MessageInput {
  receiverId: ObjectId;
  message: string | null;
  imageURL: string | null;
  blurredImageURL: string | null;
  isExclusive: boolean;
  price:number
}
