"use client";

import React, { useState, useRef } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";

type Props = {
  defaultUrl?: string | null;
  name?: string;
};

export function ImageUploadField({ defaultUrl = null, name = "image_url" }: Props) {
  const [preview, setPreview] = useState<string | null>(defaultUrl);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    // Basic validation
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string | null;
      if (base64) {
        setPreview(base64);
        toast.success("Image selected successfully");
      }
    };
    reader.onerror = () => {
      toast.error("Error reading file");
    };
    reader.readAsDataURL(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
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
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clearImage = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <input
        type="hidden"
        name={name}
        value={preview ?? ""}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept="image/*"
        className="hidden"
      />

      {preview ? (
        <div className="relative group rounded-xl overflow-hidden border border-admin-line-2 bg-admin-bg-2 aspect-video flex items-center justify-center max-w-md shadow-sm">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={triggerInput}
              className="px-3.5 py-1.5 rounded-lg bg-white/90 text-neutral-900 text-[12px] font-medium hover:bg-white transition-colors cursor-pointer"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={clearImage}
              className="p-1.5 rounded-lg bg-red-600/90 text-white hover:bg-red-600 transition-colors cursor-pointer"
              title="Remove image"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerInput}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 max-w-md flex flex-col items-center justify-center gap-2 bg-admin-bg-card hover:bg-admin-bg-2/30 ${
            isDragging
              ? "border-admin-lime bg-admin-lime-soft/10"
              : "border-admin-line-2 hover:border-admin-line-3"
          }`}
        >
          <div className="h-10 w-10 rounded-full bg-admin-bg-2 flex items-center justify-center text-admin-ink-3">
            <Upload size={16} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[13.5px] font-medium text-admin-ink font-sans">
              Click to upload or drag & drop
            </p>
            <p className="text-[11.5px] text-admin-ink-3">
              PNG, JPG or WEBP up to 2MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
