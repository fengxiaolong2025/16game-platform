import api from './client';

export const authApi = {
  loginByPhone: (phone: string) => api.post('/users/login/phone', { phone, code: '000000' }),
  loginByEmail: (email: string, password: string) => api.post('/users/login/email', { email, password }),
  loginByUsername: (username: string, password: string) => api.post('/users/login/username', { username, password }),
  registerByEmail: (email: string, password: string, nickname?: string) => api.post('/users/register/email', { email, password, nickname }),
  registerByUsername: (username: string, password: string, nickname?: string) => api.post('/users/register/username', { username, password, nickname }),
  getMe: () => api.get('/users/me'),
  updateProfile: (data: any) => api.put('/users/me', data),
  getUser: (id: string) => api.get(`/users/${id}`),
  // Admin
  adminGetUsers: () => api.get('/users/admin/users'),
  adminDeleteUser: (id: string) => api.delete(`/users/admin/users/${id}`),
  adminResetPassword: (id: string, password: string) => api.put(`/users/admin/users/${id}/password`, { password }),
  adminUpdateStatus: (id: string, status: string) => api.put(`/users/admin/users/${id}/status`, { status }),
};

export const tournamentApi = {
  list: (params?: any) => api.get('/tournaments', { params }),
  myList: (type: 'created' | 'participated' = 'created') => api.get('/tournaments/my', { params: { type } }),
  get: (id: string) => api.get(`/tournaments/${id}`),
  create: (data: any) => api.post('/tournaments', data),
  update: (id: string, data: any) => api.put(`/tournaments/${id}`, data),
  publish: (id: string) => api.post(`/tournaments/${id}/publish`),
  advanceStatus: (id: string, status: string) => api.post(`/tournaments/${id}/advance`, { status }),
  delete: (id: string) => api.delete(`/tournaments/${id}`),
  createNextStage: (id: string, data: { format: string; stage_name: string; advance_count: number; max_participants: number }) =>
    api.post(`/tournaments/${id}/create-next-stage`, data),
  getNextStages: (id: string) => api.get(`/tournaments/${id}/next-stages`),
};

export const registrationApi = {
  register: (tournamentId: string, data: any) => api.post(`/tournaments/${tournamentId}/registrations`, data),
  list: (tournamentId: string) => api.get(`/tournaments/${tournamentId}/registrations`),
  my: (tournamentId: string) => api.get(`/tournaments/${tournamentId}/registrations/my`),
  review: (tournamentId: string, id: string, action: string, comment?: string) =>
    api.post(`/tournaments/${tournamentId}/registrations/${id}/review`, { action, comment }),
  batchReview: (tournamentId: string, ids: string[], action: string) =>
    api.post(`/tournaments/${tournamentId}/registrations/batch-review`, { ids, action }),
  checkin: (tournamentId: string) => api.post(`/tournaments/${tournamentId}/registrations/checkin`),
  teamRegistrations: (tournamentId: string) => api.get(`/tournaments/${tournamentId}/registrations/team-registrations`),
};

export const bracketApi = {
  get: (tournamentId: string) => api.get(`/tournaments/${tournamentId}/bracket`),
  generate: (tournamentId: string, mode: 'auto' | 'manual', data?: any) =>
    api.post(`/tournaments/${tournamentId}/bracket/generate`, { mode, data }),
  update: (tournamentId: string, rounds_data: any) => api.put(`/tournaments/${tournamentId}/bracket`, { rounds_data }),
  publish: (tournamentId: string) => api.post(`/tournaments/${tournamentId}/bracket/publish`),
};

export const matchApi = {
  list: (tournamentId: string) => api.get(`/tournaments/${tournamentId}/matches`),
  updateStatus: (tournamentId: string, id: string, status: string) =>
    api.put(`/tournaments/${tournamentId}/matches/${id}/status`, { status }),
  submitResult: (tournamentId: string, id: string, result: any) =>
    api.post(`/tournaments/${tournamentId}/matches/${id}/result`, result),
  schedule: (tournamentId: string, id: string, scheduled_at: string) =>
    api.put(`/tournaments/${tournamentId}/matches/${id}/schedule`, { scheduled_at }),
  updateBestOf: (tournamentId: string, id: string, best_of: number) =>
    api.put(`/tournaments/${tournamentId}/matches/${id}/best-of`, { best_of }),
  updateRoundBestOf: (tournamentId: string, round: number, best_of: number) =>
    api.put(`/tournaments/${tournamentId}/matches/round/${round}/best-of`, { best_of }),
};

export const rankingApi = {
  get: (tournamentId: string) => api.get(`/tournaments/${tournamentId}/rankings`),
};

export const teamApi = {
  create: (data: any) => api.post('/teams', data),
  list: () => api.get('/teams'),
  get: (id: string) => api.get(`/teams/${id}`),
  update: (id: string, data: any) => api.put(`/teams/${id}`, data),
  members: (id: string) => api.get(`/teams/${id}/members`),
  invite: (id: string) => api.post(`/teams/${id}/invite`),
  join: (code: string) => api.post('/teams/join', { code }),
  joinById: (teamId: string) => api.post(`/teams/${teamId}/join`),
  allTeams: () => api.get('/teams/all'),
  reviewMember: (teamId: string, memberId: string, action: string) =>
    api.post(`/teams/${teamId}/members/${memberId}/review`, { action }),
  removeMember: (teamId: string, memberId: string) => api.delete(`/teams/${teamId}/members/${memberId}`),
  leaveTeam: (teamId: string) => api.post(`/teams/${teamId}/leave`),
  disbandTeam: (teamId: string) => api.delete(`/teams/${teamId}/disband`),
  myCaptainTeams: () => api.get('/teams/captain/my'),
};

export const notificationApi = {
  list: () => api.get('/notifications'),
  unreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
};

export const announcementApi = {
  list: (params?: { page?: number; limit?: number }) => api.get('/announcements', { params }),
  get: (id: string) => api.get(`/announcements/${id}`),
  adminList: (params?: { page?: number; limit?: number }) => api.get('/announcements/admin/all', { params }),
  create: (data: { title: string; content: string; images?: string[]; is_pinned?: boolean; status?: string }) => api.post('/announcements', data),
  update: (id: string, data: Partial<{ title: string; content: string; images: string[]; is_pinned: boolean; status: string }>) => api.put(`/announcements/${id}`, data),
  delete: (id: string) => api.delete(`/announcements/${id}`),
  uploadImages: (files: File[]) => {
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));
    return api.post('/announcements/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
