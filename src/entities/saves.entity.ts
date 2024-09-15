import { ObjectId } from 'mongodb';

export interface SavesEntity {
  userId: ObjectId;
  postId: ObjectId;
}
