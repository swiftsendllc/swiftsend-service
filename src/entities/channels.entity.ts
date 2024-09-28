import { ObjectId } from 'mongodb';

export interface ChannelsEntity {
  users: [ObjectId, ObjectId]
}
