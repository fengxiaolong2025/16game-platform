import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Tag, Typography, Input, Select, Space, Empty, Spin, Button, Modal, Form, message, Popconfirm } from 'antd';
import { SearchOutlined, TrophyOutlined, UserOutlined, CalendarOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { tournamentApi } from '../api';
import { useAuthStore } from '../store';

const { Title, Text } = Typography;

const gameColors: Record<string, string> = {
  '英雄联盟': '#C89B3C',
  '王者荣耀': '#3B9EFF',
  'CS2': '#DE9B35',
  'Valorant': '#FF4655',
  'DOTA2': '#E74C3C',
};

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  registration: { label: '报名中', color: 'green' },
  bracket: { label: '对阵编排', color: 'blue' },
  in_progress: { label: '进行中', color: 'orange' },
  completed: { label: '已结束', color: 'default' },
};

export function HomePage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ game: '', status: '' });
  const [editModal, setEditModal] = useState<{ open: boolean; tournament: any }>({ open: false, tournament: null });
  const [editForm] = Form.useForm();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async (params?: any) => {
    setLoading(true);
    try {
      const res = await tournamentApi.list(params);
      setTournaments(res.data.items || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleSearch = (value: string) => {
    loadTournaments({ game: filter.game, status: filter.status, search: value });
  };

  const handleEdit = (t: any, e: React.MouseEvent) => {
    e.stopPropagation();
    editForm.setFieldsValue({ title: t.title, organizer_name: t.organizer_name, rules: t.rules });
    setEditModal({ open: true, tournament: t });
  };

  const handleEditSave = async () => {
    try {
      const values = await editForm.validateFields();
      await tournamentApi.update(editModal.tournament.id, values);
      message.success('赛事已更新');
      setEditModal({ open: false, tournament: null });
      loadTournaments();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || '更新失败');
    }
  };

  const handleDelete = async (t: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await tournamentApi.delete(t.id);
      message.success('赛事已删除');
      loadTournaments();
    } catch (err: any) {
      message.error(err.response?.data?.message || '删除失败');
    }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 8 }}>🏆 电竞赛事广场</Title>
        <Text type="secondary">发现精彩赛事，参与竞技对决</Text>
      </div>

      <div style={{ marginBottom: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="搜索赛事..."
          allowClear
          onSearch={handleSearch}
          style={{ maxWidth: 400 }}
          prefix={<SearchOutlined />}
        />
        <Select
          placeholder="游戏筛选"
          allowClear
          style={{ width: 140 }}
          value={filter.game || undefined}
          onChange={(v) => { setFilter({ ...filter, game: v || '' }); loadTournaments({ game: v, status: filter.status }); }}
          options={[
            { label: '英雄联盟', value: '英雄联盟' },
            { label: '王者荣耀', value: '王者荣耀' },
            { label: 'CS2', value: 'CS2' },
            { label: 'Valorant', value: 'Valorant' },
            { label: 'DOTA2', value: 'DOTA2' },
          ]}
        />
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 120 }}
          value={filter.status || undefined}
          onChange={(v) => { setFilter({ ...filter, status: v || '' }); loadTournaments({ game: filter.game, status: v }); }}
          options={Object.entries(statusMap).map(([k, v]) => ({ label: v.label, value: k }))}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : tournaments.length === 0 ? (
        <Empty description="暂无赛事，快来创建第一场吧！" />
      ) : (
        <Row gutter={[16, 16]}>
          {tournaments.map((t) => (
            <Col xs={24} sm={12} lg={8} key={t.id}>
              <Card
                hoverable
                onClick={() => navigate(`/t/${t.id}`)}
                style={{ borderRadius: 12, overflow: 'hidden', height: '100%', position: 'relative' }}
                cover={
                  <div style={{ height: 120, background: `linear-gradient(135deg, ${gameColors[t.game] || '#1677ff'}22, ${gameColors[t.game] || '#1677ff'}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrophyOutlined style={{ fontSize: 40, color: gameColors[t.game] || '#1677ff' }} />
                  </div>
                }
              >
                {user?.id === t.creator_id && (
                  <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', gap: 4 }}>
                    <Button size="small" type="primary" ghost icon={<EditOutlined />} onClick={(e) => handleEdit(t, e)} />
                    <Popconfirm title="确定删除此赛事？" onConfirm={(e) => handleDelete(t, e as any)} onCancel={(e) => e?.stopPropagation()}>
                      <Button size="small" danger ghost icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                    </Popconfirm>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 16 }}>{t.title}</Text>
                  <Tag color={statusMap[t.status]?.color}>{statusMap[t.status]?.label || t.status}</Tag>
                </div>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Tag color={gameColors[t.game]}>{t.game}</Tag>
                  <Text type="secondary"><UserOutlined /> {t.format === 'single_elimination' ? '单败淘汰' : t.format === 'double_elimination' ? '双败淘汰' : '循环赛'}</Text>
                  <Text type="secondary"><CalendarOutlined /> {t.start_at ? new Date(t.start_at).toLocaleDateString('zh-CN') : '待定'}</Text>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal title="编辑赛事" open={editModal.open} onOk={handleEditSave} onCancel={() => setEditModal({ open: false, tournament: null })} okText="保存" cancelText="取消">
        <Form form={editForm} layout="vertical">
          <Form.Item name="title" label="赛事名称" rules={[{ required: true, message: '请输入赛事名称' }]}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="organizer_name" label="主办方名称">
            <Input />
          </Form.Item>
          <Form.Item name="rules" label="赛事规则">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
