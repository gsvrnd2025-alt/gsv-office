import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const BASE_URL = '/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// --- IN-MEMORY DATA STORAGE FOR OFFLINE DEMO MODE ---
const mockUsers: any[] = [
  { id: '20000000-0000-0000-0000-000000000001', employeeId: 'EMP-0001', loginId: 'admin', email: 'admin@gsv.local', fullName: 'System Administrator', firstName: 'System', lastName: 'Administrator', designation: 'System Admin', role: { id: '00000000-0000-0000-0000-000000000001', name: 'Super Admin', color: '#ef4444' }, department: { id: '10000000-0000-0000-0000-000000000001', name: 'Administration' }, status: 'active', isOnline: true },
  { id: '20000000-0000-0000-0000-000000000002', employeeId: 'EMP-0002', loginId: 'rahul', email: 'rahul@gsv.local', fullName: 'Rahul Sharma', firstName: 'Rahul', lastName: 'Sharma', designation: 'IT Support', role: { id: '00000000-0000-0000-0000-000000000002', name: 'Admin', color: '#f97316' }, department: { id: '10000000-0000-0000-0000-000000000002', name: 'IT' }, status: 'active', isOnline: true },
  { id: '20000000-0000-0000-0000-000000000003', employeeId: 'EMP-0003', loginId: 'priya', email: 'priya@gsv.local', fullName: 'Priya Patel', firstName: 'Priya', lastName: 'Patel', designation: 'Operations Manager', role: { id: '00000000-0000-0000-0000-000000000003', name: 'Manager', color: '#eab308' }, department: { id: '10000000-0000-0000-0000-000000000006', name: 'Operations' }, status: 'active', isOnline: false }
];

const mockChatRequests: any[] = [
  { id: 'cr-1', user: { fullName: 'Priya Patel', email: 'priya@gsv.local' }, channelName: '🔒 Finance Core', category: 'Chat Access', createdAt: new Date(Date.now() - 7200000).toISOString(), status: 'pending' },
  { id: 'cr-2', user: { fullName: 'Rahul Sharma', email: 'rahul@gsv.local' }, channelName: '🔒 Executive Chat', category: 'Chat Access', createdAt: new Date(Date.now() - 14400000).toISOString(), status: 'approved' },
];

const mockTeamRequests: any[] = [
  { id: 'tr-1', creator: { fullName: 'Rahul Sharma', email: 'rahul@gsv.local' }, teamName: 'Marketing Campaign 2026', departmentName: 'Marketing', description: 'Temporary workspace for Q3 campaign coordination.', createdAt: new Date(Date.now() - 86400000).toISOString(), status: 'pending' },
];

const mockFileRequests: any[] = [
  { id: 'fr-1', user: { fullName: 'Priya Patel', email: 'priya@gsv.local' }, fileName: 'System Logs (Directory)', path: '/System Logs', accessType: 'Read & Write', reason: 'Analyzing backend debug output for billing issues.', createdAt: new Date(Date.now() - 3600000).toISOString(), status: 'pending' }
];

const mockUserPermissions: Record<string, string[]> = {};

const mockTickets = [
  { id: '1', ticketId: 'TKT-00001', title: 'VPN connection failure', description: 'Unable to connect to the internal network from home.', status: 'open', priority: 'high', category: { name: 'Network Issue' }, assignedTo: { fullName: 'Rahul Sharma' }, creator: { fullName: 'Priya Patel' }, createdAt: new Date(Date.now() - 3600000).toISOString(), comments: [] as any[] },
  { id: '2', ticketId: 'TKT-00002', title: 'Keyboard replacement', description: 'Some keys are not functioning properly.', status: 'resolved', priority: 'low', category: { name: 'Hardware Issue' }, assignedTo: { fullName: 'Rahul Sharma' }, creator: { fullName: 'System Administrator' }, createdAt: new Date(Date.now() - 86400000).toISOString(), comments: [] as any[] }
];

const mockProducts = [
  { id: '1', sku: 'SKU-LAP-001', name: 'MacBook Pro 16"', category: { name: 'Electronics' }, price: 199999, stock: 15, lowStockAlert: 5, warehouse: { name: 'Main Warehouse' } },
  { id: '2', sku: 'SKU-MON-002', name: 'Dell UltraSharp 27"', category: { name: 'Electronics' }, price: 34999, stock: 2, lowStockAlert: 5, warehouse: { name: 'Main Warehouse' } }
];

const mockInvoices = [
  { id: '1', invoiceNumber: 'INV-2026-0001', customer: { name: 'Acme Corp' }, totalAmount: 45000, status: 'paid', invoiceDate: new Date().toISOString(), dueDate: new Date(Date.now() + 864000000).toISOString() },
  { id: '2', invoiceNumber: 'INV-2026-0002', customer: { name: 'Globex Inc' }, totalAmount: 18000, status: 'unpaid', invoiceDate: new Date(Date.now() - 86400000).toISOString(), dueDate: new Date(Date.now() + 777600000).toISOString() }
];

const mockCustomers = [
  { id: '1', name: 'Acme Corp', email: 'billing@acme.com', phone: '9876543210' },
  { id: '2', name: 'Globex Inc', email: 'billing@globex.com', phone: '8765432109' }
];

