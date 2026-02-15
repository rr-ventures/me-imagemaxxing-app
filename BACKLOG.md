# BACKLOG - me-imagemaxxing-app

## Priority: HIGH
**User has dating photos ready + wants Fiverr research + wants gallery page**

---

## 🔒 Auth & User Management (Disabled — Needs Fix)

### User Authentication (NextAuth)
- [ ] Fix NextAuth Credentials provider + PrismaAdapter redirect issue on Railway (0.0.0.0 ERR_ADDRESS_INVALID)
- [ ] Options: switch to cookie-based custom auth, or fix NextAuth middleware URL construction behind reverse proxy
- [ ] Re-enable middleware.ts auth gate
- [ ] Re-enable SessionProvider in app/providers.tsx
- [ ] Re-enable requireAuthAndLimit in API routes (generate/preset, generate/prompt)
- [ ] Re-enable /api/me with real user lookup
- [ ] Re-enable signin page UI
- [ ] Add per-user generation rate limiting (was 5 free generations)
- [ ] Add admin role with unlimited generations
- [ ] Add sign-out button in header

---

## 🔥 Immediate (Priority #1-3)

### 1. Research Fiverr Photo Editors
- [ ] Study top-rated Fiverr dating profile editors
- [ ] Document exact editing techniques they use
- [ ] Capture before/after examples for reference
- [ ] Update presets based on research findings
- [ ] Test refined presets against real Fiverr edits

### 2. Add Before/After Gallery Page
- [ ] Create `/gallery` route in Next.js
- [ ] Design side-by-side comparison layout
- [ ] Add slider component for before/after comparison
- [ ] Upload user's dating photos as before examples
- [ ] Generate all 10 preset variations as after examples
- [ ] Make gallery publicly shareable (portfolio piece)

### 3. Improve Existing Presets
- [ ] Refine dodge & burn implementation (currently basic)
- [ ] Implement proper frequency separation for skin smoothing
- [ ] Add eye sparkle/whitening (subtle)
- [ ] Enhance color grading algorithms
- [ ] Test all 10 presets on real dating photos

---

## 🚀 Core Features (Next up)

### Batch Upload & Processing
- [ ] Implement drag-and-drop file upload (up to 100 photos)
- [ ] Add progress bar for batch processing
- [ ] Queue system for large batches
- [ ] Error handling for unsupported file types

### Download System
- [ ] Add individual download buttons per variation
- [ ] Implement "Download All" for all 10 variations
- [ ] Add filename customization
- [ ] Support high-res exports (maintain original quality)

### Side-by-Side Comparison
- [ ] Create comparison view component
- [ ] Add zoom functionality
- [ ] Implement slider to toggle between original/edited
- [ ] Add preset name labels

---

## 💡 Future Enhancements

### AI-Powered Physical Enhancements
- [ ] Research face editing AI models (fix double chin, hair smoothing)
- [ ] Integrate with face editing API or model
- [ ] Add toggle for "AI enhancements" vs "edit-only"
- [ ] Test for natural-looking results

### Platform-Specific Optimization
- [ ] Add Tinder preset (warm, inviting)
- [ ] Add Hinge preset (authentic, slightly cooler)
- [ ] Add LinkedIn preset (professional, sharp)
- [ ] Add Instagram Stories preset (bright, vibrant)

### User Customization
- [ ] Allow users to adjust intensity sliders per preset
- [ ] Save favorite presets
- [ ] Custom preset creation (advanced users)

### Technical Improvements
- [ ] Optimize image processing speed (consider parallel processing)
- [ ] Add caching for generated variations
- [ ] Implement serverless image processing (AWS Lambda or similar)
- [ ] Add watermark option for portfolio use

---

## 📚 Documentation & Testing

### Documentation
- [ ] Add detailed preset descriptions in UI
- [ ] Create video walkthrough
- [ ] Document editing techniques used
- [ ] Add FAQ section

### Testing
- [ ] Test on various photo types (indoor, outdoor, selfie, full-body)
- [ ] Test on different skin tones
- [ ] Validate against Fiverr professional results
- [ ] User testing with real dating profiles

---

## 🎯 Success Criteria

**MVP Complete When:**
- ✅ 10 professional presets implemented
- ⬜ Fiverr research incorporated
- ⬜ Before/after gallery live
- ⬜ Batch upload working
- ⬜ Download system functional

**Portfolio Ready When:**
- ⬜ Gallery page showcases real transformations (6/10 → 9/10)
- ⬜ Presets match or exceed Fiverr quality
- ⬜ Shareable demo with impressive results
