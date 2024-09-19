import { ObjectId } from 'mongodb';

export interface LikesEntity {
  userId: ObjectId;
  postId: ObjectId | null;
  reelsId: ObjectId | null;
  storyId: ObjectId | null;
  createdAt: Date;
}
