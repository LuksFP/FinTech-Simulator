import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'receipts';
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/**
 * Uploads a receipt file to the user's private folder and returns the
 * storage path (saved in transactions.receipt_url). The bucket is private,
 * so the file is only ever served through a short-lived signed URL.
 */
export async function uploadReceipt(file: File): Promise<string> {
  if (file.size > MAX_SIZE) throw new Error('Arquivo muito grande (máx. 5 MB).');
  if (!ALLOWED.includes(file.type)) throw new Error('Use imagem (JPG, PNG, WEBP) ou PDF.');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error('Falha ao enviar o comprovante.');

  return path;
}

/** Generates a short-lived signed URL to view/download a receipt. */
export async function getReceiptUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error || !data) throw new Error('Não foi possível abrir o comprovante.');
  return data.signedUrl;
}

/** Best-effort removal of a receipt from storage. */
export async function removeReceipt(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}
