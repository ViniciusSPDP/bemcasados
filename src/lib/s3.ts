import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    credentials:{
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
    },
    forcePathStyle: true,
});

export async function uploadFileToS3(file:File): Promise<string> {
    const bucketName = process.env.S3_BUCKET;

    const uniqueFileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;

    //Converte para buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueFileName,
        Body: buffer,
        ContentType: file.type,
        ACL: 'public-read',
    });

    await s3Client.send(command);

    const url = `${process.env.S3_ENDPOINT}/${bucketName}/${uniqueFileName}`;

    return url;
}