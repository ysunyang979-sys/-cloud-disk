'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import JSZip from 'jszip';
import { 
  CloudArrowUpIcon, 
  FolderIcon, 
  TrashIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  ArchiveBoxIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  LinkIcon,
  CloudIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  FolderOpenIcon,
  ChevronRightIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

// Types
interface FileRecord {
  id: number;
  file_name: string;
  file_size: number;
  file_type: string;
  r2_key: string;
  upload_time: string;
}

interface FileGroup {
  id: number;
  group_name: string;
  total_size: number;
  file_count: number;
  group_type: string;
  created_at: string;
}

interface User {
  id: number;
  email: string;
}

interface Stats {
  totalFiles: number;
  totalSize: number;
  storageLimit: number;
}

interface ZipFileEntry {
  name: string;
  size: number;
  file: File;
}

// Utility functions
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return PhotoIcon;
  if (mimeType.startsWith('video/')) return FilmIcon;
  if (mimeType.startsWith('audio/')) return MusicalNoteIcon;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return ArchiveBoxIcon;
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return DocumentTextIcon;
  return DocumentIcon;
}

function getFileIconColor(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'from-pink-500 to-rose-500';
  if (mimeType.startsWith('video/')) return 'from-purple-500 to-violet-500';
  if (mimeType.startsWith('audio/')) return 'from-green-500 to-emerald-500';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'from-yellow-500 to-orange-500';
  if (mimeType.includes('pdf')) return 'from-red-500 to-rose-500';
  return 'from-blue-500 to-cyan-500';
}