const mockConversations = [
  { id: 'conv-1', name: 'IT Support Channel', isGroup: true, lastMessage: { content: 'Please restart your PC.', createdAt: new Date().toISOString(), sender: { fullName: 'Rahul Sharma' } } },
  { id: 'conv-2', name: 'Priya Patel', isGroup: false, lastMessage: { content: 'Did you approve the invoice?', createdAt: new Date(Date.now() - 1800000).toISOString(), sender: { fullName: 'Priya Patel' } } }
];

const mockMessages: Record<string, any[]> = {
  'conv-1': [
    { id: 'msg-1', content: 'Hello team, how can I help you today?', sender: { id: '20000000-0000-0000-0000-000000000002', fullName: 'Rahul Sharma' }, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'msg-2', content: 'We are experiencing some network slowness.', sender: { id: '20000000-0000-0000-0000-000000000003', fullName: 'Priya Patel' }, createdAt: new Date(Date.now() - 1800000).toISOString() },
    { id: 'msg-3', content: 'I will look into the router logs.', sender: { id: '20000000-0000-0000-0000-000000000002', fullName: 'Rahul Sharma' }, createdAt: new Date(Date.now() - 900000).toISOString() }
  ],
  'conv-2': [
    { id: 'msg-4', content: 'Hi Admin, I have submitted the Acme invoice.', sender: { id: '20000000-0000-0000-0000-000000000003', fullName: 'Priya Patel' }, createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'msg-5', content: 'Did you approve the invoice?', sender: { id: '20000000-0000-0000-0000-000000000003', fullName: 'Priya Patel' }, createdAt: new Date(Date.now() - 1800000).toISOString() }
  ]
};

const mockDepartments = [
  { id: '10000000-0000-0000-0000-000000000001', name: 'Administration', description: 'Administrative Department', color: '#6366f1' },
  { id: '10000000-0000-0000-0000-000000000002', name: 'IT', description: 'Information Technology', color: '#0ea5e9' },
  { id: '10000000-0000-0000-0000-000000000003', name: 'HR', description: 'Human Resources', color: '#ec4899' },
  { id: '10000000-0000-0000-0000-000000000004', name: 'Sales', description: 'Sales Department', color: '#f97316' }
];

const mockRoles = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Super Admin', description: 'Full system access', color: '#ef4444', isSystem: true, level: 100 },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Admin', description: 'Administrative access', color: '#f97316', isSystem: true, level: 80 },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Manager', description: 'Department manager access', color: '#eab308', isSystem: true, level: 60 },
  { id: '00000000-0000-0000-0000-000000000004', name: 'Employee', description: 'Standard employee access', color: '#22c55e', isSystem: true, level: 40 }
];

const mockStorageQuotas: Record<string, { usedBytes: number; limitBytes: number }> = {
  'admin': { usedBytes: 42949672960, limitBytes: 107374182400 }, // 40GB / 100GB
  'rahul': { usedBytes: 1542000, limitBytes: 53687091200 },     // 1.5MB / 50GB
  'priya': { usedBytes: 12000, limitBytes: 53687091200 }        // 12KB / 50GB
};

const mockFolders = [
  { id: 'folder-1', name: 'Invoices', path: '/Invoices', parentId: null, ownerId: '20000000-0000-0000-0000-000000000001', createdAt: new Date().toISOString() },
  { id: 'folder-2', name: 'System Logs', path: '/System Logs', parentId: null, ownerId: '20000000-0000-0000-0000-000000000001', createdAt: new Date().toISOString() },
  // User Auto-Deploy Dedicated folders
  { id: 'folder-u1', name: 'admin-private', path: '/users/admin-private', parentId: null, ownerId: '20000000-0000-0000-0000-000000000001', createdAt: new Date().toISOString() },
  { id: 'folder-u2', name: 'rahul-private', path: '/users/rahul-private', parentId: null, ownerId: '20000000-0000-0000-0000-000000000002', createdAt: new Date().toISOString() },
  { id: 'folder-u3', name: 'priya-private', path: '/users/priya-private', parentId: null, ownerId: '20000000-0000-0000-0000-000000000003', createdAt: new Date().toISOString() },
  // Public workspaces
  { id: 'folder-pub-1', name: '🏢 Company General Public Folder', path: '/public/Company General', parentId: null, ownerId: 'system', createdAt: new Date().toISOString() },
  { id: 'folder-pub-2', name: '💾 SMB Department Room Folder', path: '/public/SMB Departments', parentId: null, ownerId: 'system', createdAt: new Date().toISOString() }
];

const mockFiles = [
  { id: 'file-1', name: 'Q1_Financial_Report.pdf', originalName: 'Q1_Financial_Report.pdf', sizeBytes: 1542000, mimeType: 'application/pdf', url: '#', storageUrl: '#', folderId: 'folder-1', createdAt: new Date().toISOString() },
  { id: 'file-2', name: 'avatar_default.png', originalName: 'avatar_default.png', sizeBytes: 12000, mimeType: 'image/png', url: '#', storageUrl: '#', folderId: 'folder-2', createdAt: new Date().toISOString() }
];

