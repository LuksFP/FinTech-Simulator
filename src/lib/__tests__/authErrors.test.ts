import { describe, it, expect } from 'vitest';
import { translateAuthError } from '../authErrors';

describe('translateAuthError', () => {
  it('translates invalid credentials', () => {
    expect(translateAuthError('Invalid login credentials')).toBe('Email ou senha incorretos.');
  });

  it('translates already registered', () => {
    expect(translateAuthError('User already registered')).toBe(
      'Este email já está cadastrado. Tente fazer login.',
    );
  });

  it('translates email not confirmed', () => {
    expect(translateAuthError('Email not confirmed')).toBe(
      'Confirme seu email antes de fazer login.',
    );
  });

  it('translates rate limit', () => {
    expect(translateAuthError('over_email_send_rate_limit')).toBe(
      'Muitas tentativas. Aguarde alguns minutos.',
    );
  });

  it('translates google provider conflict', () => {
    expect(translateAuthError('provider google not allowed')).toBe(
      'Este email está vinculado ao Google. Use o botão "Entrar com Google".',
    );
  });

  it('translates weak password', () => {
    expect(translateAuthError('Password should be at least 6')).toBe(
      'A senha deve ter pelo menos 6 caracteres.',
    );
  });

  it('translates signup disabled', () => {
    expect(translateAuthError('signup_disabled')).toBe(
      'Novos cadastros estão temporariamente desativados.',
    );
  });

  it('returns original message for unknown errors', () => {
    const unknown = 'some_unknown_error_code';
    expect(translateAuthError(unknown)).toBe(unknown);
  });
});
