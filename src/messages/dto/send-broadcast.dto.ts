import { ObjectId } from 'mongodb';

export interface SendBroadcastInput {
  receiversId: ObjectId[];
}
