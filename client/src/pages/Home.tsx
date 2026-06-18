import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Tag, Typography, Input, Select, Space, Empty, Spin } from 'antd';
import { SearchOutlined, TrophyOutlined, UserOutlined, CalendarOutlined } from '@ant-design/icons';
import { tournamentApi } from '../api';

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
  const navigate = useNavigate();

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
                style={{ borderRadius: 12, overflow: 'hidden', height: '100%' }}
                cover={
                  <div style={{ height: 120, background: `linear-gradient(135deg, ${gameColors[t.game] || '#1677ff'}22, ${gameColors[t.game] || '#1677ff'}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrophyOutlined style={{ fontSize: 40, color: gameColors[t.game] || '#1677ff' }} />
                  </div>
                }
              >
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
    </div>
  );
}
