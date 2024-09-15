import { ObjectId } from 'mongodb';

export interface PostsEntity {
  userId: ObjectId;
  caption: string;
  imageURL: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
}
