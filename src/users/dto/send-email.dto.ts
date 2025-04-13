export interface SendEmailInput {
  to: string[];
  subject: string;
  text: string;
  cc: string[];
  bcc: string[];
  dataUrls: string[];
}
