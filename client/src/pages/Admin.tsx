import { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, message, Modal, Input, Popconfirm, Card } from 'antd';
import { DeleteOutlined, KeyOutlined, ReloadOutlined } from '@ant-design/icons';
import { authApi } from '../api';

export function AdminPage() {
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
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Card style={{ borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>用户管理（共 {users.length} 人）</h2>
          <Button icon={<ReloadOutlined />} onClick={loadUsers}>刷新</Button>
        </div>
        <Table dataSource={users} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} size="small" scroll={{ x: 900 }} />
      </Card>

      <Modal title={`重置密码 - ${pwdModal.username}`} open={pwdModal.open} onOk={handleResetPwd} onCancel={() => { setPwdModal({ open: false, userId: '', username: '' }); setNewPassword(''); }} okText="确认重置">
        <p style={{ marginBottom: 8, color: '#666' }}>为用户 <strong>{pwdModal.username}</strong> 设置新密码：</p>
        <Input.Password placeholder="输入新密码（至少6位）" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </Modal>
    </div>
  );
}
