import * as AWS from '@aws-sdk/client-s3';
import { getEnv } from './constants';

const s3 = new AWS.S3({
  region: 'auto',
  endpoint: getEnv('AWS_S3_ENDPOINT')!,
  credentials: {
    accessKeyId: getEnv('AWS_ACCESS_KEY_ID')!,
    secretAccessKey: getEnv('AWS_SECRET_ACCESS_KEY')!,
  },
});

const bucketUrl = getEnv('AWS_BUCKET_URL')!;
const bucketName = getEnv('AWS_BUCKET_NAME')!;

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

export async function deleteFile(input: { path: string }) {
  await s3.deleteObject({
    Key: input.path,
    Bucket: bucketName,
  });

  return { path: input.path, url: `${bucketUrl}/${input.path}` };
}
