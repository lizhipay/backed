import type { TFunction } from 'i18next';
import type { AuditLog, PermissionDef, Role } from '@/foundation/api';
import { i18n } from './i18n';

type Locale = 'zh-CN' | 'zh-TW' | 'ja-JP' | 'en-US';

const FALLBACK_LOCALE: Locale = 'zh-CN';

function currentLocale(): Locale {
  const language = i18n.resolvedLanguage || i18n.language || FALLBACK_LOCALE;
  if (language.startsWith('zh-TW') || language.startsWith('zh-HK')) return 'zh-TW';
  if (language.startsWith('ja')) return 'ja-JP';
  if (language.startsWith('en')) return 'en-US';
  return 'zh-CN';
}

const ROLE_NAMES: Record<string, Record<Locale, string>> = {
  super_admin: {
    'zh-CN': '超级管理员',
    'zh-TW': '超級管理員',
    'ja-JP': 'スーパー管理者',
    'en-US': 'Super Admin',
  },
  admin: {
    'zh-CN': '管理员',
    'zh-TW': '管理員',
    'ja-JP': '管理者',
    'en-US': 'Admin',
  },
  readonly: {
    'zh-CN': '只读管理员',
    'zh-TW': '唯讀管理員',
    'ja-JP': '読み取り専用管理者',
    'en-US': 'Read Only',
  },
  read_only: {
    'zh-CN': '只读管理员',
    'zh-TW': '唯讀管理員',
    'ja-JP': '読み取り専用管理者',
    'en-US': 'Read Only',
  },
};

const ROLE_DESCRIPTIONS: Record<string, Record<Locale, string>> = {
  super_admin: {
    'zh-CN': '拥有完整系统访问权限',
    'zh-TW': '擁有完整系統存取權限',
    'ja-JP': 'システム全体へのアクセス権限',
    'en-US': 'Full system access',
  },
  admin: {
    'zh-CN': '标准管理员权限',
    'zh-TW': '標準管理員權限',
    'ja-JP': '標準管理者権限',
    'en-US': 'Standard administrator',
  },
  readonly: {
    'zh-CN': '仅可查看基础后台数据',
    'zh-TW': '僅可檢視基礎後台資料',
    'ja-JP': '基本管理データの閲覧のみ',
    'en-US': 'Read-only administrator',
  },
  read_only: {
    'zh-CN': '仅可查看基础后台数据',
    'zh-TW': '僅可檢視基礎後台資料',
    'ja-JP': '基本管理データの閲覧のみ',
    'en-US': 'Read-only administrator',
  },
};

const CATEGORY_LABELS: Record<string, Record<Locale, string>> = {
  'Access Control': {
    'zh-CN': '访问控制',
    'zh-TW': '存取控制',
    'ja-JP': 'アクセス制御',
    'en-US': 'Access Control',
  },
  Security: {
    'zh-CN': '安全',
    'zh-TW': '安全',
    'ja-JP': 'セキュリティ',
    'en-US': 'Security',
  },
  System: {
    'zh-CN': '系统',
    'zh-TW': '系統',
    'ja-JP': 'システム',
    'en-US': 'System',
  },
};

const RESOURCE_LABELS: Record<string, Record<Locale, string>> = {
  admins: { 'zh-CN': '管理员', 'zh-TW': '管理員', 'ja-JP': '管理者', 'en-US': 'Administrators' },
  roles: { 'zh-CN': '角色', 'zh-TW': '角色', 'ja-JP': 'ロール', 'en-US': 'Roles' },
  permissions: { 'zh-CN': '权限', 'zh-TW': '權限', 'ja-JP': '権限', 'en-US': 'Permissions' },
  audit_logs: { 'zh-CN': '审计日志', 'zh-TW': '稽核日誌', 'ja-JP': '監査ログ', 'en-US': 'Audit Logs' },
  sessions: { 'zh-CN': '会话', 'zh-TW': '工作階段', 'ja-JP': 'セッション', 'en-US': 'Sessions' },
  settings: { 'zh-CN': '设置', 'zh-TW': '設定', 'ja-JP': '設定', 'en-US': 'Settings' },
  admin: { 'zh-CN': '管理员', 'zh-TW': '管理員', 'ja-JP': '管理者', 'en-US': 'Admin' },
  auth: { 'zh-CN': '认证', 'zh-TW': '認證', 'ja-JP': '認証', 'en-US': 'Auth' },
  session: { 'zh-CN': '会话', 'zh-TW': '工作階段', 'ja-JP': 'セッション', 'en-US': 'Session' },
  role: { 'zh-CN': '角色', 'zh-TW': '角色', 'ja-JP': 'ロール', 'en-US': 'Role' },
  permission: { 'zh-CN': '权限', 'zh-TW': '權限', 'ja-JP': '権限', 'en-US': 'Permission' },
};

