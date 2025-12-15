-- D1 Database Schema for 伊苏存储
-- Users 表
CREATE TABLE IF NOT EXISTS Users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Files 表
CREATE TABLE IF NOT EXISTS Files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT,
  r2_key TEXT UNIQUE NOT NULL,
  upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- 创建索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_files_user_id ON Files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_r2_key ON Files(r2_key);
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);