const mockFolderSharingRequests: any[] = [
  { id: 'req-share-1', folderId: 'folder-u2', folderName: 'rahul-private', requesterName: 'Priya Patel', requesterEmail: 'priya@gsv.local', requesterId: '20000000-0000-0000-0000-000000000003', ownerId: '20000000-0000-0000-0000-000000000002', status: 'pending', requestedAt: new Date().toISOString() }
];

const mockFolderPermissions: Record<string, Record<string, string>> = {
  // folderId -> { userId -> permissionLevel: 'read' | 'upload' | 'download' | 'full' }
  'folder-1': { '20000000-0000-0000-0000-000000000003': 'read' }
};

const mockSecurityLogs: any[] = [
  { id: 'sec-1', type: 'access', username: 'rahul', message: '📁 SMB Folder rahul-private initialized successfully', ipAddress: '192.168.1.101', createdAt: new Date(Date.now() - 4800000).toISOString() },
  { id: 'sec-2', type: 'quota', username: 'admin', message: '💾 Allocated 50GB storage limit to rahul', ipAddress: '127.0.0.1', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'sec-3', type: 'permission', username: 'admin', message: '🔒 Folder Invoices read permission granted to Priya Patel', ipAddress: '127.0.0.1', createdAt: new Date(Date.now() - 1200000).toISOString() }
];

const mockPurchaseOrders = [
  { id: '1', orderNumber: 'PO-2026-0001', supplier: { name: 'Super Tech Ltd' }, totalAmount: 150000, status: 'approved', orderDate: new Date().toISOString() }
];

const mockSuppliers = [
  { id: '1', name: 'Super Tech Ltd', contactPerson: 'John Doe', email: 'sales@supertech.com' }
];

const mockEmails = [
  { id: '1', subject: 'Welcome to GSV Office', from: 'admin@gsv.local', to: 'admin@gsv.local', content: 'This is a test email sent from the platform integration.', createdAt: new Date().toISOString() }
];

const mockNotifications = [
  { id: '1', title: 'New support ticket assigned', message: 'TKT-00001 has been assigned to you.', isRead: false, createdAt: new Date().toISOString() }
];

const mockPermissions: any[] = [
  { id: 'u-read', action: 'read', module: 'users', description: 'Read users' },
  { id: 'u-create', action: 'create', module: 'users', description: 'Create users' },
  { id: 'u-update', action: 'update', module: 'users', description: 'Update users' },
  { id: 'u-delete', action: 'delete', module: 'users', description: 'Delete users' },
  { id: 'r-read', action: 'read', module: 'roles', description: 'Read roles' },
  { id: 'r-create', action: 'create', module: 'roles', description: 'Create roles' },
  { id: 'r-update', action: 'update', module: 'roles', description: 'Update roles' },
  { id: 'r-delete', action: 'delete', module: 'roles', description: 'Delete roles' },
  { id: 'r-assign', action: 'assign_permissions', module: 'roles', description: 'Assign permissions' },
  { id: 't-read', action: 'read', module: 'tickets', description: 'Read tickets' },
  { id: 't-create', action: 'create', module: 'tickets', description: 'Create tickets' },
  { id: 't-update', action: 'update', module: 'tickets', description: 'Update tickets' }
];

const mockRolePermissions: Record<string, string[]> = {
  '00000000-0000-0000-0000-000000000001': ['u-read', 'u-create', 'u-update', 'u-delete', 'r-read', 'r-create', 'r-update', 'r-delete', 'r-assign', 't-read', 't-create', 't-update'],
  '00000000-0000-0000-0000-000000000002': ['u-read', 'u-create', 'u-update', 'r-read', 't-read', 't-create'],
};

