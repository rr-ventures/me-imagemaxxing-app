"use client";

import { useState } from "react";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previews, setPreviews] = useState<{ [key: string]: string }>({});
  const [processing, setProcessing] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setPreviews({}); // Clear previous previews
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setProcessing(true);

    // TODO: Implement actual API call to Python backend
    // For now, this is a placeholder

    // Simulate processing
    setTimeout(() => {
      // Mock data - in production, this would come from the API
      setPreviews({
        dating_warm: "/placeholder.jpg",
        dating_cool: "/placeholder.jpg",
        instagram_vibrant: "/placeholder.jpg",
        instagram_matte: "/placeholder.jpg",
        tiktok_bright: "/placeholder.jpg",
        natural_enhance: "/placeholder.jpg",
        professional_sharp: "/placeholder.jpg",
        golden_hour: "/placeholder.jpg",
        soft_portrait: "/placeholder.jpg",
        high_contrast: "/placeholder.jpg",
      });
      setProcessing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            ImageMaxxing App
          </h1>
          <p className="text-xl text-gray-600">
            Turn average photos into dating profile & social media ready images
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Fiverr-quality editing in seconds
          </p>
        </div>

        {/* Upload Section */}
        {!selectedFile && !Object.keys(previews).length && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="border-4 border-dashed border-gray-300 rounded-xl p-16 hover:border-purple-400 transition-colors">
              <input
                type="file"
                id="file-upload"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <svg
                  className="w-20 h-20 text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-xl font-semibold text-gray-700 mb-2">
                  Click to upload a photo
                </span>
                <span className="text-sm text-gray-500">
                  PNG, JPG up to 10MB
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Selected File */}
        {selectedFile && !Object.keys(previews).length && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Ready to process
                </h2>
                <p className="text-gray-600">{selectedFile.name}</p>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <button
              onClick={handleProcess}
              disabled={processing}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-8 rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? "Processing..." : "Generate 10 Variations"}
            </button>
          </div>
        )}

        {/* Results Grid */}
        {Object.keys(previews).length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900">
                Your Variations
              </h2>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviews({});
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium"
              >
                Upload New Photo
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(previews).map(([preset, url]) => (
                <div
                  key={preset}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="aspect-square bg-gray-100 relative">
                    {/* Placeholder for actual image */}
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      Preview
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm mb-2 capitalize">
                      {preset.replace(/_/g, " ")}
                    </h3>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors">
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-16 bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            10 Professional Presets
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start space-x-3">
              <span className="text-purple-600 font-bold">•</span>
              <div>
                <strong>Dating Warm:</strong> Warm tones, soft glow, skin enhancement
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-purple-600 font-bold">•</span>
              <div>
                <strong>Dating Cool:</strong> Modern cool tones, professional look
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-purple-600 font-bold">•</span>
              <div>
                <strong>Instagram Vibrant:</strong> Punchy colors, eye-catching
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-purple-600 font-bold">•</span>
              <div>
                <strong>Instagram Matte:</strong> Trendy faded aesthetic
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-purple-600 font-bold">•</span>
              <div>
                <strong>TikTok Bright:</strong> High energy, youthful vibe
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-purple-600 font-bold">•</span>
              <div>
                <strong>Natural Enhance:</strong> Subtle improvements, no fake look
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-purple-600 font-bold">•</span>
              <div>
                <strong>Professional Sharp:</strong> Crisp, business-appropriate
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-purple-600 font-bold">•</span>
              <div>
                <strong>Golden Hour:</strong> Warm sunset glow, romantic
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-purple-600 font-bold">•</span>
              <div>
                <strong>Soft Portrait:</strong> Dreamy, smooth skin, gentle
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-purple-600 font-bold">•</span>
              <div>
                <strong>High Contrast:</strong> Bold, striking, modern
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
