import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Types
interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  CORS_ORIGIN: string;
  SITE_URL?: string;  // 站点域名，需在环境变量中配置
  API_URL?: string;   // API 域名，需在环境变量中配置
}

// 域名配置 - 从环境变量读取，用户需自行配置
// 示例配置:
// SITE_URL = "https://your-domain.com"
// API_URL = "https://api.your-domain.com"
const getDomainConfig = (env: Env) => ({
  siteUrl: env.SITE_URL || '',
  apiUrl: env.API_URL || '',
});

interface User {
  id: number;
  email: string;
  hashed_password: string;
  created_at: string;
}

interface FileRecord {
  id: number;
  user_id: number;
  file_name: string;
  file_size: number;
  file_type: string;
  r2_key: string;
  upload_time: string;
}

interface JWTPayload {
  userId: number;
  email: string;
  exp: number;
}

// Simple JWT implementation using Web Crypto API
async function createJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  // UTF-8 safe base64 encoding
  const encodeBase64Url = (str: string): string => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  };
  
  const headerB64 = encodeBase64Url(JSON.stringify(header));
  const payloadB64 = encodeBase64Url(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${data}.${signatureB64}`;
}

async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [headerB64, payloadB64, signatureB64] = parts;
    const data = `${headerB64}.${payloadB64}`;
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    // Decode signature
    const signatureStr = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const signaturePadded = signatureStr + '='.repeat((4 - signatureStr.length % 4) % 4);
    const signatureBytes = Uint8Array.from(atob(signaturePadded), c => c.charCodeAt(0));
    
    const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(data));
    if (!valid) return null;
    
    // UTF-8 safe base64 decoding
    const decodeBase64Url = (str: string): string => {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(bytes);
    };
    
    // Decode payload with UTF-8 support
    const payload = JSON.parse(decodeBase64Url(payloadB64));
    
    return payload;
  } catch {
    return null;
  }
}

// Utility: Hash password using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Utility: Verify password
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const hash = await hashPassword(password);
  return hash === hashedPassword;
}

// Utility: Generate random string for R2 key
function generateR2Key(userId: number, fileName: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID().slice(0, 8);
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `uploads/${userId}/${timestamp}-${random}-${sanitizedName}`;
}

// Create Hono app
const app = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

// Middleware: CORS
app.use('*', async (c, next) => {
  const corsOrigin = c.env.CORS_ORIGIN || '*';
  return cors({
    origin: corsOrigin === '*' ? '*' : corsOrigin.split(','),
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400,
    credentials: true,
  })(c, next);
});

// Middleware: Logger
app.use('*', logger());

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'SunnyCloud API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ==================== Auth APIs ====================

// 多账号配置（允许以下账号登录）
const ALLOWED_USERS = [
  { email: '第一个邮箱', password: '第一个密码', userId: 1 },
  { email: '第二个邮箱', password: '第二个密码', userId: 2 },
];

// POST /api/register - 注册功能已禁用
app.post('/api/register', async (c) => {
  // 完全禁用注册功能
  return c.json({ error: '注册功能已关闭，此系统仅限邀请用户使用' }, 403);
});

// POST /api/login - 用户登录（仅限预设账号）
app.post('/api/login', async (c) => {
  try {
    const body = await c.req.json<{ email: string; password: string }>();
    
    if (!body.email || !body.password) {
      return c.json({ error: '邮箱和密码不能为空' }, 400);
    }

    // 查找匹配的账号
    const user = ALLOWED_USERS.find(
      u => u.email === body.email && u.password === body.password
    );

    if (!user) {
      return c.json({ error: '邮箱或密码错误' }, 401);
    }

    // Generate JWT token (expires in 7 days)
    const payload = {
      userId: user.userId,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7),
    };

    const token = await createJWT(payload, c.env.JWT_SECRET);

    return c.json({
      success: true,
      message: '登录成功',
      token,
      user: {
        id: user.userId,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: '登录失败，请稍后重试' }, 500);
  }
});

// ==================== Protected Routes Middleware ====================

// Auth middleware for protected routes
const authMiddleware = async (c: any, next: () => Promise<void>) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: '未授权访问，请先登录' }, 401);
  }

  const token = authHeader.slice(7);
  
  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    
    if (!payload) {
      return c.json({ error: '无效的认证令牌' }, 401);
    }
    
    // Check if token is expired
    if ((payload.exp as number) < Math.floor(Date.now() / 1000)) {
      return c.json({ error: '登录已过期，请重新登录' }, 401);
    }

    c.set('user', payload as unknown as JWTPayload);
    await next();
  } catch (error) {
    return c.json({ error: '无效的认证令牌' }, 401);
  }
};

// ==================== File APIs (Protected) ====================

// POST /api/files/generate-upload-url - 生成预签名上传URL
app.post('/api/files/generate-upload-url', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const body = await c.req.json<{ fileName: string; fileType: string; fileSize: number }>();

    if (!body.fileName) {
      return c.json({ error: '文件名不能为空' }, 400);
    }

    // Check file size limit (100MB - Cloudflare Workers free plan limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (body.fileSize && body.fileSize > maxSize) {
      return c.json({ error: '文件大小超过限制（最大100MB）' }, 400);
    }

    // Generate unique R2 key
    const r2Key = generateR2Key(user.userId, body.fileName);

    return c.json({
      success: true,
      r2Key,
      uploadUrl: `/api/files/upload-direct`,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Generate upload URL error:', error);
    return c.json({ error: '生成上传链接失败' }, 500);
  }
});

// POST /api/files/upload-direct - 直接上传文件
app.post('/api/files/upload-direct', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const r2Key = formData.get('r2Key') as string | null;

    if (!file) {
      return c.json({ error: '请选择要上传的文件' }, 400);
    }

    // Check file size limit (100MB - Cloudflare Workers free plan limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return c.json({ error: '文件大小超过限制（最大100MB）' }, 400);
    }

    // Get expiration time (in days, 0 = never expires)
    const expiresInDays = parseInt(formData.get('expiresInDays') as string) || 0;
    let expiresAt: string | null = null;
    if (expiresInDays > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + expiresInDays);
      expiresAt = expDate.toISOString();
    }

    // Generate R2 key if not provided
    const finalR2Key = r2Key || generateR2Key(user.userId, file.name);

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.BUCKET.put(finalR2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
      customMetadata: {
        originalName: file.name,
        uploadedBy: user.userId.toString(),
        uploadedAt: new Date().toISOString(),
        expiresAt: expiresAt || 'never',
      },
    });

    // Save to D1 database
    const result = await c.env.DB.prepare(`
      INSERT INTO Files (user_id, file_name, file_size, file_type, r2_key, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      user.userId,
      file.name,
      file.size,
      file.type || 'application/octet-stream',
      finalR2Key,
      expiresAt
    ).run();

    return c.json({
      success: true,
      message: '文件上传成功',
      file: {
        id: result.meta.last_row_id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        r2Key: finalR2Key,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: '文件上传失败' }, 500);
  }
});

