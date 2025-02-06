import { ObjectId } from "mongodb";

export interface SendGroupMessageInput{
  receiversId: ObjectId[]
  channelName: string
  description: string
}