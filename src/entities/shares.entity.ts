import { ObjectId } from 'mongodb';

export interface SharesEntity {
  sharingUserId: ObjectId;
  postId: ObjectId;
  sharedUserId: ObjectId;
}
