import { ObjectId } from 'mongodb';

export interface CreatePostInput {
  caption: string;
  isExclusive: boolean;
  price: number | null;
  assetIds: ObjectId[];
}
