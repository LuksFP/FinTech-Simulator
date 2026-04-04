/**
 * Maps Supabase auth error messages to user-friendly Portuguese strings.
 * Extracted as a pure function for testability and reuse.
 */
export function translateAuthError(message: string): string {
  if (message.includes('Invalid login credentials'))
    return 'Email ou senha incorretos.';
  if (message.includes('User already registered'))
    return 'Este email já está cadastrado. Tente fazer login.';
  if (message.includes('Email not confirmed'))
    return 'Confirme seu email antes de fazer login.';
  if (message.includes('over_email_send_rate_limit'))
    return 'Muitas tentativas. Aguarde alguns minutos.';
  if (message.includes('provider') && message.includes('google'))
    return 'Este email está vinculado ao Google. Use o botão "Entrar com Google".';
  if (message.includes('Password should be at least'))
    return 'A senha deve ter pelo menos 6 caracteres.';
  if (message.includes('Unable to validate email address'))
    return 'Endereço de email inválido.';
  if (message.includes('signup_disabled'))
    return 'Novos cadastros estão temporariamente desativados.';
  if (message.includes('too_many_requests'))
    return 'Muitas tentativas. Tente novamente em alguns minutos.';
  return message;
}
