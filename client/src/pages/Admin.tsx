import { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, message, Modal, Input, Popconfirm, Card, Tabs, Form, Switch, Upload, Image } from 'antd';
import { DeleteOutlined, KeyOutlined, ReloadOutlined, PlusOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import { authApi, announcementApi, honorRollApi, teamApi } from '../api';

// ========== User Management ==========
function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pwdModal, setPwdModal] = useState<{ open: boolean; userId: string; username: string }>({ open: false, userId: '', username: '' });
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await authApi.adminGetUsers();
      setUsers(res.data || []);
    } catch (err: any) {
      message.error(err.response?.data?.message || '加载失败');
    } finally { setLoading(false); }
  };

  const handleDelete = async (userId: string) => {
    try {
      await authApi.adminDeleteUser(userId);
      message.success('已删除');
      loadUsers();
    } catch (err: any) {
      message.error(err.response?.data?.message || '删除失败');
    }
  };

  const handleResetPwd = async () => {
    if (!newPassword || newPassword.length < 6) {
      message.error('密码至少6位');
      return;
    }
    try {
      await authApi.adminResetPassword(pwdModal.userId, newPassword);
      message.success('密码已重置');
      setPwdModal({ open: false, userId: '', username: '' });
      setNewPassword('');
    } catch (err: any) {
      message.error(err.response?.data?.message || '重置失败');
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'banned' : 'active';
    try {
      await authApi.adminUpdateStatus(userId, newStatus);
      message.success(newStatus === 'active' ? '已解禁' : '已禁用');
      loadUsers();
    } catch (err: any) {
      message.error(err.response?.data?.message || '操作失败');
    }
  };

  const handleUnbindWechat = async (userId: string) => {
    try {
      await authApi.adminUnbindWechat(userId);
      message.success('微信解绑成功');
      loadUsers();
    } catch (err: any) {
      message.error(err.response?.data?.message || '解绑失败');
    }
  };

  const handleUpdateRole = async (userId: string, role: number) => {
    try {
      await authApi.adminUpdateRole(userId, role);
      message.success(role === 2 ? '已设为二级管理员' : '已取消二级管理员');
      loadUsers();
    } catch (err: any) {
      message.error(err.response?.data?.message || '操作失败');
    }
  };

  // 当前登录用户是否为超级管理员
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const isSuperAdmin = currentUser?.role === 1;

  const columns = [
    { title: '用户名', dataIndex: 'username', render: (v: string) => <strong>{v || '-'}</strong> },
    { title: '昵称', dataIndex: 'nickname' },
    { title: '角色', dataIndex: 'role', render: (r: number) => r === 1 ? <Tag color="red">超级管理员</Tag> : r === 2 ? <Tag color="orange">二级管理员</Tag> : <Tag>普通用户</Tag> },
    { title: '状态', dataIndex: 'status', render: (s: string) => s === 'banned' ? <Tag color="red">已禁用</Tag> : <Tag color="green">正常</Tag> },
    { title: '微信', dataIndex: 'wechat_union_id', render: (v: string) => v ? <Tag color="green">已绑定</Tag> : <Tag>未绑定</Tag> },
    { title: '手机号', dataIndex: 'phone', render: (v: string) => v || '-' },
    { title: '游戏ID', dataIndex: 'game_ids', render: (v: string) => v || '-' },
    { title: '注册时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    { title: '操作', render: (_: any, r: any) => r.role === 1 ? (
      <Tag>超级管理员</Tag>
    ) : (
      <Space wrap>
        <Button size="small" icon={<KeyOutlined />} onClick={() => { setPwdModal({ open: true, userId: r.id, username: r.username || r.nickname }); setNewPassword(''); }}>
          改密
        </Button>
        {r.wechat_union_id && (
          <Popconfirm title="确定解绑该用户的微信？" onConfirm={() => handleUnbindWechat(r.id)}>
            <Button size="small" danger>解绑微信</Button>
          </Popconfirm>
        )}
        {r.status === 'banned' ? (
          <Button size="small" type="primary" onClick={() => handleToggleStatus(r.id, r.status)}>解禁</Button>
        ) : (
          <Button size="small" onClick={() => handleToggleStatus(r.id, r.status)}>禁用</Button>
        )}
        {isSuperAdmin && r.role === 0 && (
          <Popconfirm title="确定将该用户设为二级管理员？" onConfirm={() => handleUpdateRole(r.id, 2)}>
            <Button size="small" type="primary" ghost>设为二级管理员</Button>
          </Popconfirm>
        )}
        {isSuperAdmin && r.role === 2 && (
          <Popconfirm title="确定取消该用户的二级管理员身份？" onConfirm={() => handleUpdateRole(r.id, 0)}>
            <Button size="small" type="primary" ghost>取消二级管理员</Button>
          </Popconfirm>
        )}
        <Popconfirm title="确定删除该用户？" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <Card style={{ borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>用户管理（共 {users.length} 人）</h2>
        <Button icon={<ReloadOutlined />} onClick={loadUsers}>刷新</Button>
      </div>
      <Table dataSource={users} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} size="small" scroll={{ x: 900 }} />

      <Modal title={`重置密码 - ${pwdModal.username}`} open={pwdModal.open} onOk={handleResetPwd} onCancel={() => { setPwdModal({ open: false, userId: '', username: '' }); setNewPassword(''); }} okText="确认重置">
        <p style={{ marginBottom: 8, color: '#666' }}>为用户 <strong>{pwdModal.username}</strong> 设置新密码：</p>
        <Input.Password placeholder="输入新密码（至少6位）" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </Modal>
    </Card>
  );
}

// ========== Announcement Management ==========
function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [mdContent, setMdContent] = useState('');

  useEffect(() => { loadAnnouncements(); }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await announcementApi.adminList();
      setAnnouncements(res.data.items || []);
    } catch (err: any) {
      message.error(err.response?.data?.message || '加载失败');
    } finally { setLoading(false); }
  };

  const openCreate = () => {
    form.resetFields();
    setMdContent('');
    setImageUrls([]);
    setEditModal({ open: true, data: null });
  };

  const openEdit = (record: any) => {
    form.setFieldsValue({
      title: record.title,
      is_pinned: record.is_pinned,
      status: record.status,
    });
    setMdContent(record.content || '');
    setImageUrls(record.images || []);
    setEditModal({ open: true, data: record });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (!mdContent.trim()) {
        message.error('请输入公告内容');
        return;
      }
      const data = {
        title: values.title,
        content: mdContent,
        images: imageUrls,
        is_pinned: values.is_pinned || false,
        status: values.status || 'published',
      };
      if (editModal.data) {
        await announcementApi.update(editModal.data.id, data);
        message.success('公告已更新');
      } else {
        await announcementApi.create(data);
        message.success('公告已发布');
      }
      setEditModal({ open: false, data: null });
      setMdContent('');
      setImageUrls([]);
      loadAnnouncements();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await announcementApi.delete(id);
      message.success('已删除');
      loadAnnouncements();
    } catch (err: any) {
      message.error(err.response?.data?.message || '删除失败');
    }
  };

  const handleUpload = async (file: any) => {
    if (imageUrls.length >= 9) {
      message.warning('最多上传9张图片');
      return false;
    }
    setUploading(true);
    try {
      const res = await announcementApi.uploadImages([file]);
      setImageUrls([...imageUrls, ...(res.data.urls || [])]);
      message.success('上传成功');
    } catch (err: any) {
      message.error(err.response?.data?.message || '上传失败');
    } finally { setUploading(false); }
    return false;
  };

  const removeImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const columns = [
    { title: '标题', dataIndex: 'title', render: (v: string) => <strong>{v}</strong> },
    { title: '状态', dataIndex: 'status', render: (s: string) => s === 'published' ? <Tag color="green">已发布</Tag> : <Tag>草稿</Tag> },
    { title: '置顶', dataIndex: 'is_pinned', render: (v: boolean) => v ? <Tag color="orange">置顶</Tag> : '-' },
    { title: '图片', dataIndex: 'images', render: (v: string[]) => v?.length ? <Tag>{v.length} 张</Tag> : '-' },
    { title: '发布时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    { title: '操作', render: (_: any, r: any) => (
      <Space>
        <Button size="small" type="primary" onClick={() => openEdit(r)}>编辑</Button>
        <Popconfirm title="确定删除此公告？" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <Card style={{ borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>公告管理（共 {announcements.length} 条）</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadAnnouncements}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>发布公告</Button>
        </Space>
      </div>
      <Table dataSource={announcements} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} size="small" />

      <Modal
        title={editModal.data ? '编辑公告' : '发布公告'}
        open={editModal.open}
        onOk={handleSave}
        onCancel={() => { setEditModal({ open: false, data: null }); setMdContent(''); setImageUrls([]); }}
        okText={editModal.data ? '保存' : '发布'}
        cancelText="取消"
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="公告标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="输入公告标题" maxLength={100} />
          </Form.Item>
          <Form.Item label="公告内容" required>
            <div data-color-mode="light">
              <MDEditor
                value={mdContent}
                onChange={(val) => setMdContent(val || '')}
                height={200}
                preview="edit"
                visibleDragbar={false}
                hideToolbar={false}
              />
            </div>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
              支持 Markdown 格式：**加粗** *斜体* # 标题 - 列表 &gt; 引用 `代码`
            </div>
          </Form.Item>
          <Form.Item label="图片（最多9张）">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {imageUrls.map((url, index) => (
                <div key={index} style={{ position: 'relative' }}>
                  <Image src={url} width={80} height={80} style={{ objectFit: 'cover', borderRadius: 4 }} />
                  <Button
                    size="small"
                    danger
                    style={{ position: 'absolute', top: -8, right: -8, minWidth: 20, height: 20, padding: 0, borderRadius: '50%' }}
                    onClick={() => removeImage(index)}
                  >
                    x
                  </Button>
                </div>
              ))}
            </div>
            {imageUrls.length < 9 && (
              <Upload beforeUpload={handleUpload} showUploadList={false} accept="image/*">
                <Button icon={<UploadOutlined />} loading={uploading}>上传图片</Button>
              </Upload>
            )}
          </Form.Item>
          <Form.Item name="is_pinned" label="置顶" valuePropName="checked">
            <Switch checkedChildren="置顶" unCheckedChildren="普通" />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="published">
            <Space>
              <Tag.CheckableTag checked={Form.useWatch('status', form) === 'published'} onChange={() => form.setFieldsValue({ status: 'published' })}>已发布</Tag.CheckableTag>
              <Tag.CheckableTag checked={Form.useWatch('status', form) === 'draft'} onChange={() => form.setFieldsValue({ status: 'draft' })}>草稿</Tag.CheckableTag>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

// ========== Honor Roll Management ==========
function HonorRollManagement() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{ open: boolean; data: any }>({ open: false, data: null });
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await honorRollApi.adminList();
      setRecords(res.data || []);
    } catch (err: any) {
      message.error(err.response?.data?.message || '加载失败');
    } finally { setLoading(false); }
  };

  const openCreate = () => {
    form.resetFields();
    setPhotoUrl('');
    setEditModal({ open: true, data: null });
  };

  const openEdit = (record: any) => {
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      tournament_name: record.tournament_name,
      game: record.game,
      award_type: record.award_type,
      winner_name: record.winner_name,
      team_name: record.team_name,
      award_date: record.award_date,
      sort_order: record.sort_order,
    });
    setPhotoUrl(record.photo || '');
    setEditModal({ open: true, data: record });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const data = { ...values, photo: photoUrl || undefined };
      if (editModal.data) {
        await honorRollApi.update(editModal.data.id, data);
        message.success('已更新');
      } else {
        await honorRollApi.create(data);
        message.success('已添加');
      }
      setEditModal({ open: false, data: null });
      setPhotoUrl('');
      loadRecords();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await honorRollApi.delete(id);
      message.success('已删除');
      loadRecords();
    } catch (err: any) {
      message.error(err.response?.data?.message || '删除失败');
    }
  };

  const handleUpload = async (file: any) => {
    setUploading(true);
    try {
      const res = await honorRollApi.uploadImage(file);
      setPhotoUrl(res.data.url);
      message.success('上传成功');
    } catch (err: any) {
      message.error(err.response?.data?.message || '上传失败');
    } finally { setUploading(false); }
    return false;
  };

  const awardTypeOptions = [
    { label: '冠军', value: 'champion' },
    { label: '亚军', value: 'runner_up' },
    { label: '季军', value: 'third_place' },
    { label: 'MVP', value: 'mvp' },
    { label: '最佳战队', value: 'best_team' },
  ];

  const columns = [
    { title: '奖项', dataIndex: 'award_type', render: (v: string) => {
      const m: Record<string, { label: string; color: string }> = { champion: { label: '冠军', color: 'gold' }, runner_up: { label: '亚军', color: 'default' }, third_place: { label: '季军', color: 'orange' }, mvp: { label: 'MVP', color: 'red' }, best_team: { label: '最佳战队', color: 'blue' } };
      return <Tag color={m[v]?.color || 'default'}>{m[v]?.label || v}</Tag>;
    }},
    { title: '获奖者', dataIndex: 'winner_name' },
    { title: '战队', dataIndex: 'team_name', render: (v: string) => v || '-' },
    { title: '赛事', dataIndex: 'tournament_name', render: (v: string) => v || '-' },
    { title: '游戏', dataIndex: 'game', render: (v: string) => v || '-' },
    { title: '日期', dataIndex: 'award_date', render: (v: string) => v || '-' },
    { title: '操作', render: (_: any, r: any) => (
      <Space>
        <Button size="small" type="primary" onClick={() => openEdit(r)}>编辑</Button>
        <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <Card style={{ borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>光荣榜管理（共 {records.length} 条）</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadRecords}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加荣誉</Button>
        </Space>
      </div>
      <Table dataSource={records} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} size="small" />

      <Modal
        title={editModal.data ? '编辑荣誉' : '添加荣誉'}
        open={editModal.open}
        onOk={handleSave}
        onCancel={() => { setEditModal({ open: false, data: null }); setPhotoUrl(''); }}
        okText={editModal.data ? '保存' : '添加'}
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="荣誉标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="如：2026春季赛英雄联盟冠军" />
          </Form.Item>
          <Form.Item name="award_type" label="奖项类型" rules={[{ required: true, message: '请选择奖项类型' }]}>
            <Space wrap>
              {awardTypeOptions.map(opt => (
                <Tag.CheckableTag key={opt.value} checked={Form.useWatch('award_type', form) === opt.value} onChange={() => form.setFieldsValue({ award_type: opt.value })}>
                  {opt.label}
                </Tag.CheckableTag>
              ))}
            </Space>
          </Form.Item>
          <Form.Item name="winner_name" label="获奖者名称" rules={[{ required: true, message: '请输入获奖者名称' }]}>
            <Input placeholder="选手名或战队名" />
          </Form.Item>
          <Form.Item name="team_name" label="所属战队">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="tournament_name" label="所属赛事">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item name="game" label="游戏项目">
            <Input placeholder="如：英雄联盟" />
          </Form.Item>
          <Form.Item name="award_date" label="获奖日期">
            <Input placeholder="如：2026-03" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="可选描述" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <Input type="number" placeholder="数字越小越靠前" />
          </Form.Item>
          <Form.Item label="照片">
            {photoUrl && (
              <div style={{ marginBottom: 8 }}>
                <img src={photoUrl} alt="photo" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }} />
              </div>
            )}
            <Upload beforeUpload={handleUpload} showUploadList={false} accept="image/*">
              <Button icon={<UploadOutlined />} loading={uploading}>上传照片</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

// ========== Team Management ==========
function TeamManagement() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { loadTeams(); }, []);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const res = await teamApi.export();
      setTeams(res.data || []);
    } catch (err: any) {
      message.error(err.response?.data?.message || '加载失败');
    } finally { setLoading(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await teamApi.export();
      const data = res.data || [];

      // Build CSV
      const rows = [['战队名称', '标签', '队长', '成员数', '队员ID列表', '成就', '创建时间']];
      for (const t of data) {
        const memberIds = (t.members || [])
          .map((m: any) => m.user?.game_ids || m.user?.nickname || '')
          .filter(Boolean)
          .join('、');
        rows.push([
          t.name || '',
          t.tag || '',
          t.captain?.nickname || '',
          String(t.member_count || 0),
          memberIds,
          t.achievement || '',
          t.created_at ? new Date(t.created_at).toLocaleString('zh-CN') : '',
        ]);
      }

      const csv = '\uFEFF' + rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `战队数据_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (err: any) {
      message.error(err.response?.data?.message || '导出失败');
    } finally { setExporting(false); }
  };

  const columns = [
    { title: '战队名称', dataIndex: 'name', render: (v: string) => <strong>{v}</strong> },
    { title: '标签', dataIndex: 'tag', render: (v: string) => v || '-' },
    { title: '队长', render: (_: any, r: any) => r.captain?.nickname || '-' },
    { title: '成员数', dataIndex: 'member_count', width: 80 },
    { title: '队员ID', render: (_: any, r: any) => {
      const members = (r.members || []).map((m: any) => m.user?.game_ids || m.user?.nickname || '-');
      return members.length > 0 ? members.join('、') : '-';
    }},
    { title: '成就', dataIndex: 'achievement', render: (v: string) => v ? <Tag color="orange">{v}</Tag> : '-' },
    { title: '创建时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
  ];

  return (
    <Card style={{ borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>战队管理（共 {teams.length} 支）</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadTeams}>刷新</Button>
          <Button type="primary" icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>导出全部数据</Button>
        </Space>
      </div>
      <Table dataSource={teams} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} size="small" scroll={{ x: 900 }} />
    </Card>
  );
}

// ========== Admin Page ==========
export function AdminPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Tabs
        defaultActiveKey="users"
        items={[
          { key: 'users', label: '用户管理', children: <UserManagement /> },
          { key: 'teams', label: '战队管理', children: <TeamManagement /> },
          { key: 'announcements', label: '公告管理', children: <AnnouncementManagement /> },
          { key: 'honor', label: '光荣榜管理', children: <HonorRollManagement /> },
        ]}
      />
    </div>
  );
}
