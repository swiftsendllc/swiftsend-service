import { ObjectId } from 'mongodb';

export interface PostsEntity {
  userId: ObjectId;
  caption: string;
  imageUrls: string[];
  blurredImageUrls: string[] | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  createdAt: Date;
  deletedAt: Date | null;
  price: number | null;
  isExclusive: boolean;
  status: boolean;
  purchasedBy: ObjectId[];
}