const ACTION_LABELS: Record<string, Record<Locale, string>> = {
  view: { 'zh-CN': '查看', 'zh-TW': '檢視', 'ja-JP': '表示', 'en-US': 'View' },
  create: { 'zh-CN': '创建', 'zh-TW': '建立', 'ja-JP': '作成', 'en-US': 'Create' },
  update: { 'zh-CN': '更新', 'zh-TW': '更新', 'ja-JP': '更新', 'en-US': 'Update' },
  delete: { 'zh-CN': '删除', 'zh-TW': '刪除', 'ja-JP': '削除', 'en-US': 'Delete' },
  disable: { 'zh-CN': '禁用/启用', 'zh-TW': '停用/啟用', 'ja-JP': '無効化/有効化', 'en-US': 'Enable / Disable' },
  assign_permissions: { 'zh-CN': '分配权限', 'zh-TW': '指派權限', 'ja-JP': '権限を割り当て', 'en-US': 'Assign permissions' },
  assign_roles: { 'zh-CN': '分配角色', 'zh-TW': '指派角色', 'ja-JP': 'ロールを割り当て', 'en-US': 'Assign roles' },
  revoke: { 'zh-CN': '吊销', 'zh-TW': '撤銷', 'ja-JP': '取り消し', 'en-US': 'Revoke' },
};

const PERMISSION_LABELS: Record<string, Record<Locale, string>> = {
  'admins.view': { 'zh-CN': '查看管理员', 'zh-TW': '檢視管理員', 'ja-JP': '管理者を表示', 'en-US': 'View administrators' },
  'admins.create': { 'zh-CN': '创建管理员', 'zh-TW': '建立管理員', 'ja-JP': '管理者を作成', 'en-US': 'Create administrators' },
  'admins.update': { 'zh-CN': '更新管理员', 'zh-TW': '更新管理員', 'ja-JP': '管理者を更新', 'en-US': 'Update administrators' },
  'admins.delete': { 'zh-CN': '删除管理员', 'zh-TW': '刪除管理員', 'ja-JP': '管理者を削除', 'en-US': 'Delete administrators' },
  'admins.disable': { 'zh-CN': '禁用或启用管理员', 'zh-TW': '停用或啟用管理員', 'ja-JP': '管理者を有効化または無効化', 'en-US': 'Enable or disable administrators' },
  'roles.view': { 'zh-CN': '查看角色', 'zh-TW': '檢視角色', 'ja-JP': 'ロールを表示', 'en-US': 'View roles' },
  'roles.create': { 'zh-CN': '创建角色', 'zh-TW': '建立角色', 'ja-JP': 'ロールを作成', 'en-US': 'Create roles' },
  'roles.update': { 'zh-CN': '更新角色', 'zh-TW': '更新角色', 'ja-JP': 'ロールを更新', 'en-US': 'Update roles' },
  'roles.delete': { 'zh-CN': '删除角色', 'zh-TW': '刪除角色', 'ja-JP': 'ロールを削除', 'en-US': 'Delete roles' },
  'roles.assign_permissions': { 'zh-CN': '为角色分配权限', 'zh-TW': '為角色指派權限', 'ja-JP': 'ロールに権限を割り当て', 'en-US': 'Assign permissions to roles' },
  'permissions.view': { 'zh-CN': '查看权限目录', 'zh-TW': '檢視權限目錄', 'ja-JP': '権限カタログを表示', 'en-US': 'View permission catalog' },
  'audit_logs.view': { 'zh-CN': '查看审计日志', 'zh-TW': '檢視稽核日誌', 'ja-JP': '監査ログを表示', 'en-US': 'View audit logs' },
  'sessions.view': { 'zh-CN': '查看会话', 'zh-TW': '檢視工作階段', 'ja-JP': 'セッションを表示', 'en-US': 'View sessions' },
  'sessions.revoke': { 'zh-CN': '吊销会话或强制下线', 'zh-TW': '撤銷工作階段或強制登出', 'ja-JP': 'セッションを取り消しまたは強制ログアウト', 'en-US': 'Revoke sessions or force logout' },
  'settings.view': { 'zh-CN': '查看系统设置', 'zh-TW': '檢視系統設定', 'ja-JP': 'システム設定を表示', 'en-US': 'View system settings' },
  'settings.update': { 'zh-CN': '更新系统设置', 'zh-TW': '更新系統設定', 'ja-JP': 'システム設定を更新', 'en-US': 'Update system settings' },
};

