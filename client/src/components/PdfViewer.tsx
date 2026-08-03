import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import LoadingMessages from "./LoadingMessages";
import { getFileGeometry, OcrWord } from "../api";

// Same-origin worker copied into public/ (see build).
pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ""}/pdf.worker.min.js`;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function PdfViewer({
  url,
  fileId,
  query,
  activeIndex,
  onCount,
}: {
  url: string;
  fileId: string;
  query: string; // the committed search term (changes only on submit)
  activeIndex: number;
  onCount: (n: number) => void;
}) {
  const [numPages, setNumPages] = useState(0);
  const [width, setWidth] = useState(680);
  const [tick, setTick] = useState(0);
  const [aspect, setAspect] = useState<Record<number, number>>({});
  const [words, setWords] = useState<OcrWord[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const matchEls = useRef<HTMLElement[]>([]);
  const activeRef = useRef(activeIndex);
  activeRef.current = activeIndex;

  useEffect(() => {
    getFileGeometry(fileId)
      .then(setWords)
      .catch(() => setWords([]));
  }, [fileId]);

  useEffect(() => {
    const measure = () => {
      if (wrapRef.current) setWidth(Math.min(900, wrapRef.current.clientWidth - 28));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const textRenderer = useCallback(
    (item: { str: string }) => {
      if (!query) return item.str;
      const re = new RegExp(`(${escapeRe(query)})`, "gi");
      return item.str.replace(re, '<mark class="pdfhl">$1</mark>');
    },
    [query]
  );

  const geoMatches = useMemo(() => {
    if (!query || !words.length) return [];
    const ql = query.toLowerCase();
    return words.filter((w) => w.text.toLowerCase().includes(ql));
  }, [query, words]);

  // STABLE callbacks — passing fresh inline functions to <Page> makes react-pdf
  // reprocess the page every render, which loops with setTick (the flicker).
  const handleLoad = useCallback((p: any) => {
    const pn = p.pageNumber || 1;
    setAspect((a) => (a[pn] ? a : { ...a, [pn]: p.height / p.width || 1.414 }));
  }, []);
  const handleTextRendered = useCallback(() => setTick((t) => t + 1), []);

  // collect matches (text-layer marks + geometry boxes) once highlighting settles
  useEffect(() => {
    const t = setTimeout(() => {
      matchEls.current = Array.from(
        wrapRef.current?.querySelectorAll("mark.pdfhl, .geobox") ?? []
      ) as HTMLElement[];
      onCount(matchEls.current.length);
      matchEls.current.forEach((m, i) => m.classList.toggle("current", i === activeRef.current));
      matchEls.current[activeRef.current]?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 100);
    return () => clearTimeout(t);
  }, [query, numPages, tick, geoMatches, width, onCount]);

  // navigate immediately using the cached list
  useEffect(() => {
    const els = matchEls.current;
    if (!els.length) return;
    els.forEach((m, i) => m.classList.toggle("current", i === activeIndex));
    els[activeIndex]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIndex]);

  return (
    <div ref={wrapRef} style={{ padding: 14, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Document
        file={url}
        onLoadSuccess={(d: any) => setNumPages(d.numPages)}
        loading={<div style={{ padding: 24 }}><LoadingMessages compact /></div>}
        error={
          <div style={{ padding: 24, color: "var(--muted)" }}>
            Couldn't render this PDF here — try the <strong>Text</strong> view or download it.
          </div>
        }
      >
        {Array.from({ length: numPages }, (_, i) => {
          const pn = i + 1;
          const rh = width * (aspect[pn] || 1.414);
          const pageWords = geoMatches.filter((w) => (w.page || 1) === pn);
          return (
            <div key={i} style={{ position: "relative", marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>
              <Page
                pageNumber={pn}
                width={width}
                renderAnnotationLayer={false}
                customTextRenderer={textRenderer}
                onLoadSuccess={handleLoad}
                onRenderTextLayerSuccess={handleTextRendered}
              />
              {pageWords.map((w, j) => (
                <div
                  key={j}
                  className="geobox"
                  style={{ left: w.x * width, top: w.y * rh, width: w.w * width, height: w.h * rh }}
                />
              ))}
            </div>
          );
        })}
      </Document>
    </div>
  );
}
