"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Pin } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import PinMarker from "./PinMarker";
import PinForm from "./PinForm";
import PinDetail from "./PinDetail";

export default function MapCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [showForm, setShowForm] = useState(false);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);

  // Zoom & pan state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });

  // Touch tracking refs
  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
  } | null>(null);
  const lastTouchDistRef = useRef<number | null>(null);
  const lastTouchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const isPanningRef = useRef(false);
  const isPinchingRef = useRef(false);

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

  // Clamp translate so map doesn't go off-screen
  const clampTranslate = useCallback(
    (tx: number, ty: number, s: number) => {
      if (s <= 1) return { x: 0, y: 0 };
      const map = mapRef.current;
      if (!map) return { x: tx, y: ty };
      const rect = map.getBoundingClientRect();
      const w = rect.width / s;
      const h = rect.height / s;
      const maxX = ((s - 1) * w) / 2;
      const maxY = ((s - 1) * h) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, tx)),
        y: Math.max(-maxY, Math.min(maxY, ty)),
      };
    },
    []
  );

  const applyTransform = useCallback(
    (s: number, tx: number, ty: number) => {
      const clamped = clampTranslate(tx, ty, s);
      scaleRef.current = s;
      translateRef.current = clamped;
      setScale(s);
      setTranslate(clamped);
    },
    [clampTranslate]
  );

  // Convert screen coordinates to map-relative 0-1 position
  const getPosition = useCallback(
    (clientX: number, clientY: number) => {
      const map = mapRef.current;
      if (!map) return null;
      const rect = map.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return null;
      return { x, y };
    },
    []
  );

  // Desktop click
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

  // Desktop scroll wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      const newScale = Math.max(1, Math.min(5, scaleRef.current + delta));
      applyTransform(
        newScale,
        translateRef.current.x,
        translateRef.current.y
      );
    },
    [applyTransform]
  );

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      isPanningRef.current = false;
      isPinchingRef.current = false;
    } else if (e.touches.length === 2) {
      isPinchingRef.current = true;
      isPanningRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistRef.current = Math.hypot(dx, dy);
      lastTouchCenterRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDistRef.current !== null) {
        // Pinch zoom
        e.preventDefault();
        isPinchingRef.current = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const ratio = dist / lastTouchDistRef.current;
        const newScale = Math.max(
          1,
          Math.min(5, scaleRef.current * ratio)
        );

        // Pan with pinch center movement
        const center = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        const panDx = lastTouchCenterRef.current
          ? center.x - lastTouchCenterRef.current.x
          : 0;
        const panDy = lastTouchCenterRef.current
          ? center.y - lastTouchCenterRef.current.y
          : 0;

        applyTransform(
          newScale,
          translateRef.current.x + panDx,
          translateRef.current.y + panDy
        );

        lastTouchDistRef.current = dist;
        lastTouchCenterRef.current = center;
      } else if (
        e.touches.length === 1 &&
        scaleRef.current > 1 &&
        touchStartRef.current
      ) {
        // Pan (only when zoomed in)
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          isPanningRef.current = true;
        }

        if (isPanningRef.current) {
          e.preventDefault();
          applyTransform(
            scaleRef.current,
            translateRef.current.x + (touch.clientX - touchStartRef.current.x),
            translateRef.current.y + (touch.clientY - touchStartRef.current.y)
          );
          touchStartRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: touchStartRef.current.time,
          };
        }
      }
    },
    [applyTransform]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (isPinchingRef.current) {
        lastTouchDistRef.current = null;
        lastTouchCenterRef.current = null;
        if (e.touches.length === 0) isPinchingRef.current = false;
        return;
      }

      if (isPanningRef.current) {
        isPanningRef.current = false;
        touchStartRef.current = null;
        return;
      }

      const start = touchStartRef.current;
      if (!start || e.touches.length > 0) return;

      const touch = e.changedTouches[0];
      const dx = Math.abs(touch.clientX - start.x);
      const dy = Math.abs(touch.clientY - start.y);
      const dt = Date.now() - start.time;

      // Tap detection
      if (dx < 10 && dy < 10 && dt < 300) {
        if (selectedPin) {
          setSelectedPin(null);
        } else {
          const pos = getPosition(touch.clientX, touch.clientY);
          if (pos) {
            e.preventDefault();
            setClickPos(pos);
            setShowForm(true);
          }
        }
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

  const zoomIn = useCallback(() => {
    const newScale = Math.min(5, scaleRef.current + 0.5);
    applyTransform(newScale, translateRef.current.x, translateRef.current.y);
  }, [applyTransform]);

  const zoomOut = useCallback(() => {
    const newScale = Math.max(1, scaleRef.current - 0.5);
    applyTransform(newScale, translateRef.current.x, translateRef.current.y);
  }, [applyTransform]);

  const resetZoom = useCallback(() => {
    applyTransform(1, 0, 0);
  }, [applyTransform]);

  return (
    <div className="relative w-full h-[100dvh] bg-gray-900 flex items-center justify-center overflow-hidden">
      {/* Hint */}
      {pins.length === 0 && !showForm && !selectedPin && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-black/70 text-white/80 text-xs sm:text-sm px-4 py-2 rounded-full backdrop-blur-sm pointer-events-none">
          Tap the map to place yourself
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-1.5">
        <button
          onClick={zoomIn}
          className="w-10 h-10 bg-black/70 backdrop-blur-sm text-white rounded-lg flex items-center justify-center text-xl hover:bg-black/90 active:bg-white/20 cursor-pointer border border-white/10"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="w-10 h-10 bg-black/70 backdrop-blur-sm text-white rounded-lg flex items-center justify-center text-xl hover:bg-black/90 active:bg-white/20 cursor-pointer border border-white/10"
        >
          &minus;
        </button>
        {scale > 1 && (
          <button
            onClick={resetZoom}
            className="w-10 h-10 bg-black/70 backdrop-blur-sm text-white rounded-lg flex items-center justify-center text-xs hover:bg-black/90 active:bg-white/20 cursor-pointer border border-white/10"
          >
            1:1
          </button>
        )}
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        className="relative cursor-crosshair"
        style={{
          width: "100%",
          maxWidth: "100vw",
          aspectRatio: "3508 / 2480",
          maxHeight: "100dvh",
          touchAction: "none",
        }}
        onClick={handleMapClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={mapRef}
          className="w-full h-full relative"
          style={{
            backgroundImage: "url(/map.svg)",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            transformOrigin: "center center",
          }}
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
