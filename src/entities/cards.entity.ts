import { ObjectId } from 'mongodb';

export interface CardsEntity {
  card_holder_id: ObjectId;
  name: string;
  city: string;
  country: string;
  postal_code: string;
  state: string;
  card_number: string;
  cvc: string;
  expiry_date: string;
  email: string;
  line1: string;
}
