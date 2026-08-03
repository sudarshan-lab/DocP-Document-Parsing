import { useEffect, useMemo, useRef, useState } from "react";
import { getFileGeometry, OcrWord } from "../api";

// Shows an image and overlays highlight boxes on OCR words matching the query,
// using the normalized bounding boxes Textract stored at ingest.
export default function ImageViewer({
  id,
  viewUrl,
  fileName,
  query,
  activeIndex,
  onCount,
}: {
  id: string;
  viewUrl: string;
  fileName: string;
  query: string;
  activeIndex: number;
  onCount: (n: number) => void;
}) {
  const [words, setWords] = useState<OcrWord[] | null>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const boxRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    getFileGeometry(id)
      .then(setWords)
      .catch(() => setWords([]));
  }, [id]);

  const measure = () => {
    if (imgRef.current) setDims({ w: imgRef.current.clientWidth, h: imgRef.current.clientHeight });
  };
  useEffect(() => {
    if (imgRef.current?.complete) measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const matches = useMemo(() => {
    if (!words || !query) return [];
    const ql = query.toLowerCase();
    return words.filter((w) => w.text.toLowerCase().includes(ql));
  }, [words, query]);

  useEffect(() => {
    onCount(matches.length);
  }, [matches, onCount]);
  useEffect(() => {
    boxRefs.current[activeIndex]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIndex, matches]);

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 12 }}>
      <div style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
        <img
          ref={imgRef}
          src={viewUrl}
          alt={fileName}
          onLoad={measure}
          style={{ maxWidth: "100%", display: "block", borderRadius: 6 }}
        />
        {matches.map((w, i) => (
          <div
            key={i}
            ref={(el) => {
              boxRefs.current[i] = el;
            }}
            style={{
              position: "absolute",
              left: w.x * dims.w,
              top: w.y * dims.h,
              width: w.w * dims.w,
              height: w.h * dims.h,
              background: i === activeIndex ? "rgba(255,150,50,0.45)" : "rgba(255,214,10,0.4)",
              outline: i === activeIndex ? "2px solid #ff9632" : "none",
              borderRadius: 2,
              pointerEvents: "none",
            }}
          />
        ))}
        {words && words.length === 0 && query && (
          <div
            style={{
              position: "absolute",
              left: 8,
              top: 8,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 12,
              color: "var(--muted)",
              lineHeight: 1.4,
            }}
          >
            No stored text for this image — re-upload to enable in-image highlighting.
          </div>
        )}
      </div>
    </div>
  );
}
