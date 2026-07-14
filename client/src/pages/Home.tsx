import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Tag, Typography, Input, Select, Space, Empty, Spin, Button, Modal, Form, message, Popconfirm, DatePicker, Radio, InputNumber, Image } from 'antd';
import { SearchOutlined, TrophyOutlined, UserOutlined, CalendarOutlined, EditOutlined, DeleteOutlined, SoundOutlined, PushpinOutlined } from '@ant-design/icons';
import { tournamentApi, announcementApi } from '../api';
import { useAuthStore } from '../store';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const gameColors: Record<string, string> = {
  '英雄联盟': '#C89B3C',
  '王者荣耀': '#3B9EFF',
  'CS2': '#DE9B35',
  'Valorant': '#FF4655',
  'DOTA2': '#E74C3C',
  'DOTA1': '#8E44AD',
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
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    loadTournaments();
    loadAnnouncements();
    if (token && !user) fetchUser();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const res = await announcementApi.list({ limit: 5 });
      setAnnouncements(res.data.items || []);
    } catch { /* ignore */ }
  };

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
    editForm.setFieldsValue({
      title: t.title,
      game: t.game,
      format: t.format,
      participant_type: t.participant_type,
      max_participants: t.max_participants,
      team_size: t.team_size,
      organizer_name: t.organizer_name,
      rules: t.rules,
      is_public: t.is_public,
      time: t.registration_start_at && t.registration_end_at ? [dayjs(t.registration_start_at), dayjs(t.registration_end_at)] : undefined,
      match_time: t.start_at && t.end_at ? [dayjs(t.start_at), dayjs(t.end_at)] : undefined,
    });
    setEditModal({ open: true, tournament: t });
  };

  const handleEditSave = async () => {
    try {
      const values = await editForm.validateFields();
      const data: any = {
        title: values.title,
        game: values.game,
        format: values.format,
        participant_type: values.participant_type,
        max_participants: values.max_participants,
        team_size: values.team_size || undefined,
        organizer_name: values.organizer_name || undefined,
        rules: values.rules || undefined,
        is_public: values.is_public !== false,
        registration_start_at: values.time?.[0]?.toISOString(),
        registration_end_at: values.time?.[1]?.toISOString(),
        start_at: values.match_time?.[0]?.toISOString() || undefined,
        end_at: values.match_time?.[1]?.toISOString() || undefined,
      };
      await tournamentApi.update(editModal.tournament.id, data);
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

      {announcements.length > 0 && (
        <Card
          style={{ marginBottom: 24, borderRadius: 12, background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f4ff 100%)', border: '1px solid #d6e4ff' }}
          bodyStyle={{ padding: '16px 20px' }}
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space>
              <SoundOutlined style={{ color: '#1677ff', fontSize: 16 }} />
              <Text strong style={{ color: '#1677ff' }}>平台公告</Text>
            </Space>
            {announcements.map((a: any) => (
              <div key={a.id} style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e8e8e8' }}>
                <Space style={{ marginBottom: 4 }}>
                  {a.is_pinned && <Tag color="orange" icon={<PushpinOutlined />}>置顶</Tag>}
                  <Text strong>{a.title}</Text>
                </Space>
                <div style={{ color: '#666', whiteSpace: 'pre-wrap', fontSize: 13 }}>{a.content}</div>
                {a.images?.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {a.images.map((url: string, i: number) => (
                      <Image key={i} src={url} width={100} height={100} style={{ objectFit: 'cover', borderRadius: 4 }} />
                    ))}
                  </div>
                )}
                <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                  {a.author?.nickname || '管理员'} · {new Date(a.created_at).toLocaleString('zh-CN')}
                </Text>
              </div>
            ))}
          </Space>
        </Card>
      )}

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
            { label: 'DOTA1', value: 'DOTA1' },
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

      <Modal title="编辑赛事" open={editModal.open} onOk={handleEditSave} onCancel={() => setEditModal({ open: false, tournament: null })} okText="保存" cancelText="取消" width={600}>
        <Form form={editForm} layout="vertical">
          <Form.Item name="title" label="赛事名称" rules={[{ required: true, message: '请输入赛事名称' }]}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="game" label="游戏项目" rules={[{ required: true }]}>
            <Select options={[
              { label: '英雄联盟', value: '英雄联盟' },
              { label: '王者荣耀', value: '王者荣耀' },
              { label: 'CS2', value: 'CS2' },
              { label: 'Valorant', value: 'Valorant' },
              { label: 'DOTA2', value: 'DOTA2' },
            { label: 'DOTA1', value: 'DOTA1' },
            ]} />
          </Form.Item>
          <Form.Item name="format" label="赛制" rules={[{ required: true }]}>
            <Select options={[
              { label: '单败淘汰', value: 'single_elimination' },
              { label: '双败淘汰', value: 'double_elimination' },
              { label: '循环赛', value: 'round_robin' },
            ]} />
          </Form.Item>
          <Form.Item name="participant_type" label="参赛类型">
            <Radio.Group options={[{ label: '个人赛', value: 'individual' }, { label: '团队赛', value: 'team' }]} />
          </Form.Item>
          <Form.Item name="max_participants" label="最大参赛数量" rules={[{ required: true }]}>
            <Select options={[2, 4, 8, 16, 32, 64].map((n) => ({ label: `${n}`, value: n }))} />
          </Form.Item>
          <Form.Item name="team_size" label="每队人数（团队赛）">
            <InputNumber min={2} max={10} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="time" label="报名时间">
            <DatePicker.RangePicker showTime style={{ width: '100%' }} placeholder={['报名开始', '报名截止']} />
          </Form.Item>
          <Form.Item name="match_time" label="比赛时间">
            <DatePicker.RangePicker showTime style={{ width: '100%' }} placeholder={['比赛开始', '预计结束']} />
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
