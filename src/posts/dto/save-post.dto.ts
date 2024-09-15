import { ObjectId } from 'mongodb';

export interface SavePostInput {
  userId: ObjectId;
  postId: ObjectId;
}