// POST /api/files/upload-complete - 确认上传完成（用于预签名URL方式）
app.post('/api/files/upload-complete', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const body = await c.req.json<{
      fileName: string;
      fileSize: number;
      fileType: string;
      r2Key: string;
    }>();

    if (!body.fileName || !body.r2Key) {
      return c.json({ error: '文件信息不完整' }, 400);
    }

    // Verify the file exists in R2
    const r2Object = await c.env.BUCKET.head(body.r2Key);
    if (!r2Object) {
      return c.json({ error: '文件未找到，请重新上传' }, 404);
    }

    // Save to D1 database
    const result = await c.env.DB.prepare(`
      INSERT INTO Files (user_id, file_name, file_size, file_type, r2_key)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      user.userId,
      body.fileName,
      body.fileSize,
      body.fileType || 'application/octet-stream',
      body.r2Key
    ).run();

    return c.json({
      success: true,
      message: '文件记录已保存',
      fileId: result.meta.last_row_id,
    });
  } catch (error) {
    console.error('Upload complete error:', error);
    return c.json({ error: '保存文件信息失败' }, 500);
  }
});

// GET /api/files - 获取用户文件列表
app.get('/api/files', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    // Get files
    const result = await c.env.DB.prepare(`
      SELECT * FROM Files 
      WHERE user_id = ?
      ORDER BY upload_time DESC
      LIMIT ? OFFSET ?
    `).bind(user.userId, limit, offset).all<FileRecord>();

    // Get total count
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM Files WHERE user_id = ?'
    ).bind(user.userId).first<{ count: number }>();

    return c.json({
      success: true,
      files: result.results || [],
      pagination: {
        page,
        limit,
        total: countResult?.count || 0,
        totalPages: Math.ceil((countResult?.count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('List files error:', error);
    return c.json({ error: '获取文件列表失败' }, 500);
  }
});

// GET /api/files/:id - 获取单个文件详情
app.get('/api/files/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const fileId = parseInt(c.req.param('id'));

    const file = await c.env.DB.prepare(
      'SELECT * FROM Files WHERE id = ? AND user_id = ?'
    ).bind(fileId, user.userId).first<FileRecord>();

    if (!file) {
      return c.json({ error: '文件不存在' }, 404);
    }

    return c.json({ success: true, file });
  } catch (error) {
    console.error('Get file error:', error);
    return c.json({ error: '获取文件详情失败' }, 500);
  }
});

// POST /api/files/:id/generate-download-url - 生成分享链接（路径参数版本）
app.post('/api/files/:id/generate-download-url', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const fileId = parseInt(c.req.param('id'));

    if (!fileId) {
      return c.json({ error: '文件ID无效' }, 400);
    }

    // Verify file ownership
    const file = await c.env.DB.prepare(
      'SELECT * FROM Files WHERE id = ? AND user_id = ?'
    ).bind(fileId, user.userId).first<FileRecord>();

    if (!file) {
      return c.json({ error: '文件不存在或无权访问' }, 404);
    }

    // Generate a signed download token (永久有效 - 100年)
    const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 100); // 100年
    
    const downloadToken = await createJWT({
      fileId: file.id,
      r2Key: file.r2_key,
      exp: expiresAt,
    }, c.env.JWT_SECRET);

    // Generate the download URL - 使用动态域名配置
    const { apiUrl } = getDomainConfig(c.env);
    const downloadUrl = `${apiUrl}/api/download/${downloadToken}`;

    return c.json({
      success: true,
      downloadUrl,
      permanent: true,
      fileName: file.file_name,
    });
  } catch (error) {
    console.error('Generate download URL error:', error);
    return c.json({ error: '生成分享链接失败' }, 500);
  }
});

// PUT /api/files/:id/expiration - 设置文件过期时间
app.put('/api/files/:id/expiration', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const fileId = parseInt(c.req.param('id'));
    const body = await c.req.json<{ expiresInDays: number }>();

    // Verify file ownership
    const file = await c.env.DB.prepare(
      'SELECT * FROM Files WHERE id = ? AND user_id = ?'
    ).bind(fileId, user.userId).first<FileRecord>();

    if (!file) {
      return c.json({ error: '文件不存在或无权访问' }, 404);
    }

    // Calculate expiration date
    let expiresAt: string | null = null;
    if (body.expiresInDays > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + body.expiresInDays);
      expiresAt = expDate.toISOString();
    }

    // Update database
    await c.env.DB.prepare(
      'UPDATE Files SET expires_at = ? WHERE id = ?'
    ).bind(expiresAt, fileId).run();

    return c.json({
      success: true,
      message: expiresAt ? `文件将于 ${expiresAt} 过期` : '文件已设为永久保存',
      expiresAt,
    });
  } catch (error) {
    console.error('Set expiration error:', error);
    return c.json({ error: '设置过期时间失败' }, 500);
  }
});

// POST /api/files/generate-download-url - 生成预签名下载URL（分享链接）
app.post('/api/files/generate-download-url', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const body = await c.req.json<{ fileId: number; expiresIn?: number }>();

    if (!body.fileId) {
      return c.json({ error: '文件ID不能为空' }, 400);
    }

    // Verify file ownership
    const file = await c.env.DB.prepare(
      'SELECT * FROM Files WHERE id = ? AND user_id = ?'
    ).bind(body.fileId, user.userId).first<FileRecord>();

    if (!file) {
      return c.json({ error: '文件不存在或无权访问' }, 404);
    }

    // Generate a signed download token (永久有效 - 100年)
    const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 100); // 100年
    
    const downloadToken = await createJWT({
      fileId: file.id,
      r2Key: file.r2_key,
      exp: expiresAt,
    }, c.env.JWT_SECRET);

    // Generate the download URL - 使用动态域名配置
    const { apiUrl } = getDomainConfig(c.env);
    const downloadUrl = `${apiUrl}/api/download/${downloadToken}`;

    return c.json({
      success: true,
      downloadUrl,
      permanent: true, // 永久链接
      fileName: file.file_name,
    });
  } catch (error) {
    console.error('Generate download URL error:', error);
    return c.json({ error: '生成分享链接失败' }, 500);
  }
});

// GET /api/download/:token - 通过签名Token下载文件（无需认证）
app.get('/api/download/:token', async (c) => {
  try {
    const token = c.req.param('token');

    // Verify token
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    
    if (!payload) {
      return c.json({ error: '下载链接无效或已过期' }, 401);
    }

    const r2Key = payload.r2Key as string;
    
    // Check token type
    if (payload.type === 'file-download') {
      // This is a file from FileGroupItems - use r2Key directly
      const r2Object = await c.env.BUCKET.get(r2Key);
      if (!r2Object) {
        return c.json({ error: '文件数据不存在' }, 404);
      }

      const fileName = (payload.fileName as string) || 'download';
      const contentType = r2Object.httpMetadata?.contentType || 'application/octet-stream';

      return new Response(r2Object.body, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          'Cache-Control': 'private, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } else {
      // This is a file from Files table - get file info from DB
      const file = await c.env.DB.prepare(
        'SELECT * FROM Files WHERE id = ?'
      ).bind(payload.fileId).first<FileRecord>();

      if (!file) {
        return c.json({ error: '文件不存在' }, 404);
      }

      // Get file from R2
      const r2Object = await c.env.BUCKET.get(r2Key || file.r2_key);
      if (!r2Object) {
        return c.json({ error: '文件数据不存在' }, 404);
      }

      // Return file
      return new Response(r2Object.body, {
        headers: {
          'Content-Type': file.file_type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.file_name)}`,
          'Content-Length': file.file_size.toString(),
          'Cache-Control': 'private, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch (error) {
    console.error('Download error:', error);
    return c.json({ error: '下载失败' }, 500);
  }
});

