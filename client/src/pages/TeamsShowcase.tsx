import { useEffect, useState } from 'react';
import { Card, Row, Col, Tag, Typography, Empty, Spin, Modal, Image, Descriptions, List } from 'antd';
import { TeamOutlined, UserOutlined, CrownOutlined } from '@ant-design/icons';
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
        <Row gutter={[20, 20]} className="showcase-grid">
          {teams.map((team) => (
            <Col xs={24} sm={12} lg={8} key={team.id}>
              <Card
                hoverable
                style={{ borderRadius: 12, overflow: 'hidden', height: '100%', padding: 0 }}
                bodyStyle={{ padding: 0 }}
                onClick={() => setDetailModal({ open: true, team })}
              >
                {/* 照片区域 - 固定比例，裁剪底部 */}
                {team.photos?.length > 0 ? (
                  <div style={{
                    width: '100%',
                    aspectRatio: '4 / 3',
                    overflow: 'hidden',
                    position: 'relative',
                    background: '#f0f0f0',
                  }}>
                    <img
                      src={team.photos[0]}
                      alt={team.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        objectPosition: 'top center',
                        display: 'block',
                      }}
                    />
                    {team.photos.length > 1 && (
                      <div style={{
                        position: 'absolute', bottom: 8, right: 8,
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        padding: '2px 10px', borderRadius: 12, fontSize: 12,
                      }}>
                        +{team.photos.length - 1}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    width: '100%', aspectRatio: '4 / 3',
                    background: 'linear-gradient(135deg, #e6f4ff, #d6e4ff)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <TeamOutlined style={{ fontSize: 56, color: '#91caff' }} />
                  </div>
                )}

                {/* 文字信息区域 */}
                <div style={{ padding: '14px 16px 16px' }}>
                  {/* 战队名 + 标签 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 16, lineHeight: 1.2 }}>{team.name}</Text>
                    {team.tag && <Tag color="blue" style={{ margin: 0, borderRadius: 4, fontSize: 12 }}>{team.tag}</Tag>}
                    {team.is_featured && <Tag color="gold" style={{ margin: 0, borderRadius: 4, fontSize: 12 }}>精选</Tag>}
                  </div>

                  {/* 成就 */}
                  {team.achievement && (
                    <div style={{ marginBottom: 8 }}>
                      <Tag color="orange" style={{ borderRadius: 4, fontSize: 12 }}>{team.achievement}</Tag>
                    </div>
                  )}

                  {/* 简介 */}
                  {team.description && (
                    <Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{ marginBottom: 10, fontSize: 13, color: '#666', lineHeight: 1.6 }}
                    >
                      {team.description}
                    </Paragraph>
                  )}

                  {/* 成员数 + 队长 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <UserOutlined /> {team.member_count || 0} 名成员
                    </Text>
                    {team.captain?.nickname && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <CrownOutlined /> {team.captain.nickname}
                      </Text>
                    )}
                  </div>

                  {/* 队员ID预览 */}
                  {team.members?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {team.members.slice(0, 4).map((m: any) => (
                        <Tag key={m.id} style={{ fontSize: 11, margin: 0, borderRadius: 4 }}>
                          {m.user?.game_ids || m.user?.nickname || '-'}
                        </Tag>
                      ))}
                      {team.members.length > 4 && (
                        <Text type="secondary" style={{ fontSize: 11 }}>等{team.members.length}人</Text>
                      )}
                    </div>
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
            {detailModal.team.members?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>队员列表</Text>
                <List
                  size="small"
                  dataSource={detailModal.team.members}
                  style={{ marginTop: 8 }}
                  renderItem={(m: any) => (
                    <List.Item style={{ padding: '6px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tag color={m.role === 'captain' ? 'gold' : 'default'} style={{ margin: 0, fontSize: 11 }}>
                          {m.role === 'captain' ? '队长' : '队员'}
                        </Tag>
                        <Text>{m.user?.nickname || '-'}</Text>
                        {m.user?.game_ids && (
                          <Text type="secondary" style={{ fontSize: 12 }}>({m.user.game_ids})</Text>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
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
