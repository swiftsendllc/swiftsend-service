import { ObjectId } from 'mongodb';

export interface StoriesEntity {
  userId: ObjectId;
  caption: string;
  imageURL: string;
  likeCount: number;
  createdAt: Date;
}
