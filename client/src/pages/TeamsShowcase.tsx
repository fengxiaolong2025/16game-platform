import { useEffect, useState } from 'react';
import { Card, Row, Col, Tag, Typography, Empty, Spin, Avatar, Space, Modal, Image, Descriptions } from 'antd';
import { TeamOutlined, UserOutlined, CrownOutlined, PictureOutlined } from '@ant-design/icons';
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
                style={{ borderRadius: 12, overflow: 'hidden', height: '100%' }}
                cover={
                  <div style={{
                    height: 160,
                    background: team.logo
                      ? `url(${team.logo}) center/cover`
                      : 'linear-gradient(135deg, #1677ff22, #1677ff44)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {!team.logo && <TeamOutlined style={{ fontSize: 50, color: '#1677ff' }} />}
                  </div>
                }
                onClick={() => setDetailModal({ open: true, team })}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <Space>
                    <Avatar size={40} icon={<TeamOutlined />} src={team.logo} style={{ backgroundColor: '#1677ff' }} />
                    <div>
                      <Text strong style={{ fontSize: 16 }}>{team.name}</Text>
                      {team.tag && <Tag color="blue" style={{ marginLeft: 8 }}>{team.tag}</Tag>}
                    </div>
                  </Space>
                  {team.is_featured && <Tag color="gold">精选</Tag>}
                </div>

                {team.description && (
                  <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ marginBottom: 12 }}>
                    {team.description}
                  </Paragraph>
                )}

                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary"><UserOutlined /> {team.member_count || 0} 名成员</Text>
                  <Text type="secondary"><CrownOutlined /> 队长: {team.captain?.nickname || '未知'}</Text>
                  {team.achievement && <Tag color="orange">{team.achievement}</Tag>}
                </Space>

                {team.photos?.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 4 }}>
                    <PictureOutlined style={{ color: '#999' }} />
                    <Text type="secondary">{team.photos.length} 张照片</Text>
                  </div>
                )}
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
