import { useEffect, useId, useRef } from "react";

const openPopupStack: string[] = [];

function removePopup(id: string) {
  const index = openPopupStack.lastIndexOf(id);
  if (index >= 0) {
    openPopupStack.splice(index, 1);
  }
}

function topPopupId() {
  return openPopupStack[openPopupStack.length - 1];
}

export function useBackButtonClose(open: boolean, onClose: () => void) {
  const id = useId();
  const isRegisteredRef = useRef(false);
  const isClosingByHistoryRef = useRef(false);
  const skipNextHistoryBackRef = useRef(false);
  const onCloseRef = useRef(onClose);

  onCloseRef.current = onClose;

  useEffect(() => {
    const handlePopState = () => {
      if (!isRegisteredRef.current || topPopupId() !== id) return;

      isClosingByHistoryRef.current = true;
      isRegisteredRef.current = false;
      removePopup(id);
      onCloseRef.current();
      window.setTimeout(() => {
        isClosingByHistoryRef.current = false;
      }, 0);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [id]);

  useEffect(() => {
    if (open && !isRegisteredRef.current) {
      openPopupStack.push(id);
      isRegisteredRef.current = true;
      window.history.pushState({ popupId: id }, "", window.location.href);
      return;
    }

    if (!open && isRegisteredRef.current) {
      const wasTopPopup = topPopupId() === id;
      isRegisteredRef.current = false;
      removePopup(id);

      if (skipNextHistoryBackRef.current) {
        skipNextHistoryBackRef.current = false;
        return;
      }

      if (wasTopPopup && !isClosingByHistoryRef.current) {
        window.history.back();
      }
    }
  }, [id, open]);

  useEffect(() => {
    return () => {
      removePopup(id);
      isRegisteredRef.current = false;
    };
  }, [id]);

  return {
    closeWithoutHistoryBack() {
      skipNextHistoryBackRef.current = true;
      onCloseRef.current();
    },
  };
}
