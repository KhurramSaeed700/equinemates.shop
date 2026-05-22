"use client";

import Image from "next/image";
import {
  DragEvent,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { FiX } from "react-icons/fi";

import { useToast } from "@/lib/use-toast";

type UploadResponse = {
  message?: string;
  key?: string;
  url?: string;
  size?: number;
  contentType?: string;
};

export type R2ImageUploadFormHandle = {
  clear: () => void;
  hasPendingImages: () => boolean;
  uploadPendingImages: () => Promise<UploadResponse[]>;
};

interface R2ImageUploadFormProps {
  hideFolderField?: boolean;
  initialFolder?: string;
  multiple?: boolean;
  onUploaded?: (upload: UploadResponse) => void;
  resetSignal?: number;
  showUploadButton?: boolean;
  showUploadedPreview?: boolean;
}

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
};

export const R2ImageUploadForm = forwardRef<
  R2ImageUploadFormHandle,
  R2ImageUploadFormProps
>(function R2ImageUploadForm(
  {
    hideFolderField = false,
    initialFolder,
    multiple = false,
    onUploaded,
    resetSignal = 0,
    showUploadButton = true,
    showUploadedPreview = true,
  },
  ref,
) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedImagesRef = useRef<SelectedImage[]>([]);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [upload, setUpload] = useState<UploadResponse | null>(null);

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(
    () => () => {
      selectedImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    },
    [],
  );

  const addFiles = (files: FileList | File[]) => {
    const nextFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));

    if (!nextFiles.length) {
      const errorMessage = "Choose image files before uploading.";
      setStatus(errorMessage);
      toast.error("Image upload failed", errorMessage);
      return;
    }

    setSelectedImages((currentImages) => {
      const nextImages = nextFiles.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      if (multiple) {
        return [...currentImages, ...nextImages];
      }

      currentImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return nextImages;
    });
    setStatus("");
  };

  const removeSelectedImage = (imageId: string) => {
    setSelectedImages((currentImages) => {
      const imageToRemove = currentImages.find((image) => image.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }

      return currentImages.filter((image) => image.id !== imageId);
    });
  };

  const clearSelectedImages = useCallback(() => {
    setSelectedImages((currentImages) => {
      currentImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
  }, []);

  useEffect(() => {
    clearSelectedImages();
    setUpload(null);
    setStatus("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [clearSelectedImages, resetSignal]);

  const uploadPendingImages = useCallback(async (): Promise<UploadResponse[]> => {
    const imagesToUpload = selectedImagesRef.current;

    if (!imagesToUpload.length) {
      return [];
    }

    setIsSubmitting(true);
    setStatus("");

    try {
      const uploads: UploadResponse[] = [];
      const folder = initialFolder ?? "";

      for (const selectedImage of imagesToUpload) {
        const uploadData = new FormData();
        uploadData.set("folder", folder);
        uploadData.set("image", selectedImage.file);

        const response = await fetch("/api/admin/uploads", {
          method: "POST",
          body: uploadData,
        });

        const payload = (await response.json()) as UploadResponse;

        if (!response.ok) {
          throw new Error(payload.message ?? `Upload failed for ${selectedImage.file.name}.`);
        }

        uploads.push(payload);
        onUploaded?.(payload);
      }

      const lastUpload = uploads.at(-1) ?? null;
      setUpload(lastUpload);
      const successMessage =
        uploads.length > 1
          ? `${uploads.length} images uploaded to Cloudflare R2.`
          : lastUpload?.message ?? "Image uploaded.";
      setStatus(successMessage);
      toast.success(successMessage, "Images added to the current product draft.");
      clearSelectedImages();

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      return uploads;
    } catch (error) {
      setUpload(null);
      const errorMessage =
        error instanceof Error && !error.message.includes("reading 'reset'")
          ? error.message
          : "Upload failed. Please try again.";
      setStatus(errorMessage);
      toast.error("Image upload failed", errorMessage);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [clearSelectedImages, initialFolder, onUploaded, toast]);

  useImperativeHandle(
    ref,
    () => ({
      clear: clearSelectedImages,
      hasPendingImages: () => selectedImagesRef.current.length > 0,
      uploadPendingImages,
    }),
    [clearSelectedImages, uploadPendingImages],
  );

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const onDropzoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    inputRef.current?.click();
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (!selectedImages.length) {
      const errorMessage = "Choose image files before uploading.";
      setStatus(errorMessage);
      setUpload(null);
      toast.error("Image upload failed", errorMessage);
      return;
    }

    try {
      await uploadPendingImages();
      form.reset();
    } catch (error) {
      // uploadPendingImages already sets status and toast feedback.
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
      <form className="r2-drop-upload-form" onSubmit={onSubmit}>
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
        <div
          className={`r2-dropzone${isDragging ? " is-dragging" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
          onKeyDown={onDropzoneKeyDown}
          role="button"
          tabIndex={0}
        >
          <input
            accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
            className="r2-file-input"
            multiple={multiple}
            name="image"
            onChange={(event) => {
              if (event.currentTarget.files) {
                addFiles(event.currentTarget.files);
                event.currentTarget.value = "";
              }
            }}
            ref={inputRef}
            type="file"
          />
          <strong>Drag images here or choose files</strong>
          <span>PNG, JPG, WEBP, GIF, or AVIF. You can add multiple images.</span>
        </div>

        {selectedImages.length > 0 ? (
          <div className="r2-selected-grid">
            {selectedImages.map((image, index) => (
              <article className="r2-selected-image" key={image.id}>
                <Image
                  alt={image.file.name}
                  height={220}
                  src={image.previewUrl}
                  width={280}
                  unoptimized
                />
                {index === 0 ? <span className="r2-primary-badge">Primary</span> : null}
                <button
                  aria-label={`Remove ${image.file.name}`}
                  className="r2-selected-remove"
                  onClick={() => removeSelectedImage(image.id)}
                  title="Remove image"
                  type="button"
                >
                  <FiX aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        ) : null}

        {showUploadButton ? (
          <button className="btn-primary" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? "Uploading..."
              : selectedImages.length > 1
                ? `Upload ${selectedImages.length} Images`
                : "Upload Image"}
          </button>
        ) : null}
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
});
