-- +goose Up
-- Administrator preferences added after the initial identity schema.

ALTER TABLE admins
    ADD COLUMN IF NOT EXISTS language_preference TEXT NOT NULL DEFAULT 'auto'
    CHECK (language_preference IN ('auto', 'zh-CN', 'zh-TW', 'ja-JP', 'en-US'));

-- +goose Down
