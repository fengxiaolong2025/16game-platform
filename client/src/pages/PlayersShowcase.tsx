import { useEffect, useState } from 'react';
import { Card, Row, Col, Tag, Typography, Empty, Spin, Avatar, Modal, Image, Descriptions } from 'antd';
import { UserOutlined, PictureOutlined } from '@ant-design/icons';
import { playerApi } from '../api';

const { Title, Text, Paragraph } = Typography;

export function PlayersShowcasePage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState<{ open: boolean; player: any }>({ open: false, player: null });

  useEffect(() => { loadPlayers(); }, []);

  const loadPlayers = async () => {
    setLoading(true);
    try {
      const res = await playerApi.list();
      setPlayers(res.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 8 }}><UserOutlined /> 选手展示</Title>
        <Text type="secondary">展示平台优秀选手风采</Text>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : players.length === 0 ? (
        <Empty description="暂无选手展示" />
      ) : (
        <Row gutter={[20, 20]}>
          {players.map((player) => (
            <Col xs={24} sm={12} lg={8} key={player.id}>
              <Card
                hoverable
                style={{ borderRadius: 12, overflow: 'hidden', height: '100%' }}
                onClick={() => setDetailModal({ open: true, player })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <Avatar size={64} icon={<UserOutlined />} src={player.avatar} style={{ backgroundColor: '#1677ff', flexShrink: 0 }} />
                  <div>
                    <Text strong style={{ fontSize: 18 }}>{player.nickname}</Text>
                    {player.position && <Tag color="blue" style={{ marginLeft: 8 }}>{player.position}</Tag>}
                    {player.game_ids && <div style={{ color: '#666', marginTop: 4 }}>ID: {player.game_ids}</div>}
                  </div>
                </div>

                {player.bio && (
                  <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ marginBottom: 12 }}>
                    {player.bio}
                  </Paragraph>
                )}

                {player.games?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {player.games.map((g: string) => <Tag key={g} color="green">{g}</Tag>)}
                  </div>
                )}

                {player.player_photos?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <PictureOutlined style={{ color: '#999' }} />
                    <Text type="secondary">{player.player_photos.length} 张照片</Text>
                  </div>
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal
        title={detailModal.player?.nickname}
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, player: null })}
        footer={null}
        width={640}
      >
        {detailModal.player && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <Avatar size={80} icon={<UserOutlined />} src={detailModal.player.avatar} style={{ backgroundColor: '#1677ff' }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>{detailModal.player.nickname}</Title>
                {detailModal.player.position && <Tag color="blue">{detailModal.player.position}</Tag>}
              </div>
            </div>

            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              {detailModal.player.game_ids && <Descriptions.Item label="游戏ID">{detailModal.player.game_ids}</Descriptions.Item>}
              {detailModal.player.games?.length > 0 && (
                <Descriptions.Item label="常玩游戏">{detailModal.player.games.join('、')}</Descriptions.Item>
              )}
            </Descriptions>

            {detailModal.player.bio && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>个人介绍</Text>
                <Paragraph style={{ marginTop: 4 }}>{detailModal.player.bio}</Paragraph>
              </div>
            )}

            {detailModal.player.player_photos?.length > 0 && (
              <div>
                <Text strong>个人照片</Text>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {detailModal.player.player_photos.map((url: string, i: number) => (
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