// DELETE /api/files/:id - 删除文件
app.delete('/api/files/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const fileId = parseInt(c.req.param('id'));

    // Get file info first
    const file = await c.env.DB.prepare(
      'SELECT * FROM Files WHERE id = ? AND user_id = ?'
    ).bind(fileId, user.userId).first<FileRecord>();

    if (!file) {
      return c.json({ error: '文件不存在或无权删除' }, 404);
    }

    // Delete from R2
    await c.env.BUCKET.delete(file.r2_key);

    // Delete from D1
    await c.env.DB.prepare(
      'DELETE FROM Files WHERE id = ?'
    ).bind(fileId).run();

    return c.json({
      success: true,
      message: '文件已删除',
    });
  } catch (error) {
    console.error('Delete file error:', error);
    return c.json({ error: '删除文件失败' }, 500);
  }
});

// GET /api/user/stats - 获取用户统计信息
app.get('/api/user/stats', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;

    const [filesCount, totalSize] = await Promise.all([
      c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM Files WHERE user_id = ?'
      ).bind(user.userId).first<{ count: number }>(),
      
      c.env.DB.prepare(
        'SELECT COALESCE(SUM(file_size), 0) as total FROM Files WHERE user_id = ?'
      ).bind(user.userId).first<{ total: number }>(),
    ]);

    return c.json({
      success: true,
      stats: {
        totalFiles: filesCount?.count || 0,
        totalSize: totalSize?.total || 0,
        storageLimit: 10 * 1024 * 1024 * 1024, // 10GB
      },
      user: {
        id: user.userId,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return c.json({ error: '获取统计信息失败' }, 500);
  }
});

