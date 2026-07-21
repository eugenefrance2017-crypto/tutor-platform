"use client";

import { useState } from "react";

interface BoardEmbedProps {
  boardUrl: string;
  title?: string;
  buttonText?: string;
}

export default function BoardEmbed({ 
  boardUrl, 
  title = "Виртуальная доска", 
  buttonText = "🎨 Открыть доску" 
}: BoardEmbedProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!boardUrl) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition shadow-md"
      >
        {buttonText}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="flex-1 min-h-[60vh]">
              <iframe
                src={boardUrl}
                className="w-full h-full"
                allowFullScreen
                frameBorder="0"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}