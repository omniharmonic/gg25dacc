"use client";

import { Pin } from "@/lib/types";

interface PinMarkerProps {
  pin: Pin;
  onClick: (pin: Pin) => void;
}

export default function PinMarker({ pin, onClick }: PinMarkerProps) {
  return (
    <button
      className="absolute -ml-5 -mt-5 w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden hover:scale-125 transition-transform z-10 hover:z-30 cursor-pointer"
      style={{
        left: `${pin.x * 100}%`,
        top: `${pin.y * 100}%`,
      }}
      onClick={(e) => {
        e.stopPropagation();
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
        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
          {pin.name.charAt(0).toUpperCase()}
        </div>
      )}
    </button>
  );
}
