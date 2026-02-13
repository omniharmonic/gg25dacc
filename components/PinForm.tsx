"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { SECTORS } from "@/lib/sectors";
import { PinFormData } from "@/lib/types";

interface PinFormProps {
  position: { x: number; y: number };
  onClose: () => void;
}

async function resizeImage(file: File, maxSize = 200): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    img.onload = () => {
      canvas.width = maxSize;
      canvas.height = maxSize;

      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxSize, maxSize);
      canvas.toBlob((blob) => resolve(blob!), "image/webp", 0.8);
    };

    img.src = URL.createObjectURL(file);
  });
}

export default function PinForm({ position, onClose }: PinFormProps) {
  const [formData, setFormData] = useState<PinFormData>({
    name: "",
    organization: "",
    telegram: "",
    email: "",
    image: null,
    ens: "",
    dacc_statement: "",
    sector: SECTORS[0].name,
  });
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let imageUrl: string | null = null;

      if (formData.image) {
        const resized = await resizeImage(formData.image);
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, resized, { contentType: "image/webp" });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        imageUrl = urlData.publicUrl;
      }

      const sector = SECTORS.find((s) => s.name === formData.sector);

      const { error } = await supabase.from("pins").insert({
        name: formData.name,
        organization: formData.organization,
        telegram: formData.telegram || null,
        email: formData.email,
        image_url: imageUrl,
        ens: formData.ens || null,
        dacc_statement: formData.dacc_statement || null,
        sector: formData.sector,
        quadrant: sector?.quadrant || "Digital Coordination",
        x: position.x,
        y: position.y,
      });

      if (error) throw error;
      onClose();
    } catch (err) {
      console.error("Submit error:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400 text-sm";
  const labelClass = "block text-xs font-medium text-white/70 mb-1";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Place Yourself on the Map
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/50 hover:text-white text-xl cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-16 h-16 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center overflow-hidden hover:border-blue-400 transition-colors flex-shrink-0 cursor-pointer"
            >
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white/40 text-2xl">+</span>
              )}
            </button>
            <div className="text-xs text-white/50">Click to upload your photo</div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <div>
            <label className={labelClass}>Name *</label>
            <input required className={inputClass} placeholder="Your name"
              value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
          </div>

          <div>
            <label className={labelClass}>Organization / Project *</label>
            <input required className={inputClass} placeholder="Your organization or project"
              value={formData.organization} onChange={(e) => setFormData((p) => ({ ...p, organization: e.target.value }))} />
          </div>

          <div>
            <label className={labelClass}>d/acc Sector *</label>
            <select required className={inputClass} value={formData.sector}
              onChange={(e) => setFormData((p) => ({ ...p, sector: e.target.value }))}>
              {SECTORS.map((s) => (
                <option key={s.name} value={s.name}>{s.name} ({s.quadrant})</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Email *</label>
            <input required type="email" className={inputClass} placeholder="you@example.com"
              value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
          </div>

          <div>
            <label className={labelClass}>Telegram Username</label>
            <input className={inputClass} placeholder="@username"
              value={formData.telegram} onChange={(e) => setFormData((p) => ({ ...p, telegram: e.target.value }))} />
          </div>

          <div>
            <label className={labelClass}>ENS</label>
            <input className={inputClass} placeholder="name.eth"
              value={formData.ens} onChange={(e) => setFormData((p) => ({ ...p, ens: e.target.value }))} />
          </div>

          <div>
            <label className={labelClass}>How do you see yourself as part of d/acc?</label>
            <textarea className={`${inputClass} resize-none`} rows={3} placeholder="Describe your role in d/acc..."
              value={formData.dacc_statement} onChange={(e) => setFormData((p) => ({ ...p, dacc_statement: e.target.value }))} />
          </div>
        </div>

        <button type="submit" disabled={submitting}
          className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors cursor-pointer">
          {submitting ? "Placing..." : "Place on Map"}
        </button>
      </form>
    </div>
  );
}
