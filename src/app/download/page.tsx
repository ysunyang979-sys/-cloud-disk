'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import JSZip from 'jszip';
import { apiFetch } from '@/lib/apiClient';
import { 
  FolderOpenIcon, 
  ArrowDownTrayIcon,
  DocumentIcon,
  ExclamationCircleIcon,
  CloudIcon,
} from '@heroicons/react/24/outline';

interface FileItem {
  fileName: string;
  fileSize: number;
  downloadUrl: string;
}

interface GroupData {
  success: boolean;
  groupName: string;
  totalSize: number;
  files: FileItem[];
  error?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function GroupDownloadContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) {
      fetchGroupData();
    } else {
      setError('缺少下载令牌');
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchGroupData = async () => {
    try {
      console.log('Fetching group data with token:', token);
      
      const response = await apiFetch(`/api/file-groups/download/${token}`);
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Data:', data);
      
      if (data.success) {
        setGroupData(data);
      } else {
        setError(data.error || '获取文件信息失败');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(`网络错误: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!groupData || !groupData.files.length) return;

    setDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus('准备下载...');

    try {
      const zip = new JSZip();
      const files = groupData.files;
      const CONCURRENT_DOWNLOADS = 50; // 并发下载数量（最高性能）
      
      let completedCount = 0;
      let failedCount = 0;

      // 下载单个文件的函数
      const downloadSingleFile = async (file: FileItem): Promise<{ name: string; blob: Blob | null }> => {
        try {
          const response = await fetch(file.downloadUrl);
          if (response.ok) {
            const blob = await response.blob();
            return { name: file.fileName, blob };
          }
        } catch (err) {
          console.error(`Error downloading ${file.fileName}:`, err);
        }
        return { name: file.fileName, blob: null };
      };

      // 分批并发下载
      for (let i = 0; i < files.length; i += CONCURRENT_DOWNLOADS) {
        const batch = files.slice(i, i + CONCURRENT_DOWNLOADS);
        const batchPromises = batch.map(file => downloadSingleFile(file));

        // 等待当前批次完成
        const results = await Promise.all(batchPromises);

        // 添加到ZIP并统计
        for (const result of results) {
          if (result.blob) {
            zip.file(result.name, result.blob);
            completedCount++;
          } else {
            failedCount++;
            completedCount++;
          }
        }

        // 批次完成后更新状态
        setDownloadStatus(`正在高速下载... (${completedCount}/${files.length})`);
        setDownloadProgress(Math.round((completedCount / files.length) * 80));
      }

      setDownloadStatus('正在打包ZIP文件...');
      setDownloadProgress(85);

      // 使用更快的压缩级别 (1-9, 1最快9最小)
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 3 } // 降低压缩级别以加快打包速度
      }, (metadata) => {
        // 更新打包进度
        setDownloadProgress(85 + Math.round(metadata.percent * 0.15));
      });

      setDownloadProgress(100);
      if (failedCount > 0) {
        setDownloadStatus(`下载完成！${failedCount} 个文件失败`);
      } else {
        setDownloadStatus('下载完成！');
      }

      // Trigger download
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = groupData.groupName || 'download.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('打包下载失败');
    } finally {
      setTimeout(() => {
        setDownloading(false);
        setDownloadProgress(0);
        setDownloadStatus('');
      }, 2000);
    }
  };

  const handleDownloadSingle = async (file: FileItem) => {
    window.open(file.downloadUrl, '_blank');
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 text-center">
          <ExclamationCircleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">加载失败</h1>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Animated background */}
      <div className="animated-bg" />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center shadow-lg">
              <FolderOpenIcon className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gradient">{groupData?.groupName}</h1>
              <p className="text-white/50">{groupData?.files.length} 个文件 · {formatFileSize(groupData?.totalSize || 0)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <CloudIcon className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-white/60">伊苏存储 · 永久分享链接</span>
          </div>

          {downloading ? (
            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
                  <ArrowDownTrayIcon className="w-5 h-5 text-white animate-bounce" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{downloadStatus}</p>
                  <p className="text-xs text-white/50">{downloadProgress}%</p>
                </div>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${downloadProgress}%` }} />
              </div>
            </div>
          ) : (
            <button
              onClick={handleDownloadAll}
              className="btn-primary w-full justify-center flex items-center gap-2 bg-gradient-to-r from-orange-500 to-yellow-500"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              打包下载全部 ({formatFileSize(groupData?.totalSize || 0)})
            </button>
          )}
        </div>

        {/* File list */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DocumentIcon className="w-5 h-5 text-white/60" />
            文件列表
          </h2>

          <div className="space-y-2">
            {groupData?.files.map((file, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <DocumentIcon className="w-5 h-5 text-white/40 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{file.fileName}</p>
                  <p className="text-xs text-white/40">{formatFileSize(file.fileSize)}</p>
                </div>
                <button
                  onClick={() => handleDownloadSingle(file)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="单独下载"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 text-white/60" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-white/30">
            由伊苏存储提供技术支持 · 永久有效
          </p>
        </div>
      </div>
    </div>
  );
}

export default function GroupDownloadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-white/60">加载中...</p>
        </div>
      </div>
    }>
      <GroupDownloadContent />
    </Suspense>
  );
}
