-- Reforço de segurança do bucket de comprovantes: impõe tipo e tamanho no
-- servidor (a validação no cliente não basta).
update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
where id = 'receipts';
