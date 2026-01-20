/**
 * API 客户端模块 - 支持域名自动故障转移
 * 
 * 当主域名不可用时，自动切换到备用域名
 * 用户需要在环境变量中配置自己的域名
 */

// 从环境变量获取配置的域名
function getConfiguredDomains() {
  // 生产环境：从环境变量读取
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (apiUrl) {
    return [{ api: apiUrl, site: process.env.NEXT_PUBLIC_SITE_URL || '' }];
  }
  
  // 如果没有配置环境变量，使用默认的workers.dev域名（用户部署后自动生成）
  return [
    { api: '', site: '' }, // 用户需要配置自己的域名
  ];
}

// 开发模式域名
const DEV_DOMAIN = { api: 'http://localhost:8787', site: 'http://localhost:3000' };

// localStorage 键名
const STORAGE_KEY = 'currentApiDomainIndex';
const LAST_CHECK_KEY = 'lastPrimaryDomainCheck';

// 主域名恢复检查间隔（毫秒）
const PRIMARY_CHECK_INTERVAL = 5 * 60 * 1000; // 5分钟

// 请求超时时间（毫秒）
const REQUEST_TIMEOUT = 10000; // 10秒

/**
 * 判断是否为开发模式
 */
function isDevelopment(): boolean {
  return typeof window !== 'undefined' && window.location.hostname === 'localhost';
}

/**
 * 获取域名配置
 */
function getDomainConfig() {
  return getConfiguredDomains();
}

/**
 * 获取当前保存的域名索引
 */
function getSavedDomainIndex(): number {
  if (typeof window === 'undefined') return 0;
  const saved = localStorage.getItem(STORAGE_KEY);
  const index = saved ? parseInt(saved, 10) : 0;
  const domains = getDomainConfig();
  return index >= 0 && index < domains.length ? index : 0;
}

/**
 * 保存当前可用的域名索引
 */
function saveDomainIndex(index: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, index.toString());
  const domains = getDomainConfig();
  console.log(`[API Client] 切换到域名: ${domains[index].api}`);
}

/**
 * 检查是否应该尝试恢复主域名
 */
function shouldCheckPrimaryDomain(): boolean {
  if (typeof window === 'undefined') return false;
  const currentIndex = getSavedDomainIndex();
  if (currentIndex === 0) return false; // 已经在使用主域名
  
  const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
  const now = Date.now();
  
  if (!lastCheck || now - parseInt(lastCheck, 10) > PRIMARY_CHECK_INTERVAL) {
    localStorage.setItem(LAST_CHECK_KEY, now.toString());
    return true;
  }
  return false;
}

/**
 * 带超时的 fetch 请求
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 测试域名是否可用
 */
async function testDomain(apiUrl: string): Promise<boolean> {
  try {
    // 尝试访问一个轻量级端点来测试连通性
    const response = await fetchWithTimeout(`${apiUrl}/api/health`, {}, 5000);
    return response.ok || response.status === 404; // 404 也表示服务器响应了
  } catch {
    return false;
  }
}

/**
 * 获取当前的 API URL
 */
export function getApiUrl(): string {
  if (isDevelopment()) {
    return DEV_DOMAIN.api;
  }
  const domains = getDomainConfig();
  const index = getSavedDomainIndex();
  return domains[index]?.api || '';
}

/**
 * 获取当前的站点 URL
 */
export function getSiteUrl(): string {
  if (isDevelopment()) {
    return DEV_DOMAIN.site;
  }
  const domains = getDomainConfig();
  const index = getSavedDomainIndex();
  return domains[index]?.site || '';
}

/**
 * 获取所有配置的域名列表
 */
export function getAllDomains() {
  return getDomainConfig();
}

/**
 * 核心 API 请求函数 - 带自动故障转移
 * 
 * @param path - API 路径（如 '/api/files'）
 * @param options - fetch 选项
 * @returns Promise<Response>
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  // 开发模式直接使用本地地址
  if (isDevelopment()) {
    return fetchWithTimeout(`${DEV_DOMAIN.api}${path}`, options);
  }
  
  const DOMAIN_CONFIG = getDomainConfig();
  
  // 如果当前不是使用主域名，定期检查主域名是否恢复
  if (shouldCheckPrimaryDomain() && DOMAIN_CONFIG[0]?.api) {
    console.log('[API Client] 尝试检查主域名是否恢复...');
    const primaryAvailable = await testDomain(DOMAIN_CONFIG[0].api);
    if (primaryAvailable) {
      console.log('[API Client] 主域名已恢复，切换回主域名');
      saveDomainIndex(0);
    }
  }
  
  // 从当前保存的域名开始尝试
  let startIndex = getSavedDomainIndex();
  let lastError: Error | null = null;
  
  // 尝试所有域名
  for (let attempt = 0; attempt < DOMAIN_CONFIG.length; attempt++) {
    const domainIndex = (startIndex + attempt) % DOMAIN_CONFIG.length;
    const domain = DOMAIN_CONFIG[domainIndex];
    
    if (!domain?.api) continue;
    
    const url = `${domain.api}${path}`;
    
    try {
      console.log(`[API Client] 请求: ${url}`);
      const response = await fetchWithTimeout(url, options);
      
      // 请求成功，如果切换了域名则保存
      if (domainIndex !== startIndex) {
        saveDomainIndex(domainIndex);
      }
      
      return response;
    } catch (err) {
      console.warn(`[API Client] 域名 ${domain.api} 请求失败:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
      
      // 如果是第一个域名失败，继续尝试下一个
      if (attempt < DOMAIN_CONFIG.length - 1) {
        const nextDomain = DOMAIN_CONFIG[(domainIndex + 1) % DOMAIN_CONFIG.length];
        if (nextDomain?.api) {
          console.log(`[API Client] 尝试备用域名 ${nextDomain.api}...`);
        }
      }
    }
  }
  
  // 所有域名都失败
  throw new Error(`所有 API 服务器均不可用: ${lastError?.message || '未知错误'}`);
}

/**
 * 带 JSON 响应解析的 API 请求
 */
export async function apiFetchJson<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, options);
  return response.json();
}

/**
 * 重置到主域名（用于调试）
 */
export function resetToPrimaryDomain(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LAST_CHECK_KEY);
  console.log('[API Client] 已重置到主域名');
}

/**
 * 获取当前域名状态信息（用于调试）
 */
export function getDomainStatus() {
  const domains = getDomainConfig();
  if (typeof window === 'undefined') {
    return { current: domains[0], index: 0, all: domains };
  }
  const index = getSavedDomainIndex();
  return {
    current: domains[index],
    index,
    all: domains,
    isDev: isDevelopment(),
  };
}
