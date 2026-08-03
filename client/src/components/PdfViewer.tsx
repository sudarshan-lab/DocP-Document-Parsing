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
  query: string;
  activeIndex: number;
  onCount: (n: number) => void;
}) {
  const [numPages, setNumPages] = useState(0);
  const [width, setWidth] = useState(680);
  const [tick, setTick] = useState(0); // bumped when a page (re)renders
  const [aspect, setAspect] = useState<Record<number, number>>({}); // page -> height/width
  const [words, setWords] = useState<OcrWord[]>([]); // OCR geometry (scanned PDFs)
  const [dq, setDq] = useState(""); // debounced query (avoids re-rendering the text layer on every keystroke)
  const wrapRef = useRef<HTMLDivElement>(null);
  const matchEls = useRef<HTMLElement[]>([]);
  const activeRef = useRef(activeIndex);
  activeRef.current = activeIndex;

  // debounce the highlight query
  useEffect(() => {
    const t = setTimeout(() => setDq(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

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

  // digital PDFs: highlight in the text layer (rebuilt only when dq changes)
  const textRenderer = useCallback(
    (item: { str: string }) => {
      if (!dq) return item.str;
      const re = new RegExp(`(${escapeRe(dq)})`, "gi");
      return item.str.replace(re, '<mark class="pdfhl">$1</mark>');
    },
    [dq]
  );

  // scanned PDFs: words matching the query, overlaid as boxes
  const geoMatches = useMemo(() => {
    if (!dq || !words.length) return [];
    const ql = dq.toLowerCase();
    return words.filter((w) => w.text.toLowerCase().includes(ql));
  }, [dq, words]);

  // collect all match elements (text-layer marks + geometry boxes) once the
  // highlight settles; report the count and mark the active one
  useEffect(() => {
    const t = setTimeout(() => {
      matchEls.current = Array.from(
        wrapRef.current?.querySelectorAll("mark.pdfhl, .geobox") ?? []
      ) as HTMLElement[];
      onCount(matchEls.current.length);
      matchEls.current.forEach((m, i) => m.classList.toggle("current", i === activeRef.current));
      matchEls.current[activeRef.current]?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 80);
    return () => clearTimeout(t);
  }, [dq, numPages, tick, geoMatches, width, onCount]);

  // navigation: scroll to the active match immediately (uses the cached list)
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
                onLoadSuccess={(p: any) => {
                  setAspect((a) => (a[pn] ? a : { ...a, [pn]: p.height / p.width || 1.414 }));
                }}
                onRenderTextLayerSuccess={() => setTick((t) => t + 1)}
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
