import { useEffect, useState } from 'react';
import { Card, Button, Table, Tag, Modal, Form, Input, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, CopyOutlined, UserAddOutlined } from '@ant-design/icons';
import { teamApi } from '../api';

export function TeamPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [joinModal, setJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadTeams(); }, []);

  const loadTeams = async () => {
    try {
      const res = await teamApi.list();
      setTeams(res.data || []);
    } catch { /* ignore */ }
  };

  const loadMembers = async (teamId: string) => {
    try {
      const res = await teamApi.members(teamId);
      setMembers(res.data || []);
    } catch { /* ignore */ }
  };

  const handleCreate = async (values: any) => {
    setLoading(true);
    try {
      await teamApi.create(values);
      message.success('战队创建成功');
      setCreateModal(false);
      loadTeams();
    } catch (err: any) { message.error(err.response?.data?.message || '创建失败'); }
    finally { setLoading(false); }
  };

  const handleInvite = async (teamId: string) => {
    try {
      const res = await teamApi.invite(teamId);
      setInviteCode(res.data.code);
    } catch (err: any) { message.error('生成邀请码失败'); }
  };

  const handleJoin = async (values: { code: string }) => {
    setLoading(true);
    try {
      await teamApi.join(values.code);
      message.success('加入申请已提交');
      setJoinModal(false);
    } catch (err: any) { message.error(err.response?.data?.message || '加入失败'); }
    finally { setLoading(false); }
  };

  const handleReview = async (memberId: string, action: 'approve' | 'reject') => {
    if (!selectedTeam) return;
    try {
      await teamApi.reviewMember(selectedTeam.id, memberId, action);
      message.success(action === 'approve' ? '已通过' : '已拒绝');
      loadMembers(selectedTeam.id);
    } catch (err: any) { message.error('操作失败'); }
  };

  const memberColumns = [
    { title: '角色', dataIndex: 'role', render: (r: string) => r === 'captain' ? <Tag color="gold">队长</Tag> : <Tag>队员</Tag> },
    { title: '昵称', render: (_: any, r: any) => r.user?.nickname || '-' },
    { title: '游戏ID', render: (_: any, r: any) => r.user?.game_ids || '-' },
    { title: '状态', dataIndex: 'status', render: (s: string) => s === 'approved' ? <Tag color="green">已加入</Tag> : <Tag color="orange">待审核</Tag> },
    { title: '加入时间', dataIndex: 'joined_at', render: (v: string) => new Date(v).toLocaleDateString('zh-CN') },
    { title: '操作', render: (_: any, r: any) => r.status === 'pending' ? (
      <Space>
        <Button size="small" type="primary" onClick={() => handleReview(r.id, 'approve')}>通过</Button>
        <Button size="small" danger onClick={() => handleReview(r.id, 'reject')}>拒绝</Button>
      </Space>
    ) : null },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>我的战队</h2>
        <Space>
          <Button icon={<UserAddOutlined />} onClick={() => setJoinModal(true)}>加入战队</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>创建战队</Button>
        </Space>
      </div>

      {teams.length === 0 ? (
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#999' }}>还没有加入任何战队</p>
          <Button type="primary" onClick={() => setCreateModal(true)}>创建第一个战队</Button>
        </Card>
      ) : (
        teams.map((team) => (
          <Card key={team.id} style={{ borderRadius: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 16 }}>{team.name}</strong>
                {team.tag && <Tag style={{ marginLeft: 8 }}>{team.tag}</Tag>}
                <span style={{ color: '#999', marginLeft: 8 }}>{team.member_count} 名成员</span>
              </div>
              <Space>
                <Button size="small" icon={<CopyOutlined />} onClick={() => handleInvite(team.id)}>邀请</Button>
                <Button size="small" onClick={() => { setSelectedTeam(team); loadMembers(team.id); }}>管理成员</Button>
              </Space>
            </div>
            {inviteCode && inviteCode.startsWith(team.id) && (
              <div style={{ marginTop: 8, padding: 8, background: '#f0f5ff', borderRadius: 6 }}>
                邀请码：<strong>{inviteCode}</strong>
                <Button size="small" style={{ marginLeft: 8 }} onClick={() => { navigator.clipboard.writeText(inviteCode); message.success('已复制'); }}>复制</Button>
              </div>
            )}
          </Card>
        ))
      )}

      {selectedTeam && (
        <Modal title={`${selectedTeam.name} - 成员管理`} open={!!selectedTeam} onCancel={() => setSelectedTeam(null)} footer={null} width={600}>
          <Table dataSource={members} columns={memberColumns} rowKey="id" pagination={false} size="small" />
        </Modal>
      )}

      <Modal title="创建战队" open={createModal} onCancel={() => setCreateModal(false)} footer={null}>
        <Form onFinish={handleCreate} layout="vertical">
          <Form.Item name="name" label="战队名称" rules={[{ required: true, max: 50 }]}>
            <Input placeholder="给你的战队起个名字" />
          </Form.Item>
          <Form.Item name="tag" label="战队标签" rules={[{ max: 20 }]}>
            <Input placeholder="简短的战队标签，如 T1" />
          </Form.Item>
          <Form.Item name="description" label="战队简介">
            <Input.TextArea rows={3} placeholder="介绍一下你的战队" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>创建</Button>
        </Form>
      </Modal>

      <Modal title="加入战队" open={joinModal} onCancel={() => setJoinModal(false)} footer={null}>
        <Form onFinish={handleJoin} layout="vertical">
          <Form.Item name="code" label="邀请码" rules={[{ required: true }]}>
            <Input placeholder="输入队长分享的邀请码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>申请加入</Button>
        </Form>
      </Modal>
    </div>
  );
}
