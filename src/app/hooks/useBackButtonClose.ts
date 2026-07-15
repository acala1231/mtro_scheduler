import { useEffect, useId, useRef, type MutableRefObject } from "react";

type PopupEntry = {
  id: string;
  onCloseRef: MutableRefObject<() => void>;
  isRegisteredRef: MutableRefObject<boolean>;
  isClosingByHistoryRef: MutableRefObject<boolean>;
};

const openPopupStack: PopupEntry[] = [];
let listenerInstalled = false;
let ignoreNextPopupPopState = false;

function removePopup(id: string) {
  for (let index = openPopupStack.length - 1; index >= 0; index -= 1) {
    if (openPopupStack[index].id === id) {
      openPopupStack.splice(index, 1);
      return;
    }
  }
}

function topPopup() {
  return openPopupStack[openPopupStack.length - 1];
}

function handlePopState() {
  if (ignoreNextPopupPopState) {
    ignoreNextPopupPopState = false;
    return;
  }

  const entry = topPopup();
  if (!entry) return;

  entry.isClosingByHistoryRef.current = true;
  entry.isRegisteredRef.current = false;
  removePopup(entry.id);
  entry.onCloseRef.current();
  window.setTimeout(() => {
    entry.isClosingByHistoryRef.current = false;
  }, 0);
}

function ensurePopStateListener() {
  if (listenerInstalled) return;

  window.addEventListener("popstate", handlePopState);
  listenerInstalled = true;
}

export function useBackButtonClose(open: boolean, onClose: () => void) {
  const id = useId();
  const isRegisteredRef = useRef(false);
  const isClosingByHistoryRef = useRef(false);
  const skipNextHistoryBackRef = useRef(false);
  const onCloseRef = useRef(onClose);

  onCloseRef.current = onClose;

  useEffect(() => {
    ensurePopStateListener();

    if (open && !isRegisteredRef.current) {
      openPopupStack.push({ id, onCloseRef, isRegisteredRef, isClosingByHistoryRef });
      isRegisteredRef.current = true;
      window.history.pushState({ popupId: id }, "", window.location.href);
      return;
    }

    if (!open && isRegisteredRef.current) {
      const wasTopPopup = topPopup()?.id === id;
      isRegisteredRef.current = false;
      removePopup(id);

      if (skipNextHistoryBackRef.current) {
        skipNextHistoryBackRef.current = false;
        return;
      }

      if (wasTopPopup && !isClosingByHistoryRef.current) {
        ignoreNextPopupPopState = true;
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
