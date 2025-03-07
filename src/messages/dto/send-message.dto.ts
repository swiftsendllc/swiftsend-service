import { ObjectId } from 'mongodb';

export interface MessageInput {
  receiverId: ObjectId;
  message: string | null;
  imageUrls: string[] | null;
  blurredImageUrls: string[] | null;
  isExclusive: boolean;
  price:number | null
}
