import http from './request'

// ==================== 认证 API ====================
export const authApi = {
  loginByWechat: (code: string, nickname?: string, avatar?: string) =>
    http.post('/users/login/wechat', { code, nickname, avatar }),
  bindWechat: (username: string, password: string, unionId: string, nickname?: string, avatar?: string) =>
    http.post('/users/bindWechat', { username, password, unionId, nickname, avatar }),
  wechatRegister: (unionId: string, nickname: string, avatar?: string) =>
    http.post('/users/wechat/register', { unionId, nickname, avatar }),
  loginByPhone: (phone: string) =>
    http.post('/users/login/phone', { phone, code: '000000' }),
  loginByEmail: (email: string, password: string) =>
    http.post('/users/login/email', { email, password }),
  loginByUsername: (username: string, password: string) =>
    http.post('/users/login/username', { username, password }),
  registerByEmail: (email: string, password: string, nickname?: string) =>
    http.post('/users/register/email', { email, password, nickname }),
  registerByUsername: (username: string, password: string, nickname?: string) =>
    http.post('/users/register/username', { username, password, nickname }),
  getMe: () => http.get('/users/me'),
  getMatchStats: () => http.get('/users/me/match-stats'),
  updateProfile: (data: any) => http.put('/users/me', data),
  getUser: (id: string) => http.get(`/users/${id}`),
  unbindWechat: () => http.post('/users/me/unbindWechat'),
  // Admin
  adminGetUsers: () => http.get('/users/admin/users'),
  adminDeleteUser: (id: string) => http.delete(`/users/admin/users/${id}`),
  adminResetPassword: (id: string, password: string) =>
    http.put(`/users/admin/users/${id}/password`, { password }),
  adminUpdateStatus: (id: string, status: string) =>
    http.put(`/users/admin/users/${id}/status`, { status }),
  adminUnbindWechat: (id: string) =>
    http.put(`/users/admin/users/${id}/unbindWechat`),
  adminUpdateRole: (id: string, role: number) =>
    http.put(`/users/admin/users/${id}/role`, { role }),
}

// ==================== 赛事 API ====================
export const tournamentApi = {
  list: (params?: any) => http.get('/tournaments', { params }),
  myList: (type: 'created' | 'participated' = 'created') =>
    http.get('/tournaments/my', { params: { type } }),
  get: (id: string) => http.get(`/tournaments/${id}`),
  create: (data: any) => http.post('/tournaments', data),
  update: (id: string, data: any) => http.put(`/tournaments/${id}`, data),
  publish: (id: string) => http.post(`/tournaments/${id}/publish`),
  advanceStatus: (id: string, status: string) =>
    http.post(`/tournaments/${id}/advance`, { status }),
  delete: (id: string) => http.delete(`/tournaments/${id}`),
  createNextStage: (id: string, data: { format: string; stage_name: string; advance_count: number; max_participants: number }) =>
    http.post(`/tournaments/${id}/create-next-stage`, data),
  getNextStages: (id: string) => http.get(`/tournaments/${id}/next-stages`),
}

// ==================== 报名 API ====================
export const registrationApi = {
  register: (tournamentId: string, data: any) =>
    http.post(`/tournaments/${tournamentId}/registrations`, data),
  list: (tournamentId: string) =>
    http.get(`/tournaments/${tournamentId}/registrations`),
  my: (tournamentId: string) =>
    http.get(`/tournaments/${tournamentId}/registrations/my`),
  review: (tournamentId: string, id: string, action: string, comment?: string) =>
    http.post(`/tournaments/${tournamentId}/registrations/${id}/review`, { action, comment }),
  batchReview: (tournamentId: string, ids: string[], action: string) =>
    http.post(`/tournaments/${tournamentId}/registrations/batch-review`, { ids, action }),
  checkin: (tournamentId: string) =>
    http.post(`/tournaments/${tournamentId}/registrations/checkin`),
  teamRegistrations: (tournamentId: string) =>
    http.get(`/tournaments/${tournamentId}/registrations/team-registrations`),
}

// ==================== 对阵图 API ====================
export const bracketApi = {
  get: (tournamentId: string) => http.get(`/tournaments/${tournamentId}/bracket`),
  generate: (tournamentId: string, mode: 'auto' | 'manual', data?: any) =>
    http.post(`/tournaments/${tournamentId}/bracket/generate`, { mode, data }),
  update: (tournamentId: string, rounds_data: any) =>
    http.put(`/tournaments/${tournamentId}/bracket`, { rounds_data }),
  publish: (tournamentId: string) => http.post(`/tournaments/${tournamentId}/bracket/publish`),
}

// ==================== 比赛 API ====================
export const matchApi = {
  list: (tournamentId: string) => http.get(`/tournaments/${tournamentId}/matches`),
  updateStatus: (tournamentId: string, id: string, status: string) =>
    http.put(`/tournaments/${tournamentId}/matches/${id}/status`, { status }),
  submitResult: (tournamentId: string, id: string, result: any) =>
    http.post(`/tournaments/${tournamentId}/matches/${id}/result`, result),
  schedule: (tournamentId: string, id: string, scheduled_at: string) =>
    http.put(`/tournaments/${tournamentId}/matches/${id}/schedule`, { scheduled_at }),
  updateBestOf: (tournamentId: string, id: string, best_of: number) =>
    http.put(`/tournaments/${tournamentId}/matches/${id}/best-of`, { best_of }),
  updateRoundBestOf: (tournamentId: string, round: number, best_of: number) =>
    http.put(`/tournaments/${tournamentId}/matches/round/${round}/best-of`, { best_of }),
  resetMatch: (tournamentId: string, id: string) =>
    http.put(`/tournaments/${tournamentId}/matches/${id}/reset`, {}),
}

