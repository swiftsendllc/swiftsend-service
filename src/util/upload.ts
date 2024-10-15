import * as AWS from '@aws-sdk/client-s3';

const s3 = new AWS.S3({
  region: 'auto',
  endpoint: process.env.AWS_S3_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const bucketUrl = process.env.AWS_BUCKET_URL!;
const bucketName = process.env.AWS_BUCKET_NAME!;

export async function uploadFile(input: {
  path: string;
  contentType: string;
  buffer: Buffer;
  metadata: Record<string, string>;
}) {
  await s3.putObject({
    Key: input.path,
    Bucket: bucketName,
    Body: input.buffer,
    ACL: 'public-read',
    Metadata: input.metadata,
    ContentType: input.contentType,
  });

  return { path: input.path, url: `${bucketUrl}/${input.path}` };
}
