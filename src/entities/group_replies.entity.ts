import { ObjectId } from 'mongodb';

export interface GroupRepliesEntity {
  replierId: ObjectId;
  messageId: ObjectId;
  receiversId: ObjectId[];
  repliedAt: Date;
  message: string | null;
  imageURL: string | null;
}
