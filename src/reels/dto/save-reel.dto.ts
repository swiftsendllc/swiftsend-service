import { ObjectId } from 'mongodb';

export interface SaveReelInput {
  userId: ObjectId;
  reelsId: ObjectId;
}
