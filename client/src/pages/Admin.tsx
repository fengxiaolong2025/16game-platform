import { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, message, Modal, Input, Popconfirm, Card, Tabs, Form, Switch, Upload, Image } from 'antd';
import { DeleteOutlined, KeyOutlined, ReloadOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { authApi, announcementApi } from '../api';

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

  const columns = [
    { title: '用户名', dataIndex: 'username', render: (v: string, r: any) => <strong>{v || '-'}</strong> },
    { title: '昵称', dataIndex: 'nickname' },
    { title: '角色', dataIndex: 'role', render: (r: number) => r === 1 ? <Tag color="red">管理员</Tag> : <Tag>普通用户</Tag> },
    { title: '状态', dataIndex: 'status', render: (s: string) => s === 'banned' ? <Tag color="red">已禁用</Tag> : <Tag color="green">正常</Tag> },
    { title: '手机号', dataIndex: 'phone', render: (v: string) => v || '-' },
    { title: '游戏ID', dataIndex: 'game_ids', render: (v: string) => v || '-' },
    { title: '注册时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    { title: '操作', render: (_: any, r: any) => r.role === 1 ? (
      <Tag>管理员不可操作</Tag>
    ) : (
      <Space>
        <Button size="small" icon={<KeyOutlined />} onClick={() => { setPwdModal({ open: true, userId: r.id, username: r.username || r.nickname }); setNewPassword(''); }}>
          改密
        </Button>
        {r.status === 'banned' ? (
          <Button size="small" type="primary" onClick={() => handleToggleStatus(r.id, r.status)}>解禁</Button>
        ) : (
          <Button size="small" onClick={() => handleToggleStatus(r.id, r.status)}>禁用</Button>
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
    setImageUrls([]);
    setEditModal({ open: true, data: null });
  };

  const openEdit = (record: any) => {
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      is_pinned: record.is_pinned,
      status: record.status,
    });
    setImageUrls(record.images || []);
    setEditModal({ open: true, data: record });
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        title: values.title,
        content: values.content,
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
        onCancel={() => { setEditModal({ open: false, data: null }); setImageUrls([]); }}
        okText={editModal.data ? '保存' : '发布'}
        cancelText="取消"
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="公告标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="输入公告标题" maxLength={100} />
          </Form.Item>
          <Form.Item name="content" label="公告内容" rules={[{ required: true, message: '请输入内容' }]}>
            <Input.TextArea rows={6} placeholder="输入公告内容，支持多行文本" />
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

// ========== Admin Page ==========
export function AdminPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Tabs
        defaultActiveKey="users"
        items={[
          { key: 'users', label: '用户管理', children: <UserManagement /> },
          { key: 'announcements', label: '公告管理', children: <AnnouncementManagement /> },
        ]}
      />
    </div>
  );
}
