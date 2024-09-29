import { ObjectId } from 'mongodb';

export interface SharesEntity {
  sharingUserId: ObjectId;
  postId: ObjectId | null;
  reelsId: ObjectId | null;
  storyId: ObjectId | null;
  sharedUserId: ObjectId;
}
