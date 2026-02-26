// src/components/DocViewer.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { renderAsync } from "docx-preview";
import { useDocList } from "../hooks/useDocList";

export default function DocViewerPage() {
  const { docs, loading, error } = useDocList();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const renderDoc = useCallback(async (uri: string) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setRenderError(null);
    setRendering(true);

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
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        useBase64URL: true,
      });
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setRenderError(e instanceof Error ? e.message : "알 수 없는 오류");
    } finally {
      setRendering(false);
    }
  }, []);

  useEffect(() => {
    if (docs.length === 0) return;
    renderDoc(docs[currentIndex].uri);

    return () => {
      abortRef.current?.abort();
    };
  }, [docs, currentIndex, renderDoc]);

  if (loading) {
    return <div className="status-screen"><p>문서 목록을 불러오는 중...</p></div>;
  }

  if (error) {
    return <div className="status-screen error"><p>오류: {error}</p></div>;
  }

  if (docs.length === 0) {
    return <div className="status-screen"><p>표시할 문서가 없습니다. doc-list.json을 확인해주세요.</p></div>;
  }

  const currentDoc = docs[currentIndex];

  return (
    <div className="viewer-container">
      <main className="viewer-main">
        <div className="viewer-header">
          <button
            className="nav-btn"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => prev - 1)}
          >
            ← 이전
          </button>
          <span className="doc-title">{currentDoc.name}</span>
          <button
            className="nav-btn"
            disabled={currentIndex === docs.length - 1}
            onClick={() => setCurrentIndex((prev) => prev + 1)}
          >
            다음 →
          </button>
        </div>

        <div className="viewer-body">
          {rendering && (
            <div className="render-overlay">
              <p>문서 렌더링 중...</p>
            </div>
          )}
          {renderError && (
            <div className="status-screen error">
              <p>렌더링 오류: {renderError}</p>
            </div>
          )}
          <div
            ref={containerRef}
            className="docx-container"
            style={{ display: renderError ? "none" : "block" }}
          />
        </div>

        <div className="viewer-footer">
          {currentIndex + 1} / {docs.length}
        </div>
      </main>
    </div>
  );
}
