"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Pin } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import PinMarker from "./PinMarker";
import PinForm from "./PinForm";
import PinDetail from "./PinDetail";

export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [showForm, setShowForm] = useState(false);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);

  useEffect(() => {
    const fetchPins = async () => {
      const { data } = await supabase
        .from("pins")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setPins(data);
    };
    fetchPins();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("pins-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pins" },
        (payload) => {
          setPins((prev) => [...prev, payload.new as Pin]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getPosition = useCallback(
    (clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / rect.width,
        y: (clientY - rect.top) / rect.height,
      };
    },
    []
  );

  const handleMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (selectedPin) {
        setSelectedPin(null);
        return;
      }
      const pos = getPosition(e.clientX, e.clientY);
      if (!pos) return;
      setClickPos(pos);
      setShowForm(true);
    },
    [selectedPin, getPosition]
  );

  // Touch support for mobile
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(
    null
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartRef.current;
      if (!start) return;

      const touch = e.changedTouches[0];
      const dx = Math.abs(touch.clientX - start.x);
      const dy = Math.abs(touch.clientY - start.y);
      const dt = Date.now() - start.time;

      // Only trigger if it's a tap (not a drag/scroll)
      if (dx < 10 && dy < 10 && dt < 300) {
        if (selectedPin) {
          setSelectedPin(null);
          return;
        }
        const pos = getPosition(touch.clientX, touch.clientY);
        if (!pos) return;
        e.preventDefault();
        setClickPos(pos);
        setShowForm(true);
      }
      touchStartRef.current = null;
    },
    [selectedPin, getPosition]
  );

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setClickPos(null);
  }, []);

  const handlePinClick = useCallback((pin: Pin) => {
    setSelectedPin(pin);
  }, []);

  return (
    <div className="relative w-full h-[100dvh] bg-gray-900 flex items-center justify-center overflow-hidden">
      {/* Tap instruction - mobile only */}
      {pins.length === 0 && !showForm && !selectedPin && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-black/70 text-white/80 text-xs sm:text-sm px-4 py-2 rounded-full backdrop-blur-sm pointer-events-none">
          Tap the map to place yourself
        </div>
      )}

      <div
        ref={containerRef}
        className="relative cursor-crosshair touch-none"
        style={{
          width: "100%",
          maxWidth: "100vw",
          aspectRatio: "3508 / 2480",
          maxHeight: "100dvh",
          backgroundImage: "url(/map.svg)",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
        onClick={handleMapClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {clickPos && (
          <div
            className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-blue-500 bg-blue-500/30 animate-pulse pointer-events-none z-20"
            style={{
              left: `${clickPos.x * 100}%`,
              top: `${clickPos.y * 100}%`,
            }}
          />
        )}

        {pins.map((pin) => (
          <PinMarker key={pin.id} pin={pin} onClick={handlePinClick} />
        ))}
      </div>

      {showForm && clickPos && (
        <PinForm position={clickPos} onClose={handleFormClose} />
      )}

      {selectedPin && (
        <PinDetail pin={selectedPin} onClose={() => setSelectedPin(null)} />
      )}
    </div>
  );
}