// ==================== File Groups APIs (Large Files) ====================

interface FileGroupRecord {
  id: number;
  user_id: number;
  group_name: string;
  total_size: number;
  file_count: number;
  group_type: string;
  created_at: string;
}

interface FileGroupItemRecord {
  id: number;
  group_id: number;
  file_name: string;
  file_size: number;
  file_type: string;
  r2_key: string;
  upload_time: string;
}

// POST /api/file-groups - 创建大文件组
app.post('/api/file-groups', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const body = await c.req.json<{
      groupName: string;
      totalSize: number;
      fileCount: number;
      groupType: 'zip' | 'folder';
    }>();

    if (!body.groupName || !body.totalSize || !body.fileCount) {
      return c.json({ error: '参数不完整' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO FileGroups (user_id, group_name, total_size, file_count, group_type)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      user.userId,
      body.groupName,
      body.totalSize,
      body.fileCount,
      body.groupType || 'zip'
    ).run();

    return c.json({
      success: true,
      groupId: result.meta.last_row_id,
      message: '文件组创建成功',
    });
  } catch (error) {
    console.error('Create file group error:', error);
    return c.json({ error: '创建文件组失败' }, 500);
  }
});

// POST /api/file-groups/:groupId/items - 上传文件组子文件（小于100MB）
app.post('/api/file-groups/:groupId/items', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const groupId = parseInt(c.req.param('groupId'));
    
    // Verify group ownership
    const group = await c.env.DB.prepare(
      'SELECT * FROM FileGroups WHERE id = ? AND user_id = ?'
    ).bind(groupId, user.userId).first<FileGroupRecord>();

    if (!group) {
      return c.json({ error: '文件组不存在' }, 404);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const fileName = formData.get('fileName') as string || file?.name || 'unknown';

    if (!file) {
      return c.json({ error: '请选择要上传的文件' }, 400);
    }

    // Check file size limit (100MB per chunk)
    if (file.size > 100 * 1024 * 1024) {
      return c.json({ error: '子文件大小超过限制（最大100MB），请使用分块上传' }, 400);
    }

    // Generate R2 key with group prefix
    const r2Key = `groups/${user.userId}/${groupId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
      customMetadata: {
        originalName: fileName,
        groupId: groupId.toString(),
      },
    });

    // Save to D1
    const result = await c.env.DB.prepare(`
      INSERT INTO FileGroupItems (group_id, file_name, file_size, file_type, r2_key)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      groupId,
      fileName,
      file.size,
      file.type || 'application/octet-stream',
      r2Key
    ).run();

    return c.json({
      success: true,
      itemId: result.meta.last_row_id,
      fileName,
      fileSize: file.size,
    });
  } catch (error) {
    console.error('Upload group item error:', error);
    return c.json({ error: '上传文件失败' }, 500);
  }
});

