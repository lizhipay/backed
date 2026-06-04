export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, unknown>;
}

export interface PageMetaRaw {
  page: number;
  page_size: number;
  total: number;
}

export interface ApiEnvelope<T> {
  data: T;
  error?: ApiError;
  meta?: PageMetaRaw;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

export type AdminStatus = 'active' | 'disabled' | 'locked';
export type ThemePreference = 'dark' | 'light' | 'auto';
export type LanguagePreference = 'auto' | 'zh-CN' | 'zh-TW' | 'ja-JP' | 'en-US';

export interface Admin {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string;
  avatar_object_key?: string;
  status: AdminStatus;
  mfa_enabled: boolean;
  mfa_recovery_codes_remaining?: number;
  must_change_password: boolean;
  theme_preference: ThemePreference;
  language_preference: LanguagePreference;
  is_super_admin: boolean;
  last_login_at?: string | null;
  failed_login_count: number;
  locked_until?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionDef {
  id: string;
  key: string;
  resource: string;
  action: string;
  category: string;
  description: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionInfo {
  id: string;
  admin_id: string;
  user_agent: string;
  ip: string;
  expires_at: string;
  last_seen_at: string;
  revoked_at?: string | null;
  revoked_reason?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_admin_id?: string | null;
  actor_label: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown> | null;
  status: 'success' | 'denied' | 'error' | 'failure';
  ip: string;
  user_agent: string;
  request_id: string;
  created_at: string;
}

export interface Setting {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  mfaEnabled: boolean;
  recoveryCodesRemaining: number;
  roles: Role[];
  themePreference: ThemePreference;
  languagePreference: LanguagePreference;
}

export interface MeResponse {
  admin: Admin;
  roles: Role[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponseRaw {
  access_token?: string;
  token_type?: string;
  expires_at: string;
  mfa_required?: boolean;
  mfa_token?: string;
  admin_hint?: {
    email?: string;
  };
}

export interface LoginResponse {
  kind: 'authenticated';
  accessToken: string;
  expiresAt: string;
}

export interface MfaRequiredResponse {
  kind: 'mfa_required';
  mfaToken: string;
  expiresAt: string;
  adminHint?: {
    email?: string;
  };
}

export type LoginResult = LoginResponse | MfaRequiredResponse;
