import { useEffect, useRef, useState, useCallback } from "react";
import { renderAsync } from "docx-preview";
import { useDocList } from "../hooks/useDocList";

const DOC_BASE_WIDTH = 816;

export default function DocViewerPage() {
  const { docs, loading, error } = useDocList();
  const [renderError, setRenderError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [fitScale, setFitScale] = useState(1);
  const [docHeight, setDocHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const availableWidth = entry.contentRect.width - 32;
      setFitScale(availableWidth < DOC_BASE_WIDTH ? availableWidth / DOC_BASE_WIDTH : 1);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const renderDoc = useCallback(async (uri: string) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setRenderError(null);
    setRendering(true);
    setZoom(100);
    setDocHeight(0);

    try {
      const res = await fetch(uri, { signal: controller.signal });
      if (!res.ok) throw new Error(`파일 로드 실패: ${res.status}`);
      const buffer = await res.arrayBuffer();

      if (controller.signal.aborted) return;
      const container = containerRef.current;
      if (!container) throw new Error("렌더링 컨테이너를 찾을 수 없습니다.");

      container.innerHTML = "";
      await renderAsync(buffer, container, undefined, {
        className: "docx-wrapper",
        inWrapper: true,
        ignoreWidth: false,
        breakPages: true,
      });

      setDocHeight(container.scrollHeight);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setRenderError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setRendering(false);
    }
  }, []);

  useEffect(() => {
    if (docs.length === 0) return;
    renderDoc(docs[0].uri);
  }, [docs, renderDoc]);

  if (loading) {
    return (
      <div className="status-screen">
        <div className="status-spinner" />
        <p className="status-text">문서를 불러오는 중...</p>
      </div>
    );
  }

  if (error || docs.length === 0) {
    return (
      <div className="status-screen">
        <p className="status-text error">{error ?? "문서가 없습니다."}</p>
      </div>
    );
  }

  const appliedScale = fitScale * (zoom / 100);

  return (
    <div className="viewer-root">
      <header className="viewer-header">
        <span className="doc-title">{docs[0].name}</span>

        <div className="header-zoom">
          <button
            className="zoom-btn"
            onClick={() => setZoom(prev => Math.max(prev - 20, 50))}
            disabled={zoom <= 50}
            aria-label="축소"
          >
            <Minus />
          </button>
          <span className="zoom-value">{zoom}%</span>
          <button
            className="zoom-btn"
            onClick={() => setZoom(prev => Math.min(prev + 20, 200))}
            disabled={zoom >= 200}
            aria-label="확대"
          >
            <Plus />
          </button>
        </div>
      </header>

      <main className="viewer-body" ref={bodyRef}>
        {rendering && (
          <div className="render-overlay">
            <div className="status-spinner" />
          </div>
        )}
        {renderError && (
          <div className="render-error">
            <span>⚠ {renderError}</span>
          </div>
        )}
        <div className="docx-scroll-area">
          <div
            className="docx-container"
            style={{
              transform: `scale(${appliedScale})`,
              transformOrigin: "top center",
              width: `${DOC_BASE_WIDTH}px`,
              height: `${docHeight}px`,
              marginBottom: `${docHeight * appliedScale - docHeight + 32}px`,
            }}
          >
            <div ref={containerRef} />
          </div>
        </div>
      </main>
    </div>
  );
}

function Minus() {
  return <span style={{ fontSize: "18px", lineHeight: 1, color: "#000000", userSelect: "none" }}>−</span>;
}

function Plus() {
  return <span style={{ fontSize: "18px", lineHeight: 1, color: "#000000", userSelect: "none" }}>+</span>;
}
