import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const lessonId = formData.get('lessonId') as string;
    const duration = parseInt(formData.get('duration') as string);

    if (!file || !lessonId) {
      return NextResponse.json({ error: 'Missing file or lessonId' }, { status: 400 });
    }

    const timestamp = new Date().toISOString().slice(0, 16).replace(/[:.]/g, '-');
    const filename = `lesson-${lessonId}-${timestamp}.webm`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: `recordings/${lessonId}/${filename}`,
      Body: buffer,
      ContentType: 'video/webm',
    }));

    const publicUrl = `https://pub-${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET_NAME}/recordings/${lessonId}/${filename}`;

    return NextResponse.json({ 
      success: true, 
      filename,
      publicUrl 
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}