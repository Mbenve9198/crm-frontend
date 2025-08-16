"use client";
import React from "react";
import { FileUpload } from "@/components/ui/file-upload";

export function FileUploadDemo() {
  const handleFileUpload = (files: File[]) => {
    console.log(files);
  };

  return (
    <div className="w-full max-w-4xl mx-auto min-h-96 border border-dashed bg-background border-neutral-200 dark:border-neutral-800 rounded-lg">
      <FileUpload onChange={handleFileUpload} />
    </div>
  );
} 