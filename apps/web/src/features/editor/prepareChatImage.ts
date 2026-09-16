const maxInputBytes = 20 * 1024 * 1024;
const maxPixels = 40_000_000;
const maxEdge = 1024;
const targetBytes = 200 * 1024;
const types = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export type PreparedChatImage = {
  file: File;
  width: number;
  height: number;
  originalBytes: number;
  converted: boolean;
  stillFrame: boolean;
};

// Only the resulting File is uploaded. The local original is never sent or persisted.
export async function prepareChatImage(file: File): Promise<PreparedChatImage> {
  if (!types.has(file.type) || !file.size)
    throw new Error('올바른 PNG, JPEG, WebP, GIF 이미지를 선택해 주세요.');
  if (file.size > maxInputBytes)
    throw new Error('원본 이미지는 20 MB 이하로 선택해 주세요. 업로드 전에 자동으로 줄입니다.');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('이미지를 읽지 못했습니다. 다른 이미지 파일을 선택해 주세요.');
  }
  const canvas = document.createElement('canvas');
  try {
    const { width, height } = bitmap;
    if (!width || !height || width * height > maxPixels || Math.max(width, height) > 16384)
      throw new Error('이미지 해상도가 너무 큽니다. 필요한 화면 영역만 잘라서 첨부해 주세요.');
    const stillFrame = file.type === 'image/gif';
    if (Math.max(width, height) <= maxEdge && file.size <= targetBytes && !stillFrame)
      return { file, width, height, originalBytes: file.size, converted: false, stillFrame };
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('이 브라우저에서 이미지를 변환할 수 없습니다.');
    let edge = Math.min(maxEdge, Math.max(width, height));
    const minimumEdge = Math.min(512, edge);
    for (;;) {
      const scale = Math.min(1, edge / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.7, 0.6, 0.5, 0.4]) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', quality),
        );
        if (!blob || blob.type !== 'image/jpeg')
          throw new Error('이미지 압축에 실패했습니다. 다른 이미지로 다시 시도해 주세요.');
        if (blob.size <= targetBytes) {
          const name = (file.name.replace(/\.[^.]+$/, '') || 'reference').slice(0, 180) + '.jpg';
          return {
            file: new File([blob], name, { type: blob.type }),
            width: canvas.width,
            height: canvas.height,
            originalBytes: file.size,
            converted: true,
            stillFrame,
          };
        }
      }
      if (edge <= minimumEdge)
        throw new Error(
          '이미지를 200 KB 이하로 줄이지 못했습니다. 필요한 영역만 잘라서 첨부해 주세요.',
        );
      edge = Math.max(minimumEdge, Math.floor(edge * 0.8));
    }
  } finally {
    bitmap.close();
    canvas.width = canvas.height = 0;
  }
}

export function imagePreparationSummary(image: PreparedChatImage): string {
  const size = (bytes: number) =>
    bytes >= 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${image.converted ? `${size(image.originalBytes)} → ${size(image.file.size)}` : `${size(image.file.size)} · 원본 유지`} · ${image.width}×${image.height}${image.stillFrame ? ' · GIF 첫 프레임' : ''}`;
}
