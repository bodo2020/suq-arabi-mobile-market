import { supabase } from '@/lib/supabase';

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const RECEIPT_MAX_SIDE = 1600;

/** Shrinks a phone photo to a JPEG under ~500 KB so storage and bandwidth stay small. */
export async function compressReceipt(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, RECEIPT_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('receipt_compress_failed');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7));
  if (!blob) throw new Error('receipt_compress_failed');
  return new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
}

/** Uploads a transfer receipt through the server; the image is stored in a private bucket. */
export async function uploadPaymentReceipt(file: File, requestId: string): Promise<string> {
  const compressed = await compressReceipt(file);
  const form = new FormData();
  form.append('file', compressed);
  form.append('request_id', requestId);
  const { data, error } = await supabase.functions.invoke('upload-payment-receipt', { body: form });
  if (error || !data?.storage_path) throw new Error('receipt_upload_failed');
  return data.storage_path as string;
}
