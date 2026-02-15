"use client";

import { useCallback, useRef, useState } from "react";

/* ─────── Types ─────── */
type ProfileImage = {
  id: string;
  file: File;
  url: string;
};

/* ─────── Tinder-style icons (inline SVG) ─────── */
function IconX() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="#FD267A" strokeWidth={2.5} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#2CA8FF" stroke="none">
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l7.1-1.01L12 2z" />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#4CD964" stroke="none">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
function IconBolt() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="#A459FF" stroke="none">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

let _idCounter = 0;
function uid() {
  return `img-${Date.now()}-${++_idCounter}`;
}

/* ─────── Component ─────── */
export default function ProfilePreview() {
  /* Profile data */
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");

  /* Images */
  const [images, setImages] = useState<ProfileImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Drag-and-drop reorder state */
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  /* File drop zone state */
  const [dropActive, setDropActive] = useState(false);

  /* ─── Add images ─── */
  const addFiles = useCallback((files: FileList | File[]) => {
    const newImages: ProfileImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      newImages.push({ id: uid(), file, url: URL.createObjectURL(file) });
    }
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id);
      // Adjust activeIndex if needed
      if (activeIndex >= filtered.length && filtered.length > 0) {
        setActiveIndex(filtered.length - 1);
      } else if (filtered.length === 0) {
        setActiveIndex(0);
      }
      return filtered;
    });
  }

  /* ─── Drag & drop reorder ─── */
  function onDragStart(idx: number) {
    setDragIdx(idx);
  }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIdx(idx);
  }
  function onDragEnd() {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      setImages((prev) => {
        const updated = [...prev];
        const [moved] = updated.splice(dragIdx, 1);
        updated.splice(dragOverIdx, 0, moved);
        return updated;
      });
      setActiveIndex(dragOverIdx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  }

  /* ─── File drop zone handlers ─── */
  function onDropZoneDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDropActive(true);
  }
  function onDropZoneDragLeave() {
    setDropActive(false);
  }
  function onDropZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropActive(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  /* ─── Navigate preview images ─── */
  function prevImage() {
    setActiveIndex((i) => (i > 0 ? i - 1 : i));
  }
  function nextImage() {
    setActiveIndex((i) => (i < images.length - 1 ? i + 1 : i));
  }

  const displayName = name.trim() || "Your Name";
  const displayAge = age.trim() || "25";
  const activeImage = images[activeIndex];

  /* ─────── Render ─────── */
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">

      {/* ──── LEFT: Controls ──── */}
      <aside className="space-y-5">

        {/* Photos */}
        <section className="rounded-card border border-white/[0.08] bg-[#1a1d23] p-5">
          <h2 className="text-base font-semibold text-white">Photos</h2>
          <p className="mt-1 text-xs text-[#667180]">Upload up to 9 photos. Drag to reorder.</p>

          {/* Image grid — reorderable */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            {images.map((img, idx) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => onDragStart(idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDragEnd={onDragEnd}
                onClick={() => setActiveIndex(idx)}
                className={`group relative aspect-[3/4] cursor-grab overflow-hidden rounded-lg border-2 transition active:cursor-grabbing ${
                  activeIndex === idx
                    ? "border-[#FD267A]"
                    : dragOverIdx === idx
                    ? "border-[#FF7854]"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <img src={img.url} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
                {/* Position badge */}
                <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">
                  {idx + 1}
                </span>
                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-500"
                >
                  &times;
                </button>
              </div>
            ))}

            {/* Add button */}
            {images.length < 9 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={onDropZoneDragOver}
                onDragLeave={onDropZoneDragLeave}
                onDrop={onDropZoneDrop}
                className={`flex aspect-[3/4] flex-col items-center justify-center rounded-lg border-2 border-dashed transition ${
                  dropActive
                    ? "border-[#FD267A] bg-[#FD267A]/10"
                    : "border-white/10 bg-[#111418] hover:border-[#FD267A]/40"
                }`}
              >
                <svg className="h-6 w-6 text-[#667180]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="mt-1 text-[10px] text-[#667180]">Add</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onPickFiles}
          />
        </section>

        {/* Profile info */}
        <section className="rounded-card border border-white/[0.08] bg-[#1a1d23] p-5">
          <h2 className="text-base font-semibold text-white">Profile Info</h2>

          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-[1fr_80px] gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-medium text-[#667180]">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-input border border-white/10 bg-[#111418] px-3 py-2.5 text-sm text-white placeholder-[#667180] outline-none transition focus:border-[#FD267A]/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-[#667180]">Age</label>
                <input
                  type="text"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="25"
                  maxLength={3}
                  className="w-full rounded-input border border-white/10 bg-[#111418] px-3 py-2.5 text-sm text-white placeholder-[#667180] outline-none transition focus:border-[#FD267A]/50"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-medium text-[#667180]">Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Software Engineer"
                className="w-full rounded-input border border-white/10 bg-[#111418] px-3 py-2.5 text-sm text-white placeholder-[#667180] outline-none transition focus:border-[#FD267A]/50"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-medium text-[#667180]">Company / School</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Google"
                className="w-full rounded-input border border-white/10 bg-[#111418] px-3 py-2.5 text-sm text-white placeholder-[#667180] outline-none transition focus:border-[#FD267A]/50"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-medium text-[#667180]">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="San Francisco"
                className="w-full rounded-input border border-white/10 bg-[#111418] px-3 py-2.5 text-sm text-white placeholder-[#667180] outline-none transition focus:border-[#FD267A]/50"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-medium text-[#667180]">Bio</label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write something witty..."
                maxLength={500}
                className="w-full rounded-input border border-white/10 bg-[#111418] px-3 py-2.5 text-sm text-white placeholder-[#667180] outline-none transition focus:border-[#FD267A]/50"
              />
              <p className="mt-0.5 text-right text-[10px] text-[#667180]">{bio.length}/500</p>
            </div>
          </div>
        </section>
      </aside>

      {/* ──── RIGHT: Live Tinder Card Preview ──── */}
      <section className="flex items-start justify-center rounded-card border border-white/[0.08] bg-[#1a1d23] p-5">
        <div className="w-full max-w-[375px]">
          <h2 className="mb-4 text-center text-base font-semibold text-white">Profile Preview</h2>

          {/* ── The Card ── */}
          <div className="relative overflow-hidden rounded-2xl bg-[#111418] shadow-2xl">

            {/* Image area */}
            <div className="relative aspect-[3/4] w-full bg-[#1a1d23]">
              {activeImage ? (
                <>
                  <img
                    src={activeImage.url}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />

                  {/* Tap zones for navigation */}
                  <button
                    type="button"
                    onClick={prevImage}
                    className="absolute inset-y-0 left-0 w-1/3 focus:outline-none"
                    aria-label="Previous photo"
                  />
                  <button
                    type="button"
                    onClick={nextImage}
                    className="absolute inset-y-0 right-0 w-1/3 focus:outline-none"
                    aria-label="Next photo"
                  />

                  {/* Photo indicator dots */}
                  {images.length > 1 && (
                    <div className="absolute left-0 right-0 top-2 flex justify-center gap-1 px-3">
                      {images.map((_, i) => (
                        <div
                          key={i}
                          className={`h-[3px] flex-1 rounded-full transition ${
                            i === activeIndex ? "bg-white" : "bg-white/30"
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Bottom gradient overlay */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                  {/* Name & age overlay */}
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">{displayName}</span>
                      <span className="text-xl font-light text-white/90">{displayAge}</span>
                    </div>
                    {(jobTitle || company) && (
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
                        {jobTitle && <span>{jobTitle}</span>}
                        {jobTitle && company && <span className="text-white/40">at</span>}
                        {company && <span>{company}</span>}
                      </div>
                    )}
                    {city && (
                      <div className="mt-0.5 flex items-center gap-1 text-sm text-white/60">
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span>{city}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-[#667180]">
                  <svg className="mb-2 h-10 w-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Add photos to preview</p>
                </div>
              )}
            </div>

            {/* Bio section */}
            {bio.trim() && (
              <div className="border-t border-white/[0.06] px-4 py-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{bio}</p>
              </div>
            )}
          </div>

          {/* ── Action buttons (decorative) ── */}
          <div className="mt-5 flex items-center justify-center gap-4">
            <button type="button" className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#FD267A]/30 bg-[#1a1d23] transition hover:border-[#FD267A] hover:bg-[#FD267A]/10">
              <IconX />
            </button>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#2CA8FF]/30 bg-[#1a1d23] transition hover:border-[#2CA8FF] hover:bg-[#2CA8FF]/10">
              <IconStar />
            </button>
            <button type="button" className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#4CD964]/30 bg-[#1a1d23] transition hover:border-[#4CD964] hover:bg-[#4CD964]/10">
              <IconHeart />
            </button>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#A459FF]/30 bg-[#1a1d23] transition hover:border-[#A459FF] hover:bg-[#A459FF]/10">
              <IconBolt />
            </button>
          </div>

          <p className="mt-3 text-center text-[10px] text-[#667180]">This is a preview only — tap left/right on the photo to browse.</p>
        </div>
      </section>
    </div>
  );
}
