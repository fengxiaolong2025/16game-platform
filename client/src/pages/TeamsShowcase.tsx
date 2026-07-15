import { useEffect, useState } from 'react';
import { Card, Row, Col, Tag, Typography, Empty, Spin, Modal, Image, Descriptions } from 'antd';
import { TeamOutlined, UserOutlined } from '@ant-design/icons';
import { teamApi } from '../api';

const { Title, Text, Paragraph } = Typography;

export function TeamsShowcasePage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState<{ open: boolean; team: any }>({ open: false, team: null });

  useEffect(() => { loadTeams(); }, []);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const res = await teamApi.showcase();
      setTeams(res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 8 }}><TeamOutlined /> 战队展示</Title>
        <Text type="secondary">展示平台优秀战队风采</Text>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : teams.length === 0 ? (
        <Empty description="暂无战队展示" />
      ) : (
        <Row gutter={[20, 20]}>
          {teams.map((team) => (
            <Col xs={24} sm={12} lg={8} key={team.id}>
              <Card
                hoverable
                style={{ borderRadius: 12, overflow: 'hidden', height: '100%', padding: 0 }}
                bodyStyle={{ padding: 0 }}
                onClick={() => setDetailModal({ open: true, team })}
              >
                {/* 照片区域 - 主要展示 */}
                {team.photos?.length > 0 ? (
                  <div style={{ width: '100%', height: 220, overflow: 'hidden', position: 'relative' }}>
                    <Image
                      src={team.photos[0]}
                      width="100%"
                      height={220}
                      style={{ objectFit: 'cover', display: 'block' }}
                      preview={false}
                    />
                    {team.photos.length > 1 && (
                      <div style={{
                        position: 'absolute', bottom: 8, right: 8,
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        padding: '2px 8px', borderRadius: 10, fontSize: 12,
                      }}>
                        +{team.photos.length - 1}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    width: '100%', height: 220,
                    background: 'linear-gradient(135deg, #1677ff22, #1677ff44)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <TeamOutlined style={{ fontSize: 60, color: '#1677ff' }} />
                  </div>
                )}

                {/* 文字信息区域 */}
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Text strong style={{ fontSize: 16 }}>{team.name}</Text>
                    {team.tag && <Tag color="blue">{team.tag}</Tag>}
                    {team.is_featured && <Tag color="gold">精选</Tag>}
                  </div>

                  <div style={{ marginBottom: 6 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      <UserOutlined /> {team.member_count || 0} 名成员
                    </Text>
                    {team.captain?.nickname && (
                      <Text type="secondary" style={{ fontSize: 13, marginLeft: 12 }}>
                        队长: {team.captain.nickname}
                      </Text>
                    )}
                  </div>

                  {team.achievement && (
                    <div style={{ marginBottom: 6 }}>
                      <Tag color="orange">{team.achievement}</Tag>
                    </div>
                  )}

                  {team.description && (
                    <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>
                      {team.description}
                    </Paragraph>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={detailModal.team?.name}
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, team: null })}
        footer={null}
        width={640}
      >
        {detailModal.team && (
          <div>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="战队名称">{detailModal.team.name}</Descriptions.Item>
              {detailModal.team.tag && <Descriptions.Item label="战队标签">{detailModal.team.tag}</Descriptions.Item>}
              <Descriptions.Item label="队长">{detailModal.team.captain?.nickname || '未知'}</Descriptions.Item>
              <Descriptions.Item label="成员数">{detailModal.team.member_count || 0} 人</Descriptions.Item>
              {detailModal.team.achievement && <Descriptions.Item label="成就">{detailModal.team.achievement}</Descriptions.Item>}
            </Descriptions>
            {detailModal.team.description && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>战队介绍</Text>
                <Paragraph style={{ marginTop: 4 }}>{detailModal.team.description}</Paragraph>
              </div>
            )}
            {detailModal.team.photos?.length > 0 && (
              <div>
                <Text strong>战队照片</Text>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {detailModal.team.photos.map((url: string, i: number) => (
                    <Image key={i} src={url} width={120} height={120} style={{ objectFit: 'cover', borderRadius: 8 }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