// Toast component
function Toast({ message, type, onClose }: { 
  message: string; 
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'border-green-500/50 bg-green-500/10',
    error: 'border-red-500/50 bg-red-500/10',
    info: 'border-blue-500/50 bg-blue-500/10',
  };

  const icons = {
    success: <CheckCircleIcon className="w-5 h-5 text-green-400" />,
    error: <ExclamationCircleIcon className="w-5 h-5 text-red-400" />,
    info: <CloudIcon className="w-5 h-5 text-blue-400" />,
  };

  return (
    <div className={`toast ${colors[type]} border`}>
      <div className="flex items-center gap-3">
        {icons[type]}
        <span>{message}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [shareModal, setShareModal] = useState<{ url: string; fileName: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<FileRecord | null>(null);
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<FileGroup | null>(null);
  const [activeTab, setActiveTab] = useState<'small' | 'large'>('small');
  const [groupDetailModal, setGroupDetailModal] = useState<FileGroup | null>(null);
  const [groupItems, setGroupItems] = useState<Array<{ file_name: string; file_size: number }>>([]);
  const [expirationModal, setExpirationModal] = useState<FileRecord | null>(null);
  const [selectedExpiration, setSelectedExpiration] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const largeFileInputRef = useRef<HTMLInputElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const getToken = useCallback(() => {
    return localStorage.getItem('token');
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  }, []);

  // Fetch files
  const fetchFiles = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/api/files`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setFiles(data.files);
      }
    } catch (err) {
      console.error('Fetch files error:', err);
    }
  }, [apiUrl, getToken, router]);

  // Fetch file groups
  const fetchFileGroups = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/api/file-groups`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setFileGroups(data.groups);
      }
    } catch (err) {
      console.error('Fetch file groups error:', err);
    }
  }, [apiUrl, getToken]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/api/user/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setUser(data.user);
      }
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  }, [apiUrl, getToken]);

  // Initial load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    Promise.all([fetchFiles(), fetchFileGroups(), fetchStats()]).finally(() => {
      setLoading(false);
    });
  }, [router, fetchFiles, fetchFileGroups, fetchStats]);

  // Handle small file upload (< 100MB)
  const handleFileUpload = async (fileList: FileList) => {
    const token = getToken();
    if (!token || fileList.length === 0) return;

    const file = fileList[0];
    
    if (file.size > 100 * 1024 * 1024) {
      showToast('文件超过100MB，请使用大文件上传功能', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          showToast('文件上传成功', 'success');
          fetchFiles();
          fetchStats();
        } else {
          const data = JSON.parse(xhr.responseText);
          showToast(data.error || '上传失败', 'error');
        }
        setUploading(false);
        setUploadProgress(0);
      });

      xhr.addEventListener('error', () => {
        showToast('网络错误，上传失败', 'error');
        setUploading(false);
        setUploadProgress(0);
      });

      xhr.open('POST', `${apiUrl}/api/files/upload-direct`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    } catch (err) {
      showToast('上传失败', 'error');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle large file (ZIP) upload
  const handleLargeFileUpload = async (fileList: FileList) => {
    const token = getToken();
    if (!token || fileList.length === 0) return;

    const file = fileList[0];
    
    if (!file.name.endsWith('.zip')) {
      showToast('大文件上传仅支持ZIP格式', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('正在解析ZIP文件...');

    try {
      // Parse ZIP file
      const zip = await JSZip.loadAsync(file);
      const entries: ZipFileEntry[] = [];
      
      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir) {
          const blob = await zipEntry.async('blob');
          const entryFile = new File([blob], path, { type: 'application/octet-stream' });
          
          // Check if any single file exceeds 100MB
          if (entryFile.size > 100 * 1024 * 1024) {
            showToast(`文件 ${path} 超过100MB，无法上传`, 'error');
            setUploading(false);
            return;
          }
          
          entries.push({ name: path, size: entryFile.size, file: entryFile });
        }
      }

      if (entries.length === 0) {
        showToast('ZIP文件为空', 'error');
        setUploading(false);
        return;
      }

      setUploadStatus(`发现 ${entries.length} 个文件，正在创建文件组...`);

      // Create file group
      const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
      const createResponse = await fetch(`${apiUrl}/api/file-groups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupName: file.name,
          totalSize,
          fileCount: entries.length,
          groupType: 'zip',
        }),
      });

      const createData = await createResponse.json();
      if (!createData.success) {
        showToast(createData.error || '创建文件组失败', 'error');
        setUploading(false);
        return;
      }

      const groupId = createData.groupId;

      // Upload each file
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        setUploadStatus(`正在上传 (${i + 1}/${entries.length}): ${entry.name}`);
        setUploadProgress(Math.round(((i) / entries.length) * 100));

        const formData = new FormData();
        formData.append('file', entry.file);
        formData.append('fileName', entry.name);

        const uploadResponse = await fetch(`${apiUrl}/api/file-groups/${groupId}/items`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          showToast(errorData.error || `上传 ${entry.name} 失败`, 'error');
        }
      }

      setUploadProgress(100);
      setUploadStatus('上传完成！');
      showToast('大文件上传成功', 'success');
      fetchFileGroups();
      fetchStats();
    } catch (err) {
      console.error('Large file upload error:', err);
      showToast('解析或上传失败', 'error');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setUploadStatus('');
      }, 1000);
    }
  };

  // Generate share link
  const handleShare = async (file: FileRecord) => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/api/files/${file.id}/generate-download-url`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setShareModal({ url: data.downloadUrl, fileName: file.file_name });
      } else {
        showToast(data.error || '生成分享链接失败', 'error');
      }
    } catch (err) {
      showToast('生成分享链接失败', 'error');
    }
  };

  // Generate group share link
  const handleShareGroup = async (group: FileGroup) => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/api/file-groups/${group.id}/generate-download-url`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setShareModal({ url: data.downloadUrl, fileName: group.group_name });
      } else {
        showToast(data.error || '生成分享链接失败', 'error');
      }
    } catch (err) {
      showToast('生成分享链接失败', 'error');
    }
  };

  // View group details
  const handleViewGroup = async (group: FileGroup) => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/api/file-groups/${group.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setGroupItems(data.items);
        setGroupDetailModal(group);
      }
    } catch (err) {
      showToast('获取文件组详情失败', 'error');
    }
  };

  // Set file expiration
  const handleSetExpiration = async () => {
    if (!expirationModal) return;
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/api/files/${expirationModal.id}/expiration`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresInDays: selectedExpiration }),
      });

      const data = await response.json();
      if (data.success) {
        showToast(selectedExpiration > 0 ? `文件将在 ${selectedExpiration} 天后过期` : '已设为永久保存', 'success');
        setExpirationModal(null);
        fetchFiles();
      } else {
        showToast(data.error || '设置失败', 'error');
      }
    } catch (err) {
      showToast('设置过期时间失败', 'error');
    }
  };

  // Delete file
  const handleDelete = async (file: FileRecord) => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/api/files/${file.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        showToast('文件已删除', 'success');
        fetchFiles();
        fetchStats();
      } else {
        showToast(data.error || '删除失败', 'error');
      }
    } catch (err) {
      showToast('删除失败', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Delete file group
  const handleDeleteGroup = async (group: FileGroup) => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/api/file-groups/${group.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        showToast('文件组已删除', 'success');
        fetchFileGroups();
        fetchStats();
      } else {
        showToast(data.error || '删除失败', 'error');
      }
    } catch (err) {
      showToast('删除失败', 'error');
    } finally {
      setDeleteGroupConfirm(null);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('链接已复制到剪贴板', 'success');
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-white/60">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Animated background */}
      <div className="animated-bg" />

      {/* Header */}
      <header className="glass-card p-4 md:p-6 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
            <CloudIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gradient">伊苏存储</h1>
            <p className="text-sm text-white/50">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {stats && (
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{stats.totalFiles}</p>
              <p className="text-xs text-white/50">文件</p>
            </div>
          )}
          {stats && (
            <div className="text-center">
              <p className="text-2xl font-bold text-gradient">{formatFileSize(stats.totalSize)}</p>
              <p className="text-xs text-white/50">已使用 / {formatFileSize(stats.storageLimit)}</p>
            </div>
          )}
          <button onClick={handleLogout} className="btn-secondary flex items-center gap-2 text-sm">
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            退出
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('small')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'small'
              ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          <DocumentIcon className="w-5 h-5 inline mr-2" />
          小文件 (&lt;100MB)
        </button>
        <button
          onClick={() => setActiveTab('large')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'large'
              ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          <ArchiveBoxIcon className="w-5 h-5 inline mr-2" />
          大文件 (ZIP分片)
        </button>
      </div>

      {/* Small Files Section */}
      {activeTab === 'small' && (
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DocumentIcon className="w-5 h-5 text-purple-400" />
            小文件上传 (单文件 ≤ 100MB)
          </h2>
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          />

          {uploading && activeTab === 'small' ? (
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <CloudArrowUpIcon className="w-6 h-6 text-white animate-bounce" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">正在上传...</p>
                  <p className="text-sm text-white/50">{uploadProgress}%</p>
                </div>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : (
            <div
              className="upload-zone cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
              onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('drag-over');
                if (e.dataTransfer.files.length > 0) {
                  handleFileUpload(e.dataTransfer.files);
                }
              }}
            >
              <CloudArrowUpIcon className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <button className="btn-primary mb-2">选择文件</button>
              <p className="text-white/50 text-sm">或拖拽文件到此处</p>
              <p className="text-white/30 text-xs mt-2">单文件最大 100MB</p>
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-medium text-white/70 mb-3">我的文件 ({files.length})</h3>
              {files.map((file) => {
                const FileIcon = getFileIcon(file.file_type);
                const iconColor = getFileIconColor(file.file_type);
                return (
                  <div key={file.id} className="file-card flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${iconColor} flex items-center justify-center`}>
                      <FileIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.file_name}</p>
                      <p className="text-sm text-white/50">{formatFileSize(file.file_size)} · {formatDate(file.upload_time)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setExpirationModal(file); setSelectedExpiration(0); }} 
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors" 
                        title="设置过期时间"
                      >
                        <ClockIcon className="w-5 h-5 text-white/60" />
                      </button>
                      <button onClick={() => handleShare(file)} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="分享">
                        <LinkIcon className="w-5 h-5 text-white/60" />
                      </button>
                      <button onClick={() => setDeleteConfirm(file)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors" title="删除">
                        <TrashIcon className="w-5 h-5 text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Large Files Section */}
      {activeTab === 'large' && (
        <div className="glass-card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ArchiveBoxIcon className="w-5 h-5 text-orange-400" />
            大文件上传 (ZIP分片上传)
          </h2>
          <p className="text-sm text-white/50 mb-4">
            上传ZIP文件，系统会自动解析并分片上传。每个子文件不超过100MB即可。
          </p>
          
          <input
            type="file"
            ref={largeFileInputRef}
            className="hidden"
            accept=".zip"
            onChange={(e) => e.target.files && handleLargeFileUpload(e.target.files)}
          />

          {uploading && activeTab === 'large' ? (
            <div className="p-6 bg-orange-500/10 rounded-xl border border-orange-500/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
                  <ArchiveBoxIcon className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{uploadStatus}</p>
                  <p className="text-sm text-white/50">{uploadProgress}%</p>
                </div>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : (
            <div
              className="upload-zone cursor-pointer border-orange-500/30 bg-orange-500/5"
              onClick={() => largeFileInputRef.current?.click()}
            >
              <ArchiveBoxIcon className="w-12 h-12 text-orange-400 mx-auto mb-4" />
              <button className="btn-primary bg-gradient-to-r from-orange-500 to-yellow-500 mb-2">选择ZIP文件</button>
              <p className="text-white/50 text-sm">系统将自动解析并分片上传</p>
              <p className="text-white/30 text-xs mt-2">支持任意大小的ZIP文件（子文件需 ≤ 100MB）</p>
            </div>
          )}

          {/* File groups list */}
          {fileGroups.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-medium text-white/70 mb-3">大文件 ({fileGroups.length})</h3>
              {fileGroups.map((group) => (
                <div key={group.id} className="file-card flex items-center gap-4 border-orange-500/20">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
                    <FolderOpenIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{group.group_name}</p>
                    <p className="text-sm text-white/50">
                      {group.file_count} 个文件 · {formatFileSize(group.total_size)} · {formatDate(group.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleViewGroup(group)} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="查看详情">
                      <ChevronRightIcon className="w-5 h-5 text-white/60" />
                    </button>
                    <button onClick={() => handleShareGroup(group)} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="分享">
                      <LinkIcon className="w-5 h-5 text-white/60" />
                    </button>
                    <button onClick={() => setDeleteGroupConfirm(group)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors" title="删除">
                      <TrashIcon className="w-5 h-5 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Share Modal */}
      {shareModal && (
        <div className="modal-overlay" onClick={() => setShareModal(null)}>
          <div className="glass-card max-w-md w-full p-6 modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">分享文件</h3>
              <button onClick={() => setShareModal(null)} className="p-2 hover:bg-white/10 rounded-lg">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 rounded-xl bg-white/5 mb-4">
              <p className="text-sm text-white/50 mb-1">文件名</p>
              <p className="font-medium truncate">{shareModal.fileName}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-white/60 mb-2">分享链接（永久有效）</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareModal.url}
                  readOnly
                  className="input-glass flex-1 text-sm"
                />
                <button 
                  onClick={() => copyToClipboard(shareModal.url)}
                  className="btn-primary flex items-center gap-2"
                >
                  <ClipboardDocumentIcon className="w-5 h-5" />
                  复制
                </button>
              </div>
            </div>

            <p className="text-sm text-white/40 text-center">
              任何拥有此链接的人都可以下载文件，链接永久有效
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="glass-card max-w-sm w-full p-6 modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">确认删除</h3>
            <p className="text-white/70 mb-6">
              确定要删除文件 &ldquo;{deleteConfirm.file_name}&rdquo; 吗？此操作无法撤销。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">取消</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-primary flex-1 bg-gradient-to-r from-red-500 to-rose-600">删除</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirm Modal */}
      {deleteGroupConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteGroupConfirm(null)}>
          <div className="glass-card max-w-sm w-full p-6 modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">确认删除文件组</h3>
            <p className="text-white/70 mb-6">
              确定要删除 &ldquo;{deleteGroupConfirm.group_name}&rdquo; 及其所有子文件吗？此操作无法撤销。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteGroupConfirm(null)} className="btn-secondary flex-1">取消</button>
              <button onClick={() => handleDeleteGroup(deleteGroupConfirm)} className="btn-primary flex-1 bg-gradient-to-r from-red-500 to-rose-600">删除</button>
            </div>
          </div>
        </div>
      )}

      {/* Group Detail Modal */}
      {groupDetailModal && (
        <div className="modal-overlay" onClick={() => setGroupDetailModal(null)}>
          <div className="glass-card max-w-lg w-full p-6 modal-content max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FolderOpenIcon className="w-6 h-6 text-orange-400" />
                {groupDetailModal.group_name}
              </h3>
              <button onClick={() => setGroupDetailModal(null)} className="p-2 hover:bg-white/10 rounded-lg">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-2xl font-bold text-orange-400">{groupDetailModal.file_count}</p>
                <p className="text-sm text-white/50">文件数量</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5">
                <p className="text-2xl font-bold text-gradient">{formatFileSize(groupDetailModal.total_size)}</p>
                <p className="text-sm text-white/50">总大小</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white/70 mb-3">文件列表</h4>
              {groupItems.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <DocumentIcon className="w-5 h-5 text-white/40" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{item.file_name}</p>
                  </div>
                  <p className="text-sm text-white/50">{formatFileSize(item.file_size)}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleShareGroup(groupDetailModal)}
              className="btn-primary w-full mt-6 justify-center flex items-center gap-2"
            >
              <LinkIcon className="w-5 h-5" />
              生成分享链接
            </button>
          </div>
        </div>
      )}

      {/* Expiration Modal */}
      {expirationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <ClockIcon className="w-6 h-6 text-orange-400" />
                设置过期时间
              </h3>
              <button onClick={() => setExpirationModal(null)} className="p-2 hover:bg-white/10 rounded-lg">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-white/60 mb-4 truncate">文件: {expirationModal.file_name}</p>
            
            <select
              value={selectedExpiration}
              onChange={(e) => setSelectedExpiration(parseInt(e.target.value))}
              className="input-glass w-full px-4 py-3 rounded-xl mb-4"
            >
              <option value={0}>永久保存</option>
              <option value={1}>1 天后删除</option>
              <option value={7}>7 天后删除</option>
              <option value={30}>30 天后删除</option>
              <option value={90}>90 天后删除</option>
              <option value={365}>1 年后删除</option>
            </select>

            {selectedExpiration > 0 && (
              <p className="text-orange-400 text-sm mb-4">
                ⚠️ 文件将在 {selectedExpiration} 天后自动删除，此操作不可撤销！
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setExpirationModal(null)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSetExpiration}
                className="flex-1 btn-primary justify-center"
              >
                确认设置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
