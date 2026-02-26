// src/hooks/useDocList.ts
import { useEffect, useState } from "react";

export interface DocItem {
  name: string;
  uri: string;
}

export function useDocList() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/doc-list.json")
      .then((res) => {
        if (!res.ok) throw new Error("doc-list.json 로드 실패");
        return res.json();
      })
      .then((data: DocItem[]) => setDocs(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { docs, loading, error };
}
