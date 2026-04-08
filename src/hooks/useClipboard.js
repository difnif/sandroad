import { useState, useCallback } from 'react';

// Cross-project clipboard for nodes (in-memory; no persistence needed)
export function useClipboard() {
  const [clipboard, setClipboard] = useState(null); // {node, sourceName}

  const copy = useCallback((node, sourceName) => {
    setClipboard({
      node: JSON.parse(JSON.stringify(node)),
      sourceName: sourceName || ''
    });
  }, []);

  const clear = useCallback(() => setClipboard(null), []);

  return { clipboard, copy, clear };
}
