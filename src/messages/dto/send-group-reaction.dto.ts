import { ObjectId } from "mongodb";

export interface SendGroupReactionInput{
  messageId:ObjectId
  reaction:string
}