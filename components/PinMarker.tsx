"use client";

import { Pin } from "@/lib/types";

interface PinMarkerProps {
  pin: Pin;
  onClick: (pin: Pin) => void;
}

export default function PinMarker({ pin, onClick }: PinMarkerProps) {
  return (
    <button
      className="absolute w-8 h-8 sm:w-10 sm:h-10 -ml-4 -mt-4 sm:-ml-5 sm:-mt-5 rounded-full border-2 border-white shadow-lg overflow-hidden hover:scale-125 active:scale-110 transition-transform z-10 hover:z-30 cursor-pointer touch-manipulation"
      style={{
        left: `${pin.x * 100}%`,
        top: `${pin.y * 100}%`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(pin);
      }}
      onTouchEnd={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick(pin);
      }}
      title={`${pin.name} - ${pin.organization}`}
    >
      {pin.image_url ? (
        <img
          src={pin.image_url}
          alt={pin.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold">
          {pin.name.charAt(0).toUpperCase()}
        </div>
      )}
    </button>
  );
}