// ==================== Chunked Upload APIs ====================

// POST /api/file-groups/:groupId/items/chunked/init - 初始化分块上传
app.post('/api/file-groups/:groupId/items/chunked/init', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const groupId = parseInt(c.req.param('groupId'));
    const body = await c.req.json<{ fileName: string; fileSize: number; totalChunks: number }>();

    // Verify group ownership
    const group = await c.env.DB.prepare(
      'SELECT * FROM FileGroups WHERE id = ? AND user_id = ?'
    ).bind(groupId, user.userId).first<FileGroupRecord>();

    if (!group) {
      return c.json({ error: '文件组不存在' }, 404);
    }

    // Generate unique upload ID and R2 key
    const uploadId = crypto.randomUUID();
    const r2Key = `groups/${user.userId}/${groupId}/${Date.now()}-${body.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Create multipart upload
    const multipartUpload = await c.env.BUCKET.createMultipartUpload(r2Key, {
      httpMetadata: {
        contentType: 'application/octet-stream',
      },
      customMetadata: {
        originalName: body.fileName,
        groupId: groupId.toString(),
        uploadId,
      },
    });

    return c.json({
      success: true,
      uploadId: multipartUpload.uploadId,
      r2Key,
      totalChunks: body.totalChunks,
    });
  } catch (error) {
    console.error('Init chunked upload error:', error);
    return c.json({ error: '初始化分块上传失败' }, 500);
  }
});

// POST /api/file-groups/:groupId/items/chunked/upload - 上传单个分块
app.post('/api/file-groups/:groupId/items/chunked/upload', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const groupId = parseInt(c.req.param('groupId'));

    // Verify group ownership
    const group = await c.env.DB.prepare(
      'SELECT * FROM FileGroups WHERE id = ? AND user_id = ?'
    ).bind(groupId, user.userId).first<FileGroupRecord>();

    if (!group) {
      return c.json({ error: '文件组不存在' }, 404);
    }

    const formData = await c.req.formData();
    const chunk = formData.get('chunk') as File | null;
    const uploadId = formData.get('uploadId') as string;
    const r2Key = formData.get('r2Key') as string;
    const partNumber = parseInt(formData.get('partNumber') as string);

    if (!chunk || !uploadId || !r2Key || isNaN(partNumber)) {
      return c.json({ error: '参数不完整' }, 400);
    }

    // Resume multipart upload and upload part
    const multipartUpload = c.env.BUCKET.resumeMultipartUpload(r2Key, uploadId);
    const arrayBuffer = await chunk.arrayBuffer();
    const uploadedPart = await multipartUpload.uploadPart(partNumber, arrayBuffer);

    return c.json({
      success: true,
      partNumber,
      etag: uploadedPart.etag,
    });
  } catch (error) {
    console.error('Upload chunk error:', error);
    return c.json({ error: '上传分块失败' }, 500);
  }
});

// POST /api/file-groups/:groupId/items/chunked/complete - 完成分块上传
app.post('/api/file-groups/:groupId/items/chunked/complete', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const groupId = parseInt(c.req.param('groupId'));
    const body = await c.req.json<{
      uploadId: string;
      r2Key: string;
      fileName: string;
      fileSize: number;
      parts: Array<{ partNumber: number; etag: string }>;
    }>();

    // Verify group ownership
    const group = await c.env.DB.prepare(
      'SELECT * FROM FileGroups WHERE id = ? AND user_id = ?'
    ).bind(groupId, user.userId).first<FileGroupRecord>();

    if (!group) {
      return c.json({ error: '文件组不存在' }, 404);
    }

    // Resume and complete multipart upload
    const multipartUpload = c.env.BUCKET.resumeMultipartUpload(body.r2Key, body.uploadId);
    await multipartUpload.complete(body.parts);

    // Save to D1
    const result = await c.env.DB.prepare(`
      INSERT INTO FileGroupItems (group_id, file_name, file_size, file_type, r2_key)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      groupId,
      body.fileName,
      body.fileSize,
      'application/octet-stream',
      body.r2Key
    ).run();

    return c.json({
      success: true,
      itemId: result.meta.last_row_id,
      fileName: body.fileName,
      fileSize: body.fileSize,
    });
  } catch (error) {
    console.error('Complete chunked upload error:', error);
    return c.json({ error: '完成分块上传失败' }, 500);
  }
});

