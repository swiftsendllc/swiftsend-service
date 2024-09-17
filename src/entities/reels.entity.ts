import { ObjectId } from 'mongodb';

export interface ReelsEntity {
  userId: ObjectId;
  caption: string;
  videoURL: string;
  likeCount: number;
  saveCount: number;
  shareCount: number;
  commentCount: number;
  createdAt: Date;
}
