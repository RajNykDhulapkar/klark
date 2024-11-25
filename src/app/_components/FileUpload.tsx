"use client";

import { useState } from "react";
import axios, { type AxiosResponse, type AxiosError } from "axios";
import { CardContent, CardFooter } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { cn } from "~/lib/utils";
import { usePathname, useRouter } from "next/navigation";

type UploadResponse = {
  message: string;
  fileName: string;
  userId: string;
};

type UploadError = {
  error: string;
};

interface FileUploaderProps {
  chatId: string;
}

export default function FileUploader({ chatId }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{
    message: string;
    type: "success" | "error" | "idle";
  }>({ message: "", type: "idle" });

  const router = useRouter();
  const path = usePathname();

  const handleUpload = async () => {
    if (!file) {
      setStatus({ message: "Please select a file", type: "error" });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("chatId", chatId);

    try {
      const response = await axios.post<
        UploadResponse,
        AxiosResponse<UploadResponse>
      >("/api/upload", formData);

      setStatus({
        message: `File uploaded successfully: ${response.data.fileName}`,
        type: "success",
      });

      setFile(null);

      if (!path.includes("chat")) {
        router.push(`/chat/${chatId}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<UploadError>;

        if (axiosError.response?.status === 401) {
          setStatus({
            message: "Please log in to upload files",
            type: "error",
          });
        } else {
          setStatus({
            message: axiosError.response?.data.error ?? "Upload failed",
            type: "error",
          });
        }
      } else {
        setStatus({
          message: "An unexpected error occurred",
          type: "error",
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
      setStatus({ message: "", type: "idle" });
    } else {
      setStatus({
        message: "Please upload a PDF file",
        type: "error",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setStatus({ message: "", type: "idle" });
      } else {
        setStatus({
          message: "Please upload a PDF file",
          type: "error",
        });
      }
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <CardContent className="space-y-4 p-6">
        <div
          className={cn(
            "flex flex-col items-center gap-1 rounded-lg border-2 border-dashed p-6 transition-colors",
            isDragging
              ? "border-primary bg-primary/10"
              : "border-gray-200 hover:border-primary/50",
            "cursor-pointer",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          <FileIcon
            className={cn(
              "h-12 w-12 transition-colors",
              isDragging ? "text-primary" : "text-gray-400",
            )}
          />
          <span className="text-sm font-medium text-gray-500">
            {file ? file.name : "Drag and drop a PDF or click to browse"}
          </span>
          <span className="text-xs text-gray-500">
            Only PDF files are supported
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <Label htmlFor="file-upload" className="text-sm font-medium">
            File
          </Label>
          <Input
            id="file-upload"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
          />
        </div>

        {status.message && (
          <Alert variant={status.type === "error" ? "destructive" : "default"}>
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter>
        <Button
          size="lg"
          onClick={handleUpload}
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? "Uploading..." : "Upload"}
        </Button>
      </CardFooter>
    </div>
  );
}

function FileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}
