/**
 * Reusable streaming response handler with debounced updates
 * Reduces re-renders by batching state updates
 */

export const useStreamingResponse = (debounceMs = 100) => {
  let textBuffer = '';
  let debounceTimer = null;

  const flushBuffer = (onUpdate) => {
    if (textBuffer && onUpdate) {
      onUpdate(textBuffer);
    }
  };

  const addToBuffer = (content, onUpdate) => {
    textBuffer += content;
    
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => flushBuffer(onUpdate), debounceMs);
  };

  const cleanup = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  };

  const reset = () => {
    textBuffer = '';
    cleanup();
  };

  return {
    addToBuffer,
    flushBuffer,
    cleanup,
    reset
  };
};

/**
 * Generic fetch and stream handler
 * Handles SSE-format responses with debouncing
 * NOT a React hook - use within async contexts only
 */
export const fetchAndStream = async (
  url,
  onUpdate,
  onComplete,
  onError,
  debounceMs = 100
) => {
  const textBuffer = useStreamingResponse(debounceMs);
  let streamSucceeded = false;

  try {
    const response = await fetch(url, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          textBuffer.flushBuffer(onUpdate);
          streamSucceeded = true;
          onComplete?.();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const content = line.slice(6);
            if (content === '[DONE]') {
              textBuffer.flushBuffer(onUpdate);
              streamSucceeded = true;
              onComplete?.();
              return;
            }
            textBuffer.addToBuffer(content, onUpdate);
          }
        }
      }
    } catch (streamError) {
      textBuffer.cleanup();
      onError?.(new Error(`Stream interrupted: ${streamError.message}`));
    }
  } catch (error) {
    textBuffer.cleanup();
    onError?.(error);
  }
};
