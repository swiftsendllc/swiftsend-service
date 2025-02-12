import { ObjectId } from 'mongodb';

export interface RepliesEntity {
  replierId: ObjectId
  contentId: ObjectId;
  repliedAt: Date;
  type: 'posts' | 'messages' | 'stories' | 'reels' | "groups";
  content: string;
}
