import { ObjectId } from 'mongodb';

export interface CommentsEntity {
  userId: ObjectId;
  postId: ObjectId;
  comment: string;
}