// GET /api/file-groups - 获取用户的所有文件组
app.get('/api/file-groups', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;

    const groups = await c.env.DB.prepare(`
      SELECT * FROM FileGroups WHERE user_id = ? ORDER BY created_at DESC
    `).bind(user.userId).all<FileGroupRecord>();

    return c.json({
      success: true,
      groups: groups.results || [],
    });
  } catch (error) {
    console.error('Get file groups error:', error);
    return c.json({ error: '获取文件组失败' }, 500);
  }
});

// GET /api/file-groups/:groupId - 获取文件组详情和子文件列表
app.get('/api/file-groups/:groupId', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const groupId = parseInt(c.req.param('groupId'));

    const group = await c.env.DB.prepare(
      'SELECT * FROM FileGroups WHERE id = ? AND user_id = ?'
    ).bind(groupId, user.userId).first<FileGroupRecord>();

    if (!group) {
      return c.json({ error: '文件组不存在' }, 404);
    }

    const items = await c.env.DB.prepare(
      'SELECT * FROM FileGroupItems WHERE group_id = ? ORDER BY file_name ASC'
    ).bind(groupId).all<FileGroupItemRecord>();

    return c.json({
      success: true,
      group,
      items: items.results || [],
    });
  } catch (error) {
    console.error('Get file group detail error:', error);
    return c.json({ error: '获取文件组详情失败' }, 500);
  }
});

