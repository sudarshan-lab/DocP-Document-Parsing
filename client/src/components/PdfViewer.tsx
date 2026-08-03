import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import LoadingMessages from "./LoadingMessages";

// Same-origin worker copied into public/ (see build).
pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ""}/pdf.worker.min.js`;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function PdfViewer({
  url,
  query,
  activeIndex,
  onCount,
}: {
  url: string;
  query: string;
  activeIndex: number;
  onCount: (n: number) => void;
}) {
  const [numPages, setNumPages] = useState(0);
  const [width, setWidth] = useState(680);
  const [tick, setTick] = useState(0); // bumped when a page text layer finishes
  const wrapRef = useRef<HTMLDivElement>(null);

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

  // recount highlights, mark the active one, scroll it into view
  useEffect(() => {
    const t = setTimeout(() => {
      const marks = wrapRef.current
        ? Array.from(wrapRef.current.querySelectorAll("mark.pdfhl"))
        : [];
      onCount(marks.length);
      marks.forEach((m, i) => m.classList.toggle("current", i === activeIndex));
      (marks[activeIndex] as HTMLElement | undefined)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 120);
    return () => clearTimeout(t);
  }, [query, numPages, activeIndex, tick, onCount]);

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
        {Array.from({ length: numPages }, (_, i) => (
          <div key={i} style={{ marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>
            <Page
              pageNumber={i + 1}
              width={width}
              renderAnnotationLayer={false}
              customTextRenderer={textRenderer}
              onRenderTextLayerSuccess={() => setTick((x) => x + 1)}
            />
          </div>
        ))}
      </Document>
    </div>
  );
}
