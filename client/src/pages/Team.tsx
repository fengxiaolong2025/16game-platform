import { useEffect, useState } from 'react';
import { Card, Button, Table, Tag, Modal, Form, Input, message, Space, Popconfirm, Tabs, Upload, Image } from 'antd';
import { PlusOutlined, CopyOutlined, UserAddOutlined, DeleteOutlined, EditOutlined, UploadOutlined } from '@ant-design/icons';
import { teamApi } from '../api';
import { useAuthStore } from '../store';

export function TeamPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<{ open: boolean; team: any }>({ open: false, team: null });
  const [joinModal, setJoinModal] = useState(false);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const user = useAuthStore((s) => s.user);

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

  const handleUploadPhoto = async (file: any) => {
    if (photos.length >= 6) {
      message.warning('最多上传6张照片');
      return false;
    }
    setUploading(true);
    try {
      const res = await teamApi.uploadPhotos([file]);
      setPhotos([...photos, ...(res.data.urls || [])]);
      message.success('上传成功');
    } catch (err: any) {
      message.error(err.response?.data?.message || '上传失败');
    } finally { setUploading(false); }
    return false;
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleCreate = async (values: any) => {
    setLoading(true);
    try {
      await teamApi.create({ ...values, photos });
      message.success('战队创建成功');
      setCreateModal(false);
      setPhotos([]);
      createForm.resetFields();
      loadTeams();
    } catch (err: any) { message.error(err.response?.data?.message || '创建失败'); }
    finally { setLoading(false); }
  };

  const openEditModal = (team: any) => {
    editForm.setFieldsValue({
      name: team.name,
      tag: team.tag,
      description: team.description,
      achievement: team.achievement,
    });
    setPhotos(team.photos || []);
    setEditModal({ open: true, team });
  };

  const handleEdit = async (values: any) => {
    setLoading(true);
    try {
      await teamApi.update(editModal.team.id, { ...values, photos });
      message.success('战队信息已更新');
      setEditModal({ open: false, team: null });
      setPhotos([]);
      loadTeams();
    } catch (err: any) { message.error(err.response?.data?.message || '更新失败'); }
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
      message.success('加入申请已提交，等待队长审核');
      setJoinModal(false);
    } catch (err: any) { message.error(err.response?.data?.message || '加入失败'); }
    finally { setLoading(false); }
  };

  const openJoinModal = async () => {
    try {
      const res = await teamApi.allTeams();
      setAllTeams(res.data || []);
    } catch { /* ignore */ }
    setJoinModal(true);
  };

  const handleJoinById = async (teamId: string, teamName: string) => {
    try {
      await teamApi.joinById(teamId);
      message.success(`已申请加入「${teamName}」，等待队长审核`);
      setJoinModal(false);
      loadTeams();
    } catch (err: any) { message.error(err.response?.data?.message || '加入失败'); }
  };

  const handleReview = async (memberId: string, action: 'approve' | 'reject') => {
    if (!selectedTeam) return;
    try {
      await teamApi.reviewMember(selectedTeam.id, memberId, action);
      message.success(action === 'approve' ? '已通过' : '已拒绝');
      loadMembers(selectedTeam.id);
    } catch (err: any) { message.error('操作失败'); }
  };

  const handleLeaveTeam = async (teamId: string) => {
    try {
      await teamApi.leaveTeam(teamId);
      message.success('已退出战队');
      loadTeams();
    } catch (err: any) { message.error(err.response?.data?.message || '退出失败'); }
  };

  const handleDisbandTeam = async (teamId: string) => {
    try {
      await teamApi.disbandTeam(teamId);
      message.success('战队已解散');
      loadTeams();
    } catch (err: any) { message.error(err.response?.data?.message || '解散失败'); }
  };

  const memberColumns = [
    { title: '角色', dataIndex: 'role', render: (r: string) => r === 'captain' ? <Tag color="gold">队长</Tag> : <Tag>队员</Tag> },
    { title: '昵称', render: (_: any, r: any) => r.user?.nickname || '-' },
    { title: '游戏ID', render: (_: any, r: any) => r.user?.game_ids || '-' },
    { title: '状态', dataIndex: 'status', render: (s: string) => s === 'approved' ? <Tag color="green">已加入</Tag> : <Tag color="orange">待审核</Tag> },
    { title: '加入时间', dataIndex: 'joined_at', render: (v: string) => new Date(v).toLocaleDateString('zh-CN') },
    { title: '操作', render: (_: any, r: any) => {
      if (r.status === 'pending') {
        return (
          <Space>
            <Button size="small" type="primary" onClick={() => handleReview(r.id, 'approve')}>通过</Button>
            <Button size="small" danger onClick={() => handleReview(r.id, 'reject')}>拒绝</Button>
          </Space>
        );
      }
      if (r.status === 'approved' && r.role !== 'captain' && selectedTeam?.captain_id === user?.id) {
        return (
          <Popconfirm title="确定踢出该成员？" onConfirm={async () => {
            await teamApi.removeMember(selectedTeam.id, r.id);
            message.success('已踢出');
            loadMembers(selectedTeam.id);
          }}>
            <Button size="small" danger>踢出</Button>
          </Popconfirm>
        );
      }
      return null;
    } },
  ];

  // Shared photo upload section
  const PhotoUploadSection = () => (
    <Form.Item label="战队照片（最多6张）">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {photos.map((url, index) => (
          <div key={index} style={{ position: 'relative' }}>
            <Image src={url} width={100} height={100} style={{ objectFit: 'cover', borderRadius: 8 }} />
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              style={{ position: 'absolute', top: -8, right: -8, minWidth: 20, height: 20, padding: 0, borderRadius: '50%' }}
              onClick={() => removePhoto(index)}
            />
          </div>
        ))}
      </div>
      {photos.length < 6 && (
        <Upload beforeUpload={handleUploadPhoto} showUploadList={false} accept="image/*">
          <Button icon={<UploadOutlined />} loading={uploading}>上传照片</Button>
        </Upload>
      )}
    </Form.Item>
  );

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>我的战队</h2>
        <Space>
          <Button icon={<UserAddOutlined />} onClick={openJoinModal}>加入战队</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setPhotos([]); setCreateModal(true); }}>创建战队</Button>
        </Space>
      </div>

      {teams.length === 0 ? (
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#999' }}>还没有加入任何战队</p>
          <Button type="primary" onClick={() => { setPhotos([]); setCreateModal(true); }}>创建第一个战队</Button>
        </Card>
      ) : (
        teams.map((team) => (
          <Card key={team.id} style={{ borderRadius: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 16 }}>{team.name}</strong>
                {team.tag && <Tag style={{ marginLeft: 8 }}>{team.tag}</Tag>}
                <span style={{ color: '#999', marginLeft: 8 }}>{team.member_count} 名成员</span>
                {team.achievement && <Tag color="orange" style={{ marginLeft: 8 }}>{team.achievement}</Tag>}
              </div>
              <Space>
                {team.captain_id === user?.id && (
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(team)}>编辑</Button>
                )}
                <Button size="small" icon={<CopyOutlined />} onClick={() => handleInvite(team.id)}>邀请</Button>
                <Button size="small" onClick={() => { setSelectedTeam(team); loadMembers(team.id); }}>管理成员</Button>
                {team.captain_id === user?.id ? (
                  <Popconfirm title="确定解散战队？所有成员将被移除，此操作不可撤销。" onConfirm={() => handleDisbandTeam(team.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />}>解散</Button>
                  </Popconfirm>
                ) : (
                  <Popconfirm title="确定退出战队？" onConfirm={() => handleLeaveTeam(team.id)}>
                    <Button size="small" danger>退出</Button>
                  </Popconfirm>
                )}
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

      <Modal title="创建战队" open={createModal} onCancel={() => { setCreateModal(false); setPhotos([]); }} footer={null} width={560}>
        <Form form={createForm} onFinish={handleCreate} layout="vertical">
          <Form.Item name="name" label="战队名称" rules={[{ required: true, max: 50 }]}>
            <Input placeholder="给你的战队起个名字" />
          </Form.Item>
          <Form.Item name="tag" label="战队标签" rules={[{ max: 20 }]}>
            <Input placeholder="简短的战队标签，如 T1" />
          </Form.Item>
          <Form.Item name="description" label="战队简介">
            <Input.TextArea rows={3} placeholder="介绍一下你的战队" />
          </Form.Item>
          <Form.Item name="achievement" label="战队成就">
            <Input placeholder="如：2026春季赛冠军" />
          </Form.Item>
          <PhotoUploadSection />
          <Button type="primary" htmlType="submit" loading={loading} block>创建</Button>
        </Form>
      </Modal>

      <Modal title="编辑战队" open={editModal.open} onCancel={() => { setEditModal({ open: false, team: null }); setPhotos([]); }} footer={null} width={560}>
        <Form form={editForm} onFinish={handleEdit} layout="vertical">
          <Form.Item name="name" label="战队名称" rules={[{ required: true, max: 50 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="tag" label="战队标签" rules={[{ max: 20 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="战队简介">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="achievement" label="战队成就">
            <Input placeholder="如：2026春季赛冠军" />
          </Form.Item>
          <PhotoUploadSection />
          <Button type="primary" htmlType="submit" loading={loading} block>保存</Button>
        </Form>
      </Modal>

      <Modal title="加入战队" open={joinModal} onCancel={() => setJoinModal(false)} footer={null} width={520}>
        <Tabs items={[
          {
            key: 'list',
            label: '浏览战队',
            children: (
              <div>
                {allTeams.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#999', padding: 20 }}>暂无战队，快去创建第一个吧！</p>
                ) : (
                  allTeams.map((team) => (
                    <Card key={team.id} size="small" style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{team.name}</strong>
                          {team.tag && <Tag style={{ marginLeft: 8 }}>{team.tag}</Tag>}
                          <span style={{ color: '#999', marginLeft: 8, fontSize: 13 }}>{team.member_count}人</span>
                        </div>
                        <Button size="small" type="primary" onClick={() => handleJoinById(team.id, team.name)}>申请加入</Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            ),
          },
          {
            key: 'code',
            label: '邀请码加入',
            children: (
              <Form onFinish={handleJoin} layout="vertical">
                <Form.Item name="code" label="邀请码" rules={[{ required: true }]}>
                  <Input placeholder="输入队长分享的邀请码" />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>申请加入</Button>
              </Form>
            ),
          },
        ]} />
      </Modal>
    </div>
  );
}
