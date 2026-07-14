import { toBlob } from "html-to-image";

function download(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function exportScheduleImage(node: HTMLElement, month: string): Promise<void> {
  const options = {
    backgroundColor: "#ffffff",
    pixelRatio: 2,
    cacheBust: true,
  };

  const blob = await toBlob(node, options);

  if (!blob) {
    throw new Error("일정표 이미지를 생성하지 못했습니다.");
  }

  download(blob, `${month}-성인-복사단-일정표.png`);
}
