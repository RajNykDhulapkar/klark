import "server-only";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lucia } from "~/lib/auth";
import { TRPCError } from "@trpc/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import { env } from "~/env";
import { Upload } from "@aws-sdk/lib-storage";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { promises } from "fs";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Chroma } from "langchain/vectorstores/chroma";
import { db } from "~/server/db";
import { eq } from "drizzle-orm";
import { chatTable, fileTable, messageTable } from "~/server/db/schema";

const s3Client = new S3Client({
  endpoint: env.MINIO_ENDPOINT,
  region: "us-east-1",
  credentials: {
    accessKeyId: env.MINIO_ACCESS_KEY,
    secretAccessKey: env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: env.OPENAI_API_KEY,
});

// Auth middleware function
async function validateAuth() {
  const cookieStore = cookies();
  const sessionId = cookieStore.get(lucia.sessionCookieName)?.value ?? null;

  if (!sessionId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const result = await lucia.validateSession(sessionId);

  if (result?.session?.fresh) {
    const sessionCookie = lucia.createSessionCookie(result.session.id);
    cookieStore.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes,
    );
  }

  if (!result?.user || !result?.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return {
    user: result.user,
    session: result.session,
  };
}

async function processPDFBuffer(
  buffer: Buffer,
  metadata: Record<string, unknown>,
) {
  const tempPath = `/tmp/temp-${Date.now()}.pdf`;
  await promises.writeFile(tempPath, buffer);

  try {
    // Load and split the document
    const loader = new PDFLoader(tempPath);
    const rawDocs = await loader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.splitDocuments(rawDocs);

    const processedDocs = docs.map((doc, index) => {
      return {
        ...doc,
        metadata: {
          ...metadata,
          ...doc.metadata,
          chunkIndex: index,
          totalChunks: docs.length,
        },
      };
    });

    console.log(`Processing ${docs.length} chunks...`);

    await Chroma.fromDocuments(processedDocs, embeddings, {
      collectionName: "documents",
      url: env.CHROMA_URL,
      collectionMetadata: {
        "hnsw:space": "cosine",
      },
    });

    return {
      chunks: docs.length,
      fileName: metadata.fileName,
    };
  } finally {
    await promises.unlink(tempPath).catch(console.error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await validateAuth();

    const formData = await req.formData();
    const file = formData.get("file");
    const chatId = formData.get("chatId");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "Invalid file upload" },
        { status: 400 },
      );
    }

    if (!chatId || typeof chatId !== "string") {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 },
      );
    }

    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Uploaded content is not a valid Blob" },
        { status: 400 },
      );
    }

    // Validate file size (e.g., 5MB limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds limit (5MB)" },
        { status: 400 },
      );
    }

    // Validate file type
    const allowedTypes = ["application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 },
      );
    }

    // Generate a unique filename
    const fileExtension = file.name.split(".").pop() ?? "";
    const randomString = crypto.randomBytes(16).toString("hex");
    const fileName = `${auth.user.id}/${randomString}.${fileExtension}`;

    const existingChat = await db.query.chatTable.findFirst({
      where: eq(chatTable.id, chatId),
    });

    if (!existingChat) {
      const path = `/chat/${chatId}`;
      await db.insert(chatTable).values({
        id: chatId,
        userId: auth.user.id,
        title: file instanceof Blob ? file.name : "New Chat",
        metadata: { sharePath: path },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await db.insert(fileTable).values({
      id: randomString, // Using same random string as file name
      chatId,
      userId: auth.user.id,
      fileName,
      originalName: file.name,
      mimeType: file.type,
      s3Key: fileName,
      metadata: {
        uploadDate: new Date().toISOString(),
        source: "pdf_upload",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(messageTable).values({
      id: crypto.randomBytes(16).toString("hex"),
      chatId,
      role: "assistant",
      content: `File uploaded: ${file.name}`,
      metadata: {
        fileId: randomString,
        fileName: file.name,
        fileType: file.type,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to MinIO
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: "uploads",
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
        Metadata: {
          userId: auth.user.id,
          chatId,
          originalName: file.name,
          uploadDate: new Date().toISOString(),
        },
      },
    });

    await upload.done();

    console.log(`Uploaded file to MinIO: ${fileName}`);

    const metadata = {
      userId: auth.user.id,
      chatId,
      fileName,
      originalName: file.name,
      uploadDate: new Date().toISOString(),
      contentType: file.type,
      source: "pdf_upload",
    };

    await processPDFBuffer(buffer, metadata);

    return NextResponse.json({
      message: "File uploaded and processed successfully",
      fileName,
      userId: auth.user.id,
    });
  } catch (error) {
    console.error("Error in file upload:", error);

    if (error instanceof TRPCError && error.code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const auth = await validateAuth();

    const url = new URL(req.url);
    const fileName = url.searchParams.get("fileName");

    if (!fileName) {
      return NextResponse.json(
        { error: "Missing 'fileName' query parameter" },
        { status: 400 },
      );
    }

    // Construct the GetObjectCommand to retrieve the file
    const command = new GetObjectCommand({
      Bucket: "uploads",
      Key: `${auth.user.id}/${fileName}`, // Files are namespaced by user ID
    });

    const response = await s3Client.send(command);

    // Convert the file into a readable stream or buffer
    const stream = response.Body as ReadableStream;

    return new Response(stream, {
      headers: {
        "Content-Type": response.ContentType ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error retrieving file:", error);

    if (error instanceof TRPCError && error.code === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to retrieve file" },
      { status: 500 },
    );
  }
}
