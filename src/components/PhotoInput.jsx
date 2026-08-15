import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { Camera, X } from "lucide-react";

export default function PhotoInput({ photos, onChange, max = 6 }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const slots = max - photos.length;
      const toUpload = Array.from(files).slice(0, slots);
      const urls = [];
      for (const f of toUpload) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
        urls.push(file_url);
      }
      onChange([...photos, ...urls]);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <div key={i} className="relative aspect-square overflow-hidden rounded-2xl bg-stone-100">
            <Image src={p} alt="" fittingType="fill" className="h-full w-full" />
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, idx) => idx !== i))}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {photos.length < max && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="tap-highlight flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-stone-400"
          >
            {uploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600" />
            ) : (
              <>
                <Camera className="h-5 w-5" />
                <span className="text-[10px]">{photos.length}/{max}</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}