// ==================== 排名 API ====================
export const rankingApi = {
  get: (tournamentId: string) => http.get(`/tournaments/${tournamentId}/rankings`),
}

// ==================== 战队 API ====================
export const teamApi = {
  create: (data: any) => http.post('/teams', data),
  list: () => http.get('/teams'),
  get: (id: string) => http.get(`/teams/${id}`),
  update: (id: string, data: any) => http.put(`/teams/${id}`, data),
  members: (id: string) => http.get(`/teams/${id}/members`),
  invite: (id: string) => http.post(`/teams/${id}/invite`),
  join: (code: string) => http.post('/teams/join', { code }),
  joinById: (teamId: string) => http.post(`/teams/${teamId}/join`),
  allTeams: () => http.get('/teams/all'),
  showcase: () => http.get('/teams/showcase'),
  export: () => http.get('/teams/export'),
  reviewMember: (teamId: string, memberId: string, action: string) =>
    http.post(`/teams/${teamId}/members/${memberId}/review`, { action }),
  removeMember: (teamId: string, memberId: string) =>
    http.delete(`/teams/${teamId}/members/${memberId}`),
  leaveTeam: (teamId: string) => http.post(`/teams/${teamId}/leave`),
  disbandTeam: (teamId: string) => http.delete(`/teams/${teamId}/disband`),
  myCaptainTeams: () => http.get('/teams/captain/my'),
  // 上传：小程序用 Taro.uploadFile 循环上传
  uploadPhotos: (filePaths: string[]) => {
    return Promise.all(
      filePaths.map((fp) => http.upload('/teams/upload', fp, 'images'))
    ).then((results) => ({
      data: { urls: results.flatMap((r) => r.data.urls || []) },
    }))
  },
}

// ==================== 通知 API ====================
export const notificationApi = {
  list: () => http.get('/notifications'),
  unreadCount: () => http.get('/notifications/unread-count'),
  markAsRead: (id: string) => http.post(`/notifications/${id}/read`),
  markAllAsRead: () => http.post('/notifications/read-all'),
}

// ==================== 选手 API ====================
export const playerApi = {
  list: () => http.get('/users/players'),
  uploadPhotos: (filePaths: string[]) => {
    return Promise.all(
      filePaths.map((fp) => http.upload('/users/me/photos', fp, 'images'))
    ).then((results) => ({
      data: { urls: results.flatMap((r) => r.data.urls || []) },
    }))
  },
}

// ==================== 光荣榜 API ====================
export const honorRollApi = {
  list: () => http.get('/honor-rolls'),
  adminList: () => http.get('/honor-rolls/admin/all'),
  create: (data: any) => http.post('/honor-rolls', data),
  update: (id: string, data: any) => http.put(`/honor-rolls/${id}`, data),
  delete: (id: string) => http.delete(`/honor-rolls/${id}`),
  uploadImage: (filePath: string) => http.upload('/honor-rolls/upload', filePath, 'image'),
}

// ==================== 公告 API ====================
export const announcementApi = {
  list: (params?: { page?: number; limit?: number }) =>
    http.get('/announcements', { params }),
  get: (id: string) => http.get(`/announcements/${id}`),
  adminList: (params?: { page?: number; limit?: number }) =>
    http.get('/announcements/admin/all', { params }),
  create: (data: { title: string; content: string; images?: string[]; is_pinned?: boolean; status?: string }) =>
    http.post('/announcements', data),
  update: (id: string, data: Partial<{ title: string; content: string; images: string[]; is_pinned: boolean; status: string }>) =>
    http.put(`/announcements/${id}`, data),
  delete: (id: string) => http.delete(`/announcements/${id}`),
  uploadImages: (filePaths: string[]) => {
    return Promise.all(
      filePaths.map((fp) => http.upload('/announcements/upload', fp, 'images'))
    ).then((results) => ({
      data: { urls: results.flatMap((r) => r.data.urls || []) },
    }))
  },
}

// ==================== 社区 API ====================
export const communityApi = {
  listPosts: (params?: { page?: number; limit?: number; category?: string; keyword?: string }) =>
    http.get('/community/posts', { params }),
  getPost: (id: string) => http.get(`/community/posts/${id}`),
  createPost: (data: { title: string; content: string; images?: string[]; category?: string }) =>
    http.post('/community/posts', data),
  updatePost: (id: string, data: any) => http.put(`/community/posts/${id}`, data),
  deletePost: (id: string) => http.delete(`/community/posts/${id}`),
  getUserPosts: (userId: string) => http.get(`/community/users/${userId}/posts`),
  togglePostLike: (id: string) => http.post(`/community/posts/${id}/like`),
  isPostLiked: (id: string) => http.get(`/community/posts/${id}/liked`),
  listComments: (postId: string) => http.get(`/community/posts/${postId}/comments`),
  createComment: (postId: string, data: { content: string; parent_id?: string }) =>
    http.post(`/community/posts/${postId}/comments`, data),
  deleteComment: (id: string) => http.delete(`/community/comments/${id}`),
  toggleCommentLike: (id: string) => http.post(`/community/comments/${id}/like`),
  uploadImages: (filePaths: string[]) => {
    return Promise.all(
      filePaths.map((fp) => http.upload('/announcements/upload', fp, 'images'))
    ).then((results) => ({
      data: { urls: results.flatMap((r: any) => r.data.urls || []) },
    }))
  },
}
