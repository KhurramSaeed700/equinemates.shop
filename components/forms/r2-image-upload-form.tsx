"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";

type UploadResponse = {
  message?: string;
  key?: string;
  url?: string;
  size?: number;
  contentType?: string;
};

interface R2ImageUploadFormProps {
  hideFolderField?: boolean;
  initialFolder?: string;
  onUploaded?: (upload: UploadResponse) => void;
  showUploadedPreview?: boolean;
}

export function R2ImageUploadForm({
  hideFolderField = false,
  initialFolder,
  onUploaded,
  showUploadedPreview = true,
}: R2ImageUploadFormProps) {
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upload, setUpload] = useState<UploadResponse | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const image = formData.get("image");

    if (!(image instanceof File) || image.size === 0) {
      setStatus("Choose an image before uploading.");
      setUpload(null);
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as UploadResponse;

      if (!response.ok) {
        throw new Error(payload.message ?? "Upload failed.");
      }

      setUpload(payload);
      onUploaded?.(payload);
      setStatus(payload.message ?? "Image uploaded.");
      event.currentTarget.reset();
    } catch (error) {
      setUpload(null);
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyUrl = async () => {
    if (!upload?.url || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(upload.url);
      setStatus("Image URL copied to the clipboard.");
    } catch {
      setStatus("Could not copy the URL. Copy it manually from the field below.");
    }
  };

  return (
    <>
      <form className="form-grid compact" onSubmit={onSubmit}>
        {hideFolderField ? (
          <input name="folder" readOnly type="hidden" value={initialFolder ?? ""} />
        ) : (
          <label>
            Product Folder
            <input
              defaultValue={initialFolder}
              name="folder"
              placeholder="horse-rugs/winter-collection"
              type="text"
            />
          </label>
        )}
        <label>
          Image File
          <input
            accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
            name="image"
            required
            type="file"
          />
        </label>
        <button className="btn-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Uploading..." : "Upload to R2"}
        </button>
        {status ? <p className="form-status">{status}</p> : null}
      </form>

      {showUploadedPreview && upload?.url ? (
        <div className="r2-upload-result">
          <Image
            alt="Uploaded product preview"
            className="r2-upload-preview"
            src={upload.url}
            height={640}
            sizes="(max-width: 820px) 100vw, 240px"
            width={640}
          />
          <div className="r2-upload-meta">
            <p className="tiny">
              <strong>Object key:</strong> {upload.key}
            </p>
            <p className="tiny">
              <strong>Content type:</strong> {upload.contentType}
            </p>
            <p className="tiny">
              <strong>Size:</strong> {upload.size?.toLocaleString()} bytes
            </p>
            <label className="full-width">
              Public URL
              <input readOnly type="text" value={upload.url} />
            </label>
            <div className="r2-upload-actions">
              <button className="btn-secondary compact" onClick={copyUrl} type="button">
                Copy URL
              </button>
              <a
                className="btn-secondary compact"
                href={upload.url}
                rel="noreferrer"
                target="_blank"
              >
                Open Image
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
