import { useEffect, useState } from 'react';
import { Card, Row, Col, Tag, Typography, Empty, Spin, Space, Image } from 'antd';
import { TrophyOutlined, CrownOutlined, StarOutlined, SafetyCertificateOutlined, TeamOutlined } from '@ant-design/icons';
import { honorRollApi } from '../api';

const { Title, Text, Paragraph } = Typography;

const awardTypeMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  champion: { label: '冠军', color: '#faad14', icon: <CrownOutlined /> },
  runner_up: { label: '亚军', color: '#d9d9d9', icon: <TrophyOutlined /> },
  third_place: { label: '季军', color: '#d48806', icon: <StarOutlined /> },
  mvp: { label: 'MVP', color: '#ff4d4f', icon: <SafetyCertificateOutlined /> },
  best_team: { label: '最佳战队', color: '#1677ff', icon: <TeamOutlined /> },
};

export function HonorRollPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await honorRollApi.list();
      setRecords(res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  // Group by game
  const grouped = records.reduce((acc: Record<string, any[]>, r: any) => {
    const game = r.game || '其他';
    if (!acc[game]) acc[game] = [];
    acc[game].push(r);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 8 }}><TrophyOutlined /> 光荣榜</Title>
        <Text type="secondary">铭记荣耀时刻，致敬每一位优秀选手和战队</Text>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : records.length === 0 ? (
        <Empty description="暂无荣誉记录" />
      ) : (
        <Space direction="vertical" size={32} style={{ width: '100%' }}>
          {Object.entries(grouped).map(([game, items]) => (
            <Card key={game} title={<Space><TrophyOutlined />{game}</Space>} style={{ borderRadius: 12 }}>
              <Row gutter={[20, 20]}>
                {(items as any[]).map((record) => {
                  const awardInfo = awardTypeMap[record.award_type] || { label: record.award_type, color: '#999', icon: <StarOutlined /> };
                  return (
                    <Col xs={24} sm={12} lg={8} key={record.id}>
                      <Card
                        size="small"
                        style={{
                          borderRadius: 10,
                          border: `2px solid ${awardInfo.color}22`,
                          background: `linear-gradient(135deg, ${awardInfo.color}08, ${awardInfo.color}15)`,
                          height: '100%',
                        }}
                      >
                        <div style={{ textAlign: 'center', marginBottom: 12 }}>
                          <div style={{
                            width: 56, height: 56, borderRadius: '50%',
                            background: `${awardInfo.color}20`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 8px', fontSize: 24, color: awardInfo.color,
                          }}>
                            {awardInfo.icon}
                          </div>
                          <Tag color={awardInfo.color} style={{ fontSize: 13 }}>{awardInfo.label}</Tag>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <Text strong style={{ fontSize: 16, display: 'block' }}>{record.winner_name}</Text>
                          {record.team_name && <Text type="secondary" style={{ fontSize: 13 }}>{record.team_name}</Text>}
                        </div>

                        <Paragraph
                          ellipsis={{ rows: 2 }}
                          style={{ textAlign: 'center', margin: '8px 0', color: '#666', fontSize: 13 }}
                        >
                          {record.title}
                        </Paragraph>

                        {record.tournament_name && (
                          <div style={{ textAlign: 'center', marginBottom: 4 }}>
                            <Tag>{record.tournament_name}</Tag>
                          </div>
                        )}

                        {record.award_date && (
                          <Text type="secondary" style={{ display: 'block', textAlign: 'center', fontSize: 12 }}>
                            {record.award_date}
                          </Text>
                        )}

                        {record.photo && (
                          <div style={{ marginTop: 8, textAlign: 'center' }}>
                            <Image src={record.photo} width={100} height={80} style={{ objectFit: 'cover', borderRadius: 6 }} />
                          </div>
                        )}
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </Card>
          ))}
        </Space>
      )}
    </div>
  );
}