// POST /api/file-groups/:groupId/generate-download-url - 生成文件组下载链接
app.post('/api/file-groups/:groupId/generate-download-url', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const groupId = parseInt(c.req.param('groupId'));

    const group = await c.env.DB.prepare(
      'SELECT * FROM FileGroups WHERE id = ? AND user_id = ?'
    ).bind(groupId, user.userId).first<FileGroupRecord>();

    if (!group) {
      return c.json({ error: '文件组不存在' }, 404);
    }

    // Create download token (100 years = permanent)
    const expiresAt = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 100);
    const token = await createJWT({
      groupId,
      userId: user.userId,
      type: 'group-download',
      exp: expiresAt,
    }, c.env.JWT_SECRET);

    // 使用前端下载页面 - 使用动态域名配置
    const { siteUrl } = getDomainConfig(c.env);
    const downloadUrl = `${siteUrl}/download?token=${token}`;

    return c.json({
      success: true,
      downloadUrl,
      groupName: group.group_name,
      totalSize: group.total_size,
      fileCount: group.file_count,
      permanent: true,
    });
  } catch (error) {
    console.error('Generate group download URL error:', error);
    return c.json({ error: '生成下载链接失败' }, 500);
  }
});

// GET /api/file-groups/download/:token - 下载文件组（打包成ZIP）
app.get('/api/file-groups/download/:token', async (c) => {
  try {
    const token = c.req.param('token');
    console.log('Download group token:', token?.substring(0, 50) + '...');
    
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    console.log('JWT payload:', payload);
    
    if (!payload) {
      return c.json({ error: '无效的下载链接（token验证失败）' }, 400);
    }
    
    if (payload.type !== 'group-download') {
      return c.json({ error: `无效的下载链接（type: ${payload.type}）` }, 400);
    }

    const groupId = payload.groupId as number;
    console.log('Group ID:', groupId);

    // Get group and items
    const group = await c.env.DB.prepare(
      'SELECT * FROM FileGroups WHERE id = ?'
    ).bind(groupId).first<FileGroupRecord>();

    if (!group) {
      return c.json({ error: `文件组不存在（ID: ${groupId}）` }, 404);
    }
    console.log('Group found:', group.group_name);

    const items = await c.env.DB.prepare(
      'SELECT * FROM FileGroupItems WHERE group_id = ?'
    ).bind(groupId).all<FileGroupItemRecord>();

    console.log('Items count:', items.results?.length || 0);

    // Generate download URLs for each file
    const fileList = [];
    for (const item of items.results || []) {
      // Generate signed URL for each file
      const fileToken = await createJWT({
        r2Key: item.r2_key,
        fileName: item.file_name,
        type: 'file-download',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      }, c.env.JWT_SECRET);

      const { apiUrl } = getDomainConfig(c.env);
      fileList.push({
        fileName: item.file_name,
        fileSize: item.file_size,
        downloadUrl: `${apiUrl}/api/download/${fileToken}`,
      });
    }

    return c.json({
      success: true,
      groupName: group.group_name,
      totalSize: group.total_size,
      files: fileList,
    });
  } catch (error) {
    console.error('Download group error:', error);
    return c.json({ error: `下载失败: ${error instanceof Error ? error.message : '未知错误'}` }, 500);
  }
});

// DELETE /api/file-groups/:groupId - 删除文件组
app.delete('/api/file-groups/:groupId', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const groupId = parseInt(c.req.param('groupId'));

    // Verify ownership
    const group = await c.env.DB.prepare(
      'SELECT * FROM FileGroups WHERE id = ? AND user_id = ?'
    ).bind(groupId, user.userId).first<FileGroupRecord>();

    if (!group) {
      return c.json({ error: '文件组不存在' }, 404);
    }

    // Get all items
    const items = await c.env.DB.prepare(
      'SELECT r2_key FROM FileGroupItems WHERE group_id = ?'
    ).bind(groupId).all<{ r2_key: string }>();

    // Delete from R2
    for (const item of items.results || []) {
      await c.env.BUCKET.delete(item.r2_key);
    }

    // Delete items from D1
    await c.env.DB.prepare(
      'DELETE FROM FileGroupItems WHERE group_id = ?'
    ).bind(groupId).run();

    // Delete group from D1
    await c.env.DB.prepare(
      'DELETE FROM FileGroups WHERE id = ?'
    ).bind(groupId).run();

    return c.json({
      success: true,
      message: '文件组已删除',
    });
  } catch (error) {
    console.error('Delete file group error:', error);
    return c.json({ error: '删除文件组失败' }, 500);
  }
});

