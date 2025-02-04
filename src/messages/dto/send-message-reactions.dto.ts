import { ObjectId } from "mongodb"

export interface SendMessageReactionsInput {
  reaction: string
  messageId: ObjectId
}