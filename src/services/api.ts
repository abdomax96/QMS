/**
 * API Service for handling HTTP requests
 * This is a mock implementation that can be replaced with actual API calls
 */

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', headers = {}, body } = options;

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: { ...this.defaultHeaders, ...headers },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null as T,
          success: false,
          error: data.message || 'حدث خطأ في الطلب',
        };
      }

      return {
        data,
        success: true,
      };
    } catch (error) {
      console.error('API Error:', error);
      return {
        data: null as T,
        success: false,
        error: 'فشل الاتصال بالخادم',
      };
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Folders endpoints
  async getFolders() {
    return this.request('/folders');
  }

  async getFolder(id: string) {
    return this.request(`/folders/${id}`);
  }

  async createFolder(data: any) {
    return this.request('/folders', {
      method: 'POST',
      body: data,
    });
  }

  async updateFolder(id: string, data: any) {
    return this.request(`/folders/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteFolder(id: string) {
    return this.request(`/folders/${id}`, { method: 'DELETE' });
  }

  // Form Templates endpoints
  async getTemplates(folderId?: string) {
    const query = folderId ? `?folder_id=${folderId}` : '';
    return this.request(`/templates${query}`);
  }

  async getTemplate(id: string) {
    return this.request(`/templates/${id}`);
  }

  async createTemplate(data: any) {
    return this.request('/templates', {
      method: 'POST',
      body: data,
    });
  }

  async updateTemplate(id: string, data: any) {
    return this.request(`/templates/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteTemplate(id: string) {
    return this.request(`/templates/${id}`, { method: 'DELETE' });
  }

  // Form Instances (Reports) endpoints
  async getReports(filters?: { templateId?: string; folderId?: string; status?: string }) {
    const params = new URLSearchParams();
    if (filters?.templateId) params.append('template_id', filters.templateId);
    if (filters?.folderId) params.append('folder_id', filters.folderId);
    if (filters?.status) params.append('status', filters.status);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/reports${query}`);
  }

  async getReport(id: string) {
    return this.request(`/reports/${id}`);
  }

  async createReport(data: any) {
    return this.request('/reports', {
      method: 'POST',
      body: data,
    });
  }

  async updateReport(id: string, data: any) {
    return this.request(`/reports/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async submitReport(id: string) {
    return this.request(`/reports/${id}/submit`, { method: 'POST' });
  }

  async deleteReport(id: string) {
    return this.request(`/reports/${id}`, { method: 'DELETE' });
  }

  // File upload
  async uploadFile(file: File, folder?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);

    try {
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      return {
        data,
        success: response.ok,
        error: response.ok ? undefined : data.message,
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        error: 'فشل رفع الملف',
      };
    }
  }

  // Export endpoints
  async exportToPdf(reportId: string) {
    return this.request(`/reports/${reportId}/export/pdf`);
  }

  async exportToExcel(reportId: string) {
    return this.request(`/reports/${reportId}/export/excel`);
  }

  // Set auth token
  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken() {
    delete this.defaultHeaders['Authorization'];
  }
}

export const api = new ApiService();
export default ApiService;
