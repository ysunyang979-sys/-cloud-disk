-- 为 Files 表添加过期时间字段
ALTER TABLE Files ADD COLUMN expires_at DATETIME DEFAULT NULL;

-- 为 FileGroups 表添加过期时间字段
ALTER TABLE FileGroups ADD COLUMN expires_at DATETIME DEFAULT NULL;

-- 创建索引以便快速查询过期文件
CREATE INDEX IF NOT EXISTS idx_files_expires_at ON Files(expires_at);
CREATE INDEX IF NOT EXISTS idx_filegroups_expires_at ON FileGroups(expires_at);
