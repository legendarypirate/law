import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        { error: "Cloudinary is not configured" },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    if (!files.length) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const results: { url: string; title: string; publicId: string }[] = [];

    for (const file of files) {
      if (!file.size) continue;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const result = await new Promise<{ secure_url: string; public_id: string }>(
        (resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "law-case-documents",
              resource_type: "auto",
            },
            (err, res) => {
              if (err) reject(err);
              else if (res) resolve({ secure_url: res.secure_url, public_id: res.public_id });
              else reject(new Error("No result"));
            }
          );
          uploadStream.end(buffer);
        }
      );

      results.push({
        url: result.secure_url,
        title: file.name,
        publicId: result.public_id,
      });
    }

    return NextResponse.json({ uploads: results });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
