import { logger } from '@librechat/data-schemas';
import { isEnabled } from '~/utils/common';

type S3Client = import('@aws-sdk/client-s3').S3Client;

let s3: S3Client | null = null;

export const initializeS3 = (): S3Client | null => {
  if (s3) {
    return s3;
  }

  const region = process.env.AWS_REGION;
  if (!region) {
    logger.error('[initializeS3] AWS_REGION is not set. Cannot initialize S3.');
    return null;
  }

  if (!process.env.AWS_BUCKET_NAME) {
    throw new Error(
      '[S3] AWS_BUCKET_NAME environment variable is required for S3 operations. ' +
        'Please set this environment variable to enable S3 storage.',
    );
  }

  // @ts-expect-error - lazily required to avoid loading the AWS SDK at boot
  const { S3Client } = require('@aws-sdk/client-s3');

  const endpoint = process.env.AWS_ENDPOINT_URL;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  const config = {
    region,
    requestChecksumCalculation: 'WHEN_REQUIRED' as const,
    ...(endpoint ? { endpoint } : {}),
    ...(isEnabled(process.env.AWS_FORCE_PATH_STYLE) ? { forcePathStyle: true } : {}),
  };

  if (accessKeyId && secretAccessKey) {
    s3 = new S3Client({
      ...config,
      credentials: { accessKeyId, secretAccessKey },
    });
    logger.info('[initializeS3] S3 initialized with provided credentials.');
  } else {
    s3 = new S3Client(config);
    logger.info('[initializeS3] S3 initialized using default credentials (IRSA).');
  }

  return s3;
};
