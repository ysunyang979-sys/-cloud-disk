-- 添加大文件组表 - 用于存储拆分上传的大文件（ZIP/文件夹）
-- 每个大文件组包含多个子文件

CREATE TABLE IF NOT EXISTS FileGroups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  group_name TEXT NOT NULL,           -- 原始文件名（如 archive.zip）
  total_size INTEGER NOT NULL,        -- 总文件大小
  file_count INTEGER NOT NULL,        -- 包含的文件数量
  group_type TEXT DEFAULT 'zip',      -- 类型：zip 或 folder
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- 大文件组中的子文件
CREATE TABLE IF NOT EXISTS FileGroupItems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,            -- 子文件名（包含路径如 folder/file.txt）
  file_size INTEGER NOT NULL,
  file_type TEXT,
  r2_key TEXT UNIQUE NOT NULL,
  upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES FileGroups(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_filegroups_user_id ON FileGroups(user_id);
CREATE INDEX IF NOT EXISTS idx_filegroupitems_group_id ON FileGroupItems(group_id);