const getMockResponse = (url: string, method: string, data: any) => {
  const cleanUrl = url.split('?')[0].replace(/^\/api/, '').replace(/\/$/, '');
  const methodUpper = method.toUpperCase();

  const userMatch = cleanUrl.match(/^\/users\/([^/]+)$/);
  const userStatusMatch = cleanUrl.match(/^\/users\/([^/]+)\/status$/);
  const userResetPwdMatch = cleanUrl.match(/^\/users\/([^/]+)\/reset-password$/);
  const ticketCommentsMatch = cleanUrl.match(/^\/tickets\/([^/]+)\/comments$/);
  const ticketIdMatch = cleanUrl.match(/^\/tickets\/([^/]+)$/);
  const conversationMessagesMatch = cleanUrl.match(/^\/chat\/conversations\/([^/]+)\/messages$/);
  const conversationReadMatch = cleanUrl.match(/^\/chat\/conversations\/([^/]+)\/read$/);
  const productStockMatch = cleanUrl.match(/^\/inventory\/products\/([^/]+)\/stock$/);
  const invoicePaymentMatch = cleanUrl.match(/^\/billing\/invoices\/([^/]+)\/payments$/);
  const invoiceDetailMatch = cleanUrl.match(/^\/billing\/invoices\/([^/]+)$/);
  const rolePermissionsMatch = cleanUrl.match(/^\/roles\/([^/]+)\/permissions$/);
  const userPermissionsMatch = cleanUrl.match(/^\/permissions\/users\/([^/]+)$/);

  if (cleanUrl === '/auth/logout') {
    return { success: true, message: 'Logged out successfully' };
  }

  if (cleanUrl === '/auth/login') {
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    const username = parsedData.loginId;
    
    // Find user by loginId or email
    const user = mockUsers.find(u => u.loginId === username || u.email === username);
    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }
    
    if (user.status === 'pending') {
      return { success: false, message: 'Account pending admin approval' };
    }
    
    if (user.status === 'blocked') {
      return { success: false, message: 'Account has been blocked' };
    }
    
    // Simulate successful login
    return {
      success: true,
      data: {
        accessToken: 'mock_jwt_access_token',
        user: {
          id: user.id,
          loginId: user.loginId,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl || '',
          role: user.role,
          department: user.department,
          status: user.status,
          theme: 'dark'
        }
      }
    };
  }

  if (cleanUrl === '/auth/me') {
    return {
      success: true,
      data: {
        id: '20000000-0000-0000-0000-000000000001',
        loginId: 'admin',
        email: 'admin@gsv.local',
        fullName: 'System Administrator',
        avatarUrl: '',
        role: { id: '00000000-0000-0000-0000-000000000001', name: 'Super Admin', color: '#ef4444' },
        department: { id: '10000000-0000-0000-0000-000000000001', name: 'Administration' },
        status: 'active',
        theme: 'dark',
      }
    };
  }

  if (cleanUrl === '/dashboard/stats') {
    return {
      success: true,
      data: {
        userStats: { total: mockUsers.length, online: mockUsers.filter(u => u.isOnline).length },
        chatStats: { private_chats: mockConversations.filter(c => !c.isGroup).length, groups: mockConversations.filter(c => c.isGroup).length },
        fileStats: { total_files: mockFiles.length, total_size_bytes: 42949672960 },
        ticketStats: {
          open: mockTickets.filter(t => t.status === 'open').length,
          in_progress: mockTickets.filter(t => t.status === 'in_progress').length,
          escalated: mockTickets.filter(t => t.status === 'escalated').length,
          resolved: mockTickets.filter(t => t.status === 'resolved').length
        },
        inventoryStats: { total_products: mockProducts.length, low_stock: mockProducts.filter(p => p.stock <= p.lowStockAlert).length },
        billingStats: { monthly_revenue: mockInvoices.reduce((acc, inv) => acc + (inv.status === 'paid' ? inv.totalAmount : 0), 0), total_invoices: mockInvoices.length }
      }
    };
  }

  if (cleanUrl === '/dashboard/revenue') {
    return {
      success: true,
      data: [
        { month: 'Jan', revenue: 45000 }, { month: 'Feb', revenue: 52000 },
        { month: 'Mar', revenue: 48000 }, { month: 'Apr', revenue: 61000 },
        { month: 'May', revenue: 55000 }, { month: 'Jun', revenue: 67000 },
        { month: 'Jul', revenue: 72000 }, { month: 'Aug', revenue: 68000 },
        { month: 'Sep', revenue: 81000 }, { month: 'Oct', revenue: 75000 },
        { month: 'Nov', revenue: 89000 }, { month: 'Dec', revenue: 95000 }
      ]
    };
  }

  if (cleanUrl === '/dashboard/ticket-trends') {
    return {
      success: true,
      data: Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
        total: Math.floor(Math.random() * 8) + 2,
        resolved: Math.floor(Math.random() * 5) + 1,
      }))
    };
  }

  if (cleanUrl === '/dashboard/activity') {
    return {
      success: true,
      data: [
        { id: '1', full_name: 'System Admin', action: 'login', description: 'Logged into the platform', created_at: new Date().toISOString() },
        { id: '2', full_name: 'Rahul Sharma', action: 'create', description: 'Created a new support ticket TKT-00234', created_at: new Date(Date.now() - 300000).toISOString() },
        { id: '3', full_name: 'Priya Patel', action: 'update', description: 'Updated inventory stock for Laptop Pro 15"', created_at: new Date(Date.now() - 900000).toISOString() }
      ]
    };
  }

  if (cleanUrl === '/chat/conversations') {
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const newConv = {
        id: `conv-${mockConversations.length + 1}`,
        name: parsedData.name || 'New Direct Message',
        isGroup: !!parsedData.isGroup,
        lastMessage: { content: 'Conversation created.', createdAt: new Date().toISOString(), sender: { fullName: 'System' } }
      };
      mockConversations.unshift(newConv);
      mockMessages[newConv.id] = [];
      return { success: true, data: newConv };
    }
    return { success: true, data: mockConversations };
  }

  if (conversationMessagesMatch) {
    const convId = conversationMessagesMatch[1];
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const currentUser = useAuthStore.getState().user;
      const senderObj = currentUser 
        ? { id: currentUser.id, fullName: currentUser.fullName } 
        : { id: '20000000-0000-0000-0000-000000000001', fullName: 'System Administrator' };
        
      const newMsg = {
        id: `msg-${Date.now()}`,
        content: parsedData.content,
        sender: senderObj,
        createdAt: new Date().toISOString(),
        type: parsedData.type || 'text',
        file_id: parsedData.fileId || null,
        file_name: parsedData.fileName || null,
        file_url: parsedData.fileUrl || null,
        file_size: parsedData.fileSize || null,
        mime_type: parsedData.mimeType || null,
      };
      if (!mockMessages[convId]) mockMessages[convId] = [];
      mockMessages[convId].push(newMsg);
      const conv = mockConversations.find(c => c.id === convId);
      if (conv) {
        conv.lastMessage = {
          content: newMsg.content,
          createdAt: newMsg.createdAt,
          sender: senderObj
        };
      }
      return { success: true, data: newMsg };
    }
    return { success: true, data: mockMessages[convId] || [] };
  }

  if (conversationReadMatch) {
    return { success: true };
  }

  if (cleanUrl === '/tickets') {
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const newTicket = {
        id: `${mockTickets.length + 1}`,
        ticketId: `TKT-${String(mockTickets.length + 1).padStart(5, '0')}`,
        title: parsedData.title,
        description: parsedData.description,
        status: 'open',
        priority: parsedData.priority || 'medium',
        category: { name: parsedData.categoryName || 'General IT Support' },
        assignedTo: { fullName: 'Rahul Sharma' },
        creator: { fullName: 'System Administrator' },
        createdAt: new Date().toISOString(),
        comments: [] as any[]
      };
      mockTickets.unshift(newTicket);
      return { success: true, data: newTicket };
    }
    return { success: true, data: mockTickets };
  }

  if (cleanUrl === '/tickets/categories') {
    return {
      success: true,
      data: [
        { id: '50000000-0000-0000-0000-000000000001', name: 'General IT Support' },
        { id: '50000000-0000-0000-0000-000000000002', name: 'Hardware Issue' },
        { id: '50000000-0000-0000-0000-000000000003', name: 'Software Issue' },
        { id: '50000000-0000-0000-0000-000000000004', name: 'Network Issue' },
        { id: '50000000-0000-0000-0000-000000000005', name: 'Account Access' }
      ]
    };
  }

  if (ticketCommentsMatch) {
    const ticketId = ticketCommentsMatch[1];
    const ticket = mockTickets.find(t => t.id === ticketId);
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const newComment = {
        id: `${Date.now()}`,
        content: parsedData.content,
        creator: { fullName: 'System Administrator' },
        createdAt: new Date().toISOString()
      };
      if (ticket) {
        if (!ticket.comments) ticket.comments = [];
        ticket.comments.push(newComment);
      }
      return { success: true, data: newComment };
    }
    return { success: true, data: ticket?.comments || [] };
  }

  if (ticketIdMatch) {
    const ticketId = ticketIdMatch[1];
    const ticket = mockTickets.find(t => t.id === ticketId);
    if (methodUpper === 'PUT') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      if (ticket) {
        Object.assign(ticket, parsedData);
      }
      return { success: true, data: ticket };
    }
    return { success: true, data: ticket };
  }

  if (cleanUrl === '/inventory/products') {
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const newProduct = {
        id: `${mockProducts.length + 1}`,
        sku: parsedData.sku || `SKU-${Date.now().toString().slice(-6)}`,
        name: parsedData.name,
        category: { name: parsedData.categoryName || 'Electronics' },
        price: Number(parsedData.price || 0),
        stock: Number(parsedData.stock || 0),
        lowStockAlert: Number(parsedData.lowStockAlert || 5),
        warehouse: { name: 'Main Warehouse' }
      };
      mockProducts.unshift(newProduct);
      return { success: true, data: newProduct };
    }
    return { success: true, data: mockProducts };
  }

  if (cleanUrl === '/inventory/categories') {
    return {
      success: true,
      data: [
        { id: '40000000-0000-0000-0000-000000000001', name: 'Electronics' },
        { id: '40000000-0000-0000-0000-000000000002', name: 'Office Supplies' }
      ]
    };
  }

  if (productStockMatch) {
    const prodId = productStockMatch[1];
    const prod = mockProducts.find(p => p.id === prodId);
    if (methodUpper === 'PATCH') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      if (prod) {
        prod.stock = Number(parsedData.quantity || prod.stock);
      }
    }
    return { success: true, data: prod };
  }

  if (cleanUrl === '/billing/invoices') {
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const newInvoice = {
        id: `${mockInvoices.length + 1}`,
        invoiceNumber: `INV-2026-${String(mockInvoices.length + 1).padStart(4, '0')}`,
        customer: mockCustomers.find(c => c.id === parsedData.customerId) || { name: 'New Customer' },
        totalAmount: Number(parsedData.totalAmount || 0),
        status: 'unpaid',
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 864000000).toISOString()
      };
      mockInvoices.unshift(newInvoice);
      return { success: true, data: newInvoice };
    }
    return { success: true, data: mockInvoices };
  }

  if (invoiceDetailMatch) {
    const invId = invoiceDetailMatch[1];
    const invoice = mockInvoices.find(i => i.id === invId);
    return { success: true, data: invoice };
  }

  if (invoicePaymentMatch) {
    const invId = invoicePaymentMatch[1];
    const invoice = mockInvoices.find(i => i.id === invId);
    if (invoice) {
      invoice.status = 'paid';
    }
    return { success: true, data: invoice };
  }

  if (cleanUrl === '/billing/customers') {
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const newCust = {
        id: `${mockCustomers.length + 1}`,
        name: parsedData.name,
        email: parsedData.email,
        phone: parsedData.phone
      };
      mockCustomers.unshift(newCust);
      return { success: true, data: newCust };
    }
    return { success: true, data: mockCustomers };
  }

  if (cleanUrl === '/files/folders') {
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const newFolder = {
        id: `folder-${mockFolders.length + 1}`,
        name: parsedData.name,
        path: `/${parsedData.name}`,
        parentId: parsedData.parentId || null,
        ownerId: '20000000-0000-0000-0000-000000000001',
        createdAt: new Date().toISOString()
      };
      mockFolders.push(newFolder);
      return { success: true, data: newFolder };
    }
    return { success: true, data: mockFolders };
  }

  if (cleanUrl === '/files') {
    return { success: true, data: mockFiles };
  }

  if (cleanUrl === '/files/shared') {
    return { success: true, data: [] };
  }

  if (cleanUrl === '/files/upload') {
    const newFile = {
      id: `file-${mockFiles.length + 1}`,
      name: 'Uploaded_File.png',
      originalName: 'Uploaded_File.png',
      sizeBytes: 256000,
      mimeType: 'image/png',
      url: '#',
      storageUrl: '#',
      folderId: 'folder-1',
      createdAt: new Date().toISOString()
    };
    mockFiles.unshift(newFile);
    return { success: true, data: newFile };
  }

  if (cleanUrl === '/purchase/orders') {
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const newOrder = {
        id: `${mockPurchaseOrders.length + 1}`,
        orderNumber: `PO-2026-${String(mockPurchaseOrders.length + 1).padStart(4, '0')}`,
        supplier: mockSuppliers.find(s => s.id === parsedData.supplierId) || { name: 'Supplier' },
        totalAmount: Number(parsedData.totalAmount || 0),
        status: 'pending',
        orderDate: new Date().toISOString()
      };
      mockPurchaseOrders.unshift(newOrder);
      return { success: true, data: newOrder };
    }
    return { success: true, data: mockPurchaseOrders };
  }

  if (cleanUrl === '/purchase/suppliers') {
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const newSupp = {
        id: `${mockSuppliers.length + 1}`,
        name: parsedData.name,
        contactPerson: parsedData.contactPerson,
        email: parsedData.email
      };
      mockSuppliers.unshift(newSupp);
      return { success: true, data: newSupp };
    }
    return { success: true, data: mockSuppliers };
  }

  if (cleanUrl === '/email') {
    return { success: true, data: mockEmails };
  }

  if (cleanUrl === '/email/send') {
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    const newEmail = {
      id: `${mockEmails.length + 1}`,
      subject: parsedData.subject,
      from: 'admin@gsv.local',
      to: parsedData.to,
      content: parsedData.content,
      createdAt: new Date().toISOString()
    };
    mockEmails.unshift(newEmail);
    return { success: true, data: newEmail };
  }

  if (cleanUrl === '/notifications') {
    return { success: true, data: mockNotifications };
  }

  if (cleanUrl === '/notifications/count') {
    return { success: true, data: { count: mockNotifications.filter(n => !n.isRead).length } };
  }

  if (cleanUrl === '/notifications/read-all') {
    mockNotifications.forEach(n => n.isRead = true);
    return { success: true };
  }

  if (cleanUrl.match(/^\/notifications\/([^/]+)\/read$/)) {
    const match = cleanUrl.match(/^\/notifications\/([^/]+)\/read$/);
    if (match) {
      const notifId = match[1];
      const notif = mockNotifications.find(n => n.id === notifId);
      if (notif) notif.isRead = true;
    }
    return { success: true };
  }

  if (cleanUrl === '/requests/categories') {
    return {
      success: true,
      data: {
        chat: mockChatRequests,
        team: mockTeamRequests,
        file: mockFileRequests,
      }
    };
  }

  if (cleanUrl.match(/^\/requests\/(chat|team|file)\/([^/]+)\/(approve|deny)$/)) {
    const match = cleanUrl.match(/^\/requests\/(chat|team|file)\/([^/]+)\/(approve|deny)$/);
    if (match) {
      const category = match[1];
      const reqId = match[2];
      const action = match[3];
      const status = action === 'approve' ? 'approved' : 'denied';
      
      if (category === 'chat') {
        const item = mockChatRequests.find(r => r.id === reqId);
        if (item) item.status = status;
      } else if (category === 'team') {
        const item = mockTeamRequests.find(r => r.id === reqId);
        if (item) item.status = status;
      } else if (category === 'file') {
        const item = mockFileRequests.find(r => r.id === reqId);
        if (item) item.status = status;
      }
      return { success: true, message: `Request successfully ${status}` };
    }
  }

  if (cleanUrl === '/requests/sync-sheets') {
    return {
      success: true,
      message: 'Google Sheets sync completed successfully',
      data: {
        timestamp: new Date().toISOString(),
        rowsSynced: mockUsers.length + mockChatRequests.length + mockTeamRequests.length + mockFileRequests.length,
        spreadsheetId: '1BxiMVs0XRA5nFMdKv1a39dxv5WYpH7RP05g4fU2b168',
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKv1a39dxv5WYpH7RP05g4fU2b168/edit'
      }
    };
  }

  if (userPermissionsMatch) {
    const userId = userPermissionsMatch[1];
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      mockUserPermissions[userId] = parsedData.permissionIds || [];
      return { success: true };
    }
    return { success: true, data: mockUserPermissions[userId] || [] };
  }

  if (cleanUrl === '/users') {
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Duplicate validations
      const exists = mockUsers.find(u => u.email === parsedData.email || u.phone === parsedData.phone);
      if (exists) {
        if (exists.status === 'pending') {
          return { success: false, message: 'You have already requested' };
        } else {
          return { success: false, message: 'You have already registered using this mobile number, this email ID' };
        }
      }

      const baseName = parsedData.fullName ? parsedData.fullName.toLowerCase().split(' ')[0].replace(/[^a-z]/g, '') : 'user';
      const serial = String(mockUsers.length + 1).padStart(3, '0');
      const generatedLoginId = parsedData.loginId || `${baseName}${serial}`;
      
      const deptObj = mockDepartments.find(d => d.id === parsedData.departmentId) || { id: '1', name: 'General' };
      const roleObj = mockRoles.find(r => r.id === parsedData.roleId) || { id: '4', name: 'Employee', color: '#22c55e' };
      
      const newUser = {
        id: parsedData.id || `${Date.now()}`,
        employeeId: `EMP-${String(mockUsers.length + 1).padStart(4, '0')}`,
        loginId: generatedLoginId,
        email: parsedData.email,
        fullName: parsedData.fullName,
        role: { id: roleObj.id, name: roleObj.name, color: roleObj.color },
        department: { id: deptObj.id, name: deptObj.name },
        status: parsedData.status || 'active',
        isOnline: false,
        lastSeen: new Date().toISOString(),
        phone: parsedData.phone || '',
        designation: parsedData.designation || '',
        address: parsedData.address || '',
        dob: parsedData.dob || '',
      };
      mockUsers.push(newUser);
      return { success: true, data: newUser };
    }
    
    const urlParams = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : null;
    const statusQuery = urlParams ? urlParams.get('status') : null;
    const searchQuery = urlParams ? urlParams.get('search') : null;
    
    let filtered = [...mockUsers];
    if (statusQuery) {
      filtered = filtered.filter(u => u.status === statusQuery);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(u => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.loginId.toLowerCase().includes(q));
    }
    
    return {
      success: true,
      data: {
        data: filtered,
        meta: {
          total: filtered.length,
          page: 1,
          totalPages: 1
        }
      }
    };
  }

  if (userMatch) {
    const userId = userMatch[1];
    const user = mockUsers.find(u => u.id === userId);
    return { success: true, data: user };
  }

  if (userStatusMatch) {
    const userId = userStatusMatch[1];
    const user = mockUsers.find(u => u.id === userId);
    if (methodUpper === 'PATCH' && user) {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      user.status = parsedData.status;
      
      if (parsedData.roleId) {
        const foundRole = mockRoles.find(r => r.id === parsedData.roleId);
        if (foundRole) {
          user.role = { id: foundRole.id, name: foundRole.name, color: foundRole.color };
        }
      }
      if (parsedData.permissions) {
        mockUserPermissions[user.id] = parsedData.permissions;
      }
    }
    return { success: true, data: user };
  }

  if (userResetPwdMatch) {
    return { success: true, message: 'Password reset successful' };
  }

  if (cleanUrl === '/roles') {
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const newRole = {
        id: `role-${mockRoles.length + 1}`,
        name: parsedData.name,
        description: parsedData.description,
        color: parsedData.color || '#6366f1',
        isSystem: false,
        level: Number(parsedData.level || 5)
      };
      mockRoles.push(newRole);
      return { success: true, data: newRole };
    }
    return { success: true, data: mockRoles };
  }

  if (cleanUrl === '/departments') {
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const newDept = {
        id: `dept-${mockDepartments.length + 1}`,
        name: parsedData.name,
        description: parsedData.description,
        color: parsedData.color || '#0ea5e9'
      };
      mockDepartments.push(newDept);
      return { success: true, data: newDept };
    }
    return { success: true, data: mockDepartments };
  }

  if (cleanUrl === '/permissions/grouped') {
    const grouped: Record<string, any[]> = {};
    mockPermissions.forEach(p => {
      if (!grouped[p.module]) grouped[p.module] = [];
      grouped[p.module].push(p);
    });
    return {
      success: true,
      data: grouped
    };
  }

  if (cleanUrl === '/permissions') {
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const newPerm = {
        id: parsedData.id,
        action: parsedData.action,
        module: parsedData.module,
        description: parsedData.description
      };
      mockPermissions.push(newPerm);
      return { success: true, data: newPerm };
    }
    return { success: true, data: mockPermissions };
  }

  if (rolePermissionsMatch) {
    const roleId = rolePermissionsMatch[1];
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      mockRolePermissions[roleId] = parsedData.permissionIds || [];
      return { success: true };
    }

    const grantedList = mockRolePermissions[roleId] || [];
    const mapped = mockPermissions.map(p => ({
      ...p,
      granted: grantedList.includes(p.id)
    }));

    return { success: true, data: mapped };
  }

  if (cleanUrl === '/server/info') {
    return {
      success: true,
      data: {
        cpuUsage: 12,
        memoryUsedBytes: 4294967296,
        memoryTotalBytes: 17179869184,
        storageUsedBytes: 107374182400,
        storageTotalBytes: 536870912000,
        uptimeSeconds: 86400,
        nodeVersion: 'v20.11.0',
        platform: 'win32',
        hostname: 'gsv-office-main',
        cpus: 8,
        totalMemoryMB: 16384,
        freeMemoryMB: 12288
      }
    };
  }

  if (cleanUrl === '/server/db-status') {
    return {
      success: true,
      data: {
        sizeBytes: 42949672
      }
    };
  }

  if (cleanUrl === '/server/security-logs') {
    return {
      success: true,
      data: mockSecurityLogs
    };
  }

  if (cleanUrl === '/storage/metrics') {
    const list = mockUsers.map(u => {
      const quota = mockStorageQuotas[u.loginId] || { usedBytes: 0, limitBytes: 53687091200 };
      return {
        userId: u.id,
        loginId: u.loginId,
        fullName: u.fullName,
        roleName: u.role?.name || 'Employee',
        usedBytes: quota.usedBytes,
        limitBytes: quota.limitBytes
      };
    });
    const totalUsed = list.reduce((acc: number, current: any) => acc + current.usedBytes, 0);
    const totalCapacity = 536870912000; // 500 GB
    return {
      success: true,
      data: {
        totalUsedBytes: totalUsed,
        totalLimitBytes: totalCapacity,
        freeBytes: totalCapacity - totalUsed,
        users: list
      }
    };
  }

  if (cleanUrl === '/storage/users/quota') {
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    const { loginId, limitBytes } = parsedData;
    if (!mockStorageQuotas[loginId]) {
      mockStorageQuotas[loginId] = { usedBytes: 0, limitBytes: 53687091200 };
    }
    mockStorageQuotas[loginId].limitBytes = Number(limitBytes);
    mockSecurityLogs.unshift({
      id: `sec-${Date.now()}`,
      type: 'quota',
      username: 'admin',
      message: `💾 Quota limit for user ${loginId} adjusted to ${limitBytes > 1073741824 ? (limitBytes / 1073741824).toFixed(1) + ' GB' : (limitBytes / 1048576).toFixed(1) + ' MB'}`,
      ipAddress: '127.0.0.1',
      createdAt: new Date().toISOString()
    });
    return { success: true, message: 'Quota successfully updated' };
  }

  if (cleanUrl === '/files/access-requests') {
    if (methodUpper === 'POST') {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      const { folderId, ownerId, requesterId, requesterName } = parsedData;
      const folder = mockFolders.find(f => f.id === folderId);
      const newRequest = {
        id: `req-share-${Date.now()}`,
        folderId,
        folderName: folder?.name || 'Private Folder',
        requesterName,
        requesterId,
        ownerId,
        status: 'pending',
        requestedAt: new Date().toISOString()
      };
      mockFolderSharingRequests.push(newRequest);
      
      mockSecurityLogs.unshift({
        id: `sec-${Date.now()}`,
        type: 'access',
        username: requesterName.split(' ')[0].toLowerCase(),
        message: `🔒 Access requested for folder ${folder?.name || 'Private Folder'} by ${requesterName}`,
        ipAddress: '192.168.1.100',
        createdAt: new Date().toISOString()
      });

      return { success: true, data: newRequest };
    }
    return { success: true, data: mockFolderSharingRequests };
  }

  if (cleanUrl === '/files/access-requests/review') {
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    const { requestId, status, permission } = parsedData; // status: 'approved' | 'rejected'
    const item = mockFolderSharingRequests.find(r => r.id === requestId);
    if (item) {
      item.status = status === 'approved' ? 'approved' : 'rejected';
      if (status === 'approved') {
        if (!mockFolderPermissions[item.folderId]) {
          mockFolderPermissions[item.folderId] = {};
        }
        mockFolderPermissions[item.folderId][item.requesterId] = permission || 'read';
      }
      mockSecurityLogs.unshift({
        id: `sec-${Date.now()}`,
        type: 'permission',
        username: 'admin',
        message: `🔒 Access request for ${item.folderName} ${status === 'approved' ? 'granted (' + permission + ')' : 'denied'} for user ${item.requesterName}`,
        ipAddress: '127.0.0.1',
        createdAt: new Date().toISOString()
      });
    }
    return { success: true, message: 'Request reviewed successfully' };
  }

  if (cleanUrl === '/server/settings' || cleanUrl === '/public/settings') {
    return {
      success: true,
      data: {
        company_name: 'GSV Office',
        company_logo: '/assets/logo.png',
        primary_color: '#6366f1',
        secondary_color: '#8b5cf6',
        default_timezone: 'Asia/Kolkata',
        default_currency: 'INR',
        currency_symbol: '₹',
        tax_label: 'GST'
      }
    };
  }

  return { success: true, data: null };
};

// Request interceptor — add auth token and dynamic mock adapter in demo mode
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const isDemoMode = false;

  if (isDemoMode) {
    config.adapter = (cfg) => {
      return new Promise((resolve, reject) => {
        const responseData = getMockResponse(cfg.url || '', cfg.method || 'get', cfg.data);
        if (responseData && responseData.success === false) {
          reject({
            response: {
              data: responseData,
              status: 400,
              statusText: 'Bad Request',
              headers: {},
              config: cfg
            },
            message: responseData.message || 'Request failed',
            config: cfg
          });
        } else {
          resolve({
            data: responseData,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: cfg,
          } as any);
        }
      });
    };
  }
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
  getAll: () => api.get('/departments'),
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
