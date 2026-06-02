import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const BASE_URL = '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle 401, refresh token
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const res = await api.post('/auth/refresh');
        const { accessToken } = res.data.data || res.data;
        useAuthStore.getState().setToken(accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ── API modules ───────────────────────────────────────────────────
export const authApi = {
  login: (data: { loginId: string; password: string }) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data: any) => api.post('/auth/change-password', data),
};

export const usersApi = {
  getAll: (params?: any) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  updateStatus: (id: string, status: string, roleId?: string, permissions?: string[]) => api.patch(`/users/${id}/status`, { status, roleId, permissions }),
  resetPassword: (id: string, data: any) => api.patch(`/users/${id}/reset-password`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const rolesApi = {
  getAll: () => api.get('/roles'),
  getById: (id: string) => api.get(`/roles/${id}`),
  create: (data: any) => api.post('/roles', data),
  update: (id: string, data: any) => api.put(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
  getPermissions: (id: string) => api.get(`/roles/${id}/permissions`),
  assignPermissions: (id: string, permissionIds: string[]) => api.post(`/roles/${id}/permissions`, { permissionIds }),
};

export const permissionsApi = {
  getAll: () => api.get('/permissions'),
  getGrouped: () => api.get('/permissions/grouped'),
  create: (data: any) => api.post('/permissions', data),
  getUserPermissions: (userId: string) => api.get(`/permissions/users/${userId}`),
  setUserPermission: (userId: string, data: any) => api.post(`/permissions/users/${userId}`, data),
};

export const departmentsApi = {
  getAll: () => api.get('/departments/public'),
  create: (data: any) => api.post('/departments', data),
  update: (id: string, data: any) => api.put(`/departments/${id}`, data),
  delete: (id: string) => api.delete(`/departments/${id}`),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getActivity: () => api.get('/dashboard/activity'),
  getRevenue: () => api.get('/dashboard/revenue'),
  getTicketTrends: () => api.get('/dashboard/ticket-trends'),
};

export const chatApi = {
  getConversations: (params?: any) => api.get('/chat/conversations', { params }),
  getMessages: (id: string, params?: any) => api.get(`/chat/conversations/${id}/messages`, { params }),
  createConversation: (data: any) => api.post('/chat/conversations', data),
  sendMessage: (id: string, data: any) => api.post(`/chat/conversations/${id}/messages`, data),
  markRead: (id: string) => api.post(`/chat/conversations/${id}/read`),
};

export const filesApi = {
  getFolders: (params?: any) => api.get('/files/folders', { params }),
  getFiles: (params?: any) => api.get('/files', { params }),
  getShared: () => api.get('/files/shared'),
  createFolder: (data: any) => api.post('/files/folders', data),
  upload: (formData: FormData) => api.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => api.delete(`/files/${id}`),
  getAccessRequests: () => api.get('/files/access-requests'),
  requestAccess: (data: any) => api.post('/files/access-requests', data),
  reviewAccessRequest: (data: any) => api.post('/files/access-requests/review', data),
  saveToCloud: (id: string) => api.post(`/files/${id}/save-to-cloud`),
};

export const ticketsApi = {
  getAll: (params?: any) => api.get('/tickets', { params }),
  getCategories: () => api.get('/tickets/categories'),
  create: (data: any) => api.post('/tickets', data),
  update: (id: string, data: any) => api.put(`/tickets/${id}`, data),
  addComment: (id: string, data: any) => api.post(`/tickets/${id}/comments`, data),
};

export const billingApi = {
  getInvoices: (params?: any) => api.get('/billing/invoices', { params }),
  getInvoice: (id: string) => api.get(`/billing/invoices/${id}`),
  createInvoice: (data: any) => api.post('/billing/invoices', data),
  getCustomers: () => api.get('/billing/customers'),
  createCustomer: (data: any) => api.post('/billing/customers', data),
  recordPayment: (id: string, data: any) => api.post(`/billing/invoices/${id}/payments`, data),
};

export const inventoryApi = {
  getProducts: (params?: any) => api.get('/inventory/products', { params }),
  getCategories: () => api.get('/inventory/categories'),
  createProduct: (data: any) => api.post('/inventory/products', data),
  updateProduct: (id: string, data: any) => api.put(`/inventory/products/${id}`, data),
  adjustStock: (id: string, data: any) => api.patch(`/inventory/products/${id}/stock`, data),
};

export const purchaseApi = {
  getOrders: (params?: any) => api.get('/purchase/orders', { params }),
  createOrder: (data: any) => api.post('/purchase/orders', data),
  getSuppliers: () => api.get('/purchase/suppliers'),
  createSupplier: (data: any) => api.post('/purchase/suppliers', data),
};

export const emailApi = {
  getEmails: (folder?: string) => api.get('/email', { params: { folder } }),
  sendEmail: (data: any) => api.post('/email/send', data),
  deleteEmail: (id: string) => api.delete(`/email/${id}`),
};

export const notificationsApi = {
  get: (params?: any) => api.get('/notifications', { params }),
  getCount: () => api.get('/notifications/count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const serverApi = {
  getInfo: () => api.get('/server/info'),
  getSettings: () => api.get('/server/settings'),
  updateSetting: (key: string, value: string) => api.put(`/server/settings/${key}`, { value }),
  getPublicSettings: () => api.get('/public/settings'),
  getDatabaseStatus: () => api.get('/server/db-status'),
};

export const storageApi = {
  getMetrics: () => api.get('/storage/metrics'),
  updateQuota: (data: any) => api.post('/storage/users/quota', data),
};

export const securityApi = {
  getLogs: () => api.get('/server/security-logs'),
};
