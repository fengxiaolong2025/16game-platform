import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Select, message, Table, Tag } from 'antd';
import { useAuthStore } from '../store';
import { authApi, tournamentApi } from '../api';

export function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMyTournaments();
  }, []);

  const loadMyTournaments = async () => {
    try {
      const res = await tournamentApi.myList('created');
      setTournaments(res.data || []);
    } catch { /* ignore */ }
  };

  const handleUpdateProfile = async (values: any) => {
    setLoading(true);
    try {
      const res = await authApi.updateProfile(values);
      setUser(res.data);
      message.success('信息已更新');
    } catch (err: any) {
      message.error(err.response?.data?.message || '更新失败');
    } finally { setLoading(false); }
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    draft: { label: '草稿', color: 'default' },
    registration: { label: '报名中', color: 'green' },
    bracket: { label: '对阵编排', color: 'blue' },
    in_progress: { label: '进行中', color: 'orange' },
    completed: { label: '已结束', color: 'default' },
  };

  const columns = [
    { title: '赛事名称', dataIndex: 'title' },
    { title: '游戏', dataIndex: 'game', render: (v: string) => <Tag>{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.label}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleDateString('zh-CN') },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card title="个人信息" style={{ borderRadius: 12, marginBottom: 16 }}>
        <Form layout="vertical" initialValues={{ nickname: user?.nickname, games: user?.games || [], game_ids: user?.game_ids || '' }} onFinish={handleUpdateProfile}>
          <Form.Item name="nickname" label="昵称" rules={[{ required: true }]}>
            <Input placeholder="你的昵称" />
          </Form.Item>
          <Form.Item name="games" label="常玩游戏">
            <Select mode="multiple" placeholder="选择你常玩的游戏" options={[
              { label: '英雄联盟', value: '英雄联盟' },
              { label: '王者荣耀', value: '王者荣耀' },
              { label: 'CS2', value: 'CS2' },
              { label: 'Valorant', value: 'Valorant' },
              { label: 'DOTA2', value: 'DOTA2' },
              { label: 'DOTA1', value: 'DOTA1' },
            ]} />
          </Form.Item>
          <Form.Item name="game_ids" label="游戏内ID">
            <Input placeholder="你的游戏内ID（可选）" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>保存</Button>
        </Form>
      </Card>

      <Card title="我创建的赛事" style={{ borderRadius: 12 }}>
        <Table dataSource={tournaments} columns={columns} rowKey="id" pagination={false} size="small" />
      </Card>
    </div>
  );
}
