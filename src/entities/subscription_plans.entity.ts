import { ObjectId } from "mongodb";

export interface SubscriptionPlansEntity{
  price:number;
  description:string
  bannerURL:string | null
  createdAt:Date
  deletedAt:Date | null
  syncedAt:Date
  tier:string;
  creatorId:ObjectId
}