// POST /api/admin/cleanup - 清理过期文件（仅供定时任务调用）
app.post('/api/admin/cleanup', async (c) => {
  try {
    const now = new Date().toISOString();
    let deletedFilesCount = 0;
    let deletedGroupsCount = 0;

    // 1. 查找并删除过期的普通文件
    const expiredFiles = await c.env.DB.prepare(`
      SELECT id, r2_key FROM Files 
      WHERE expires_at IS NOT NULL AND expires_at < ?
    `).bind(now).all<{ id: number; r2_key: string }>();

    for (const file of expiredFiles.results || []) {
      // 从R2删除
      await c.env.BUCKET.delete(file.r2_key);
      // 从数据库删除
      await c.env.DB.prepare('DELETE FROM Files WHERE id = ?').bind(file.id).run();
      deletedFilesCount++;
    }

    // 2. 查找并删除过期的文件组
    const expiredGroups = await c.env.DB.prepare(`
      SELECT id FROM FileGroups 
      WHERE expires_at IS NOT NULL AND expires_at < ?
    `).bind(now).all<{ id: number }>();

    for (const group of expiredGroups.results || []) {
      // 获取组内所有文件
      const items = await c.env.DB.prepare(
        'SELECT r2_key FROM FileGroupItems WHERE group_id = ?'
      ).bind(group.id).all<{ r2_key: string }>();

      // 从R2删除所有子文件
      for (const item of items.results || []) {
        await c.env.BUCKET.delete(item.r2_key);
      }

      // 删除子文件记录
      await c.env.DB.prepare('DELETE FROM FileGroupItems WHERE group_id = ?').bind(group.id).run();
      // 删除文件组记录
      await c.env.DB.prepare('DELETE FROM FileGroups WHERE id = ?').bind(group.id).run();
      deletedGroupsCount++;
    }

    return c.json({
      success: true,
      message: '清理完成',
      deletedFiles: deletedFilesCount,
      deletedGroups: deletedGroupsCount,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return c.json({ error: '清理失败' }, 500);
  }
});

// GET /api/files/expired - 获取即将过期的文件列表
app.get('/api/files/expired', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as JWTPayload;
    const now = new Date().toISOString();

    // 获取已过期或7天内将过期的文件
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const files = await c.env.DB.prepare(`
      SELECT * FROM Files 
      WHERE user_id = ? AND expires_at IS NOT NULL AND expires_at <= ?
      ORDER BY expires_at ASC
    `).bind(user.userId, sevenDaysLater.toISOString()).all<FileRecord & { expires_at: string }>();

    return c.json({
      success: true,
      files: files.results || [],
    });
  } catch (error) {
    console.error('Get expired files error:', error);
    return c.json({ error: '获取过期文件失败' }, 500);
  }
});

// Export the app with scheduled handler
export default {
  fetch: app.fetch,
  
  // Cron job handler - runs daily at midnight UTC
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('Running scheduled cleanup at', new Date().toISOString());
    
    const now = new Date().toISOString();
    let deletedCount = 0;

    try {
      // Clean up expired files
      const expiredFiles = await env.DB.prepare(`
        SELECT id, r2_key FROM Files 
        WHERE expires_at IS NOT NULL AND expires_at < ?
      `).bind(now).all<{ id: number; r2_key: string }>();

      for (const file of expiredFiles.results || []) {
        await env.BUCKET.delete(file.r2_key);
        await env.DB.prepare('DELETE FROM Files WHERE id = ?').bind(file.id).run();
        deletedCount++;
      }

      // Clean up expired file groups
      const expiredGroups = await env.DB.prepare(`
        SELECT id FROM FileGroups 
        WHERE expires_at IS NOT NULL AND expires_at < ?
      `).bind(now).all<{ id: number }>();

      for (const group of expiredGroups.results || []) {
        const items = await env.DB.prepare(
          'SELECT r2_key FROM FileGroupItems WHERE group_id = ?'
        ).bind(group.id).all<{ r2_key: string }>();

        for (const item of items.results || []) {
          await env.BUCKET.delete(item.r2_key);
        }

        await env.DB.prepare('DELETE FROM FileGroupItems WHERE group_id = ?').bind(group.id).run();
        await env.DB.prepare('DELETE FROM FileGroups WHERE id = ?').bind(group.id).run();
        deletedCount++;
      }

      console.log(`Cleanup completed. Deleted ${deletedCount} items.`);
    } catch (error) {
      console.error('Scheduled cleanup error:', error);
    }
  },
};
