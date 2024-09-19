import { ObjectId } from 'mongodb';

export interface SharesEntity {
  sharingUserId: ObjectId;
  postId: ObjectId | null;
  reelsId: ObjectId | null;
  sharedUserId: ObjectId;
}
