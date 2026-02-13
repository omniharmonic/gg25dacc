"use client";

import { Pin } from "@/lib/types";

interface PinDetailProps {
  pin: Pin;
  onClose: () => void;
}

export default function PinDetail({ pin, onClose }: PinDetailProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border-t sm:border border-white/10 sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 w-full sm:max-w-sm safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle - mobile */}
        <div className="sm:hidden flex justify-center mb-3">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-white">
            {pin.name}
          </h2>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white text-xl cursor-pointer p-1"
          >
            &times;
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          {pin.image_url ? (
            <img
              src={pin.image_url}
              alt={pin.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white/20"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg sm:text-xl font-bold">
              {pin.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-white font-medium truncate">
              {pin.organization}
            </div>
            <div className="text-sm text-blue-400 truncate">{pin.sector}</div>
            <div className="text-xs text-white/40">{pin.quadrant}</div>
          </div>
        </div>

        {pin.dacc_statement && (
          <div className="mb-4">
            <div className="text-xs text-white/50 mb-1">d/acc Statement</div>
            <p className="text-sm text-white/80">{pin.dacc_statement}</p>
          </div>
        )}

        <div className="space-y-2 text-sm">
          {pin.telegram && (
            <div className="flex items-center gap-2">
              <span className="text-white/50">Telegram:</span>
              <a
                href={`https://t.me/${pin.telegram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline truncate"
              >
                {pin.telegram}
              </a>
            </div>
          )}
          {pin.ens && (
            <div className="flex items-center gap-2">
              <span className="text-white/50">ENS:</span>
              <span className="text-white/80 truncate">{pin.ens}</span>
            </div>
          )}
          {pin.email && (
            <div className="flex items-center gap-2">
              <span className="text-white/50">Email:</span>
              <a
                href={`mailto:${pin.email}`}
                className="text-blue-400 hover:underline truncate"
              >
                {pin.email}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