const AUDIT_ACTIONS: Record<string, Record<Locale, string>> = {
  'auth.login': { 'zh-CN': '登录', 'zh-TW': '登入', 'ja-JP': 'ログイン', 'en-US': 'Login' },
  'auth.logout': { 'zh-CN': '退出登录', 'zh-TW': '登出', 'ja-JP': 'ログアウト', 'en-US': 'Logout' },
  'auth.mfa_required': { 'zh-CN': '需要 MFA 验证', 'zh-TW': '需要 MFA 驗證', 'ja-JP': 'MFA 検証が必要', 'en-US': 'MFA required' },
  'auth.mfa_verify': { 'zh-CN': 'MFA 验证', 'zh-TW': 'MFA 驗證', 'ja-JP': 'MFA 検証', 'en-US': 'MFA verification' },
  'auth.password_reset_request': { 'zh-CN': '请求重置密码', 'zh-TW': '請求重設密碼', 'ja-JP': 'パスワードリセット要求', 'en-US': 'Password reset request' },
  'me.update_profile': { 'zh-CN': '更新个人资料', 'zh-TW': '更新個人資料', 'ja-JP': 'プロフィール更新', 'en-US': 'Update profile' },
  'me.change_password': { 'zh-CN': '修改密码', 'zh-TW': '修改密碼', 'ja-JP': 'パスワード変更', 'en-US': 'Change password' },
  'me.avatar_upload': { 'zh-CN': '上传头像', 'zh-TW': '上傳頭像', 'ja-JP': 'アバターをアップロード', 'en-US': 'Upload avatar' },
  'me.avatar_delete': { 'zh-CN': '删除头像', 'zh-TW': '刪除頭像', 'ja-JP': 'アバターを削除', 'en-US': 'Delete avatar' },
  'me.mfa_setup': { 'zh-CN': '创建 MFA 设置', 'zh-TW': '建立 MFA 設定', 'ja-JP': 'MFA 設定を作成', 'en-US': 'Create MFA setup' },
  'me.mfa_enable': { 'zh-CN': '启用 MFA', 'zh-TW': '啟用 MFA', 'ja-JP': 'MFA を有効化', 'en-US': 'Enable MFA' },
  'me.mfa_disable': { 'zh-CN': '关闭 MFA', 'zh-TW': '關閉 MFA', 'ja-JP': 'MFA を無効化', 'en-US': 'Disable MFA' },
  'me.mfa_recovery_code_used': { 'zh-CN': '使用 MFA 恢复码', 'zh-TW': '使用 MFA 恢復碼', 'ja-JP': 'MFA リカバリーコードを使用', 'en-US': 'Use MFA recovery code' },
  'me.session_revoke': { 'zh-CN': '吊销个人会话', 'zh-TW': '撤銷個人工作階段', 'ja-JP': '自分のセッションを取り消し', 'en-US': 'Revoke own session' },
  'permission.denied': { 'zh-CN': '权限拒绝', 'zh-TW': '權限拒絕', 'ja-JP': '権限拒否', 'en-US': 'Permission denied' },
  'bootstrap.super_admin_recovered': { 'zh-CN': '恢复超级管理员', 'zh-TW': '恢復超級管理員', 'ja-JP': 'スーパー管理者を復旧', 'en-US': 'Recover super admin' },
};

function localized(
  table: Record<string, Record<Locale, string>>,
  key: string,
  fallback: string,
): string {
  const locale = currentLocale();
  return table[key]?.[locale] ?? table[key]?.[FALLBACK_LOCALE] ?? fallback;
}

export function roleDisplayName(role: Role, t: TFunction): string {
  return t(`roleCatalog.${role.slug}.name`, {
    defaultValue: localized(ROLE_NAMES, role.slug, role.name),
  });
}

export function roleDescription(role: Role, t: TFunction): string {
  return t(`roleCatalog.${role.slug}.description`, {
    defaultValue: localized(ROLE_DESCRIPTIONS, role.slug, role.description),
  });
}

export function permissionCategoryLabel(value: string, t: TFunction): string {
  return t(`permissionCatalog.categories.${value}`, {
    defaultValue: localized(CATEGORY_LABELS, value, value),
  });
}

export function permissionResourceLabel(value: string, t: TFunction): string {
  return t(`permissionCatalog.resources.${value}`, {
    defaultValue: localized(RESOURCE_LABELS, value, value),
  });
}

export function permissionActionLabel(value: string, t: TFunction): string {
  return t(`permissionCatalog.actions.${value}`, {
    defaultValue: localized(ACTION_LABELS, value, value),
  });
}

export function permissionLabel(permission: PermissionDef, t: TFunction): string {
  return t(`permissionCatalog.items.${permission.key}.label`, {
    defaultValue: localized(PERMISSION_LABELS, permission.key, permission.description || permission.key),
  });
}

export function permissionDescription(
  permission: PermissionDef,
  t: TFunction,
): string {
  return t(`permissionCatalog.items.${permission.key}.description`, {
    defaultValue: localized(PERMISSION_LABELS, permission.key, permission.description),
  });
}

export function auditActionLabel(log: AuditLog, t: TFunction): string {
  return t(`auditActions.${log.action}`, {
    defaultValue: localized(AUDIT_ACTIONS, log.action, log.action),
  });
}

export function resourceTypeLabel(value: string, t: TFunction): string {
  return t(`resourceTypes.${value}`, {
    defaultValue: localized(RESOURCE_LABELS, value, value),
  });
}
