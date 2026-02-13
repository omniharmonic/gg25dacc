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
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null);
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

  const handleMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (selectedPin) {
        setSelectedPin(null);
        return;
      }
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      setClickPos({ x, y });
      setShowForm(true);
    },
    [selectedPin]
  );

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setClickPos(null);
  }, []);

  const handlePinClick = useCallback((pin: Pin) => {
    setSelectedPin(pin);
  }, []);

  return (
    <div className="relative w-full h-screen bg-gray-900 flex items-center justify-center overflow-hidden">
      <div
        ref={containerRef}
        className="relative cursor-crosshair"
        style={{
          width: "100%",
          maxWidth: "100vw",
          aspectRatio: "3508 / 2480",
          maxHeight: "100vh",
          backgroundImage: "url(/map.svg)",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
        onClick={handleMapClick}
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
