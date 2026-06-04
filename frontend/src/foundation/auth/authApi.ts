import { api } from '@/foundation/api/client';
import type {
  CurrentUser,
  LoginRequest,
  LoginResult,
  LoginResponseRaw,
  MeResponse,
} from '@/foundation/api/types';

function normalizeMe(res: MeResponse): CurrentUser {
  const displayName = res.admin.display_name || res.admin.username || res.admin.email;
  return {
    id: res.admin.id,
    email: res.admin.email,
    username: res.admin.username,
    displayName,
    avatarUrl: res.admin.avatar_url || '',
    mfaEnabled: res.admin.mfa_enabled,
    recoveryCodesRemaining: res.admin.mfa_recovery_codes_remaining ?? 0,
    roles: res.roles ?? [],
    themePreference: res.admin.theme_preference,
    languagePreference: res.admin.language_preference,
  };
}

function normalizeLoginResponse(res: LoginResponseRaw): LoginResult {
  if (res.mfa_required) {
    return {
      kind: 'mfa_required',
      mfaToken: res.mfa_token ?? '',
      expiresAt: res.expires_at,
      adminHint: res.admin_hint,
    };
  }
  return {
    kind: 'authenticated',
    accessToken: res.access_token ?? '',
    expiresAt: res.expires_at,
  };
}

export const authApi = {
  login: async (body: LoginRequest): Promise<LoginResult> => {
    const res = await api.post<LoginResponseRaw>('/auth/login', body, {
      anonymous: true,
    });
    return normalizeLoginResponse(res);
  },

  verifyMfa: async (body: {
    mfa_token: string;
    code?: string;
    recovery_code?: string;
  }): Promise<LoginResult> => {
    const res = await api.post<LoginResponseRaw>('/auth/mfa/verify', body, {
      anonymous: true,
    });
    return normalizeLoginResponse(res);
  },

  refresh: async (): Promise<Extract<LoginResult, { kind: 'authenticated' }>> => {
    const res = await api.post<LoginResponseRaw>('/auth/refresh', undefined, {
      anonymous: true,
    });
    return {
      kind: 'authenticated',
      accessToken: res.access_token ?? '',
      expiresAt: res.expires_at,
    };
  },

  logout: () =>
    api.post<{ ok: true }>('/auth/logout', undefined, { anonymous: true }),

  me: async () => normalizeMe(await api.get<MeResponse>('/me')),

  myPermissions: async () => {
    const res = await api.get<{
      permissions: string[];
      is_super_admin: boolean;
    }>('/me/permissions');
    return res.is_super_admin ? ['*', ...res.permissions] : res.permissions;
  },

  requestPasswordReset: (email: string) =>
    api.post<{ ok: true }>(
      '/auth/password-reset/request',
      { email },
      { anonymous: true },
    ),

  confirmPasswordReset: (token: string, newPassword: string) =>
    api.post<{ ok: true }>(
      '/auth/password-reset/confirm',
      { token, new_password: newPassword },
      { anonymous: true },
    ),
};
