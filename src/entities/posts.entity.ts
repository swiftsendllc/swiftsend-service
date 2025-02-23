import { ObjectId } from 'mongodb';

export interface PostsEntity {
  userId: ObjectId;
  caption: string;
  imageURL: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  createdAt: Date;
  deletedAt: Date | null;
  price: number;
  isExclusive: boolean
}
