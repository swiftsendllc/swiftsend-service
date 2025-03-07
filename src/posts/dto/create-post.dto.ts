export interface CreatePostInput {
  caption: string;
  imageUrls: string[];
  blurredImageUrls:string[] | null
  isExclusive:boolean;
  price:number | null
}
