import { useEffect, useState } from 'react';
import { Card, Row, Col, Tag, Typography, Empty, Spin, Modal, Image, Descriptions } from 'antd';
import { UserOutlined } from '@ant-design/icons';
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
                style={{ borderRadius: 12, overflow: 'hidden', height: '100%', padding: 0 }}
                bodyStyle={{ padding: 0 }}
                onClick={() => setDetailModal({ open: true, player })}
              >
                {/* 照片区域 - 主要展示 */}
                {player.player_photos?.length > 0 ? (
                  <div style={{ width: '100%', height: 220, overflow: 'hidden', position: 'relative' }}>
                    <Image
                      src={player.player_photos[0]}
                      width="100%"
                      height={220}
                      style={{ objectFit: 'cover', display: 'block' }}
                      preview={false}
                    />
                    {player.player_photos.length > 1 && (
                      <div style={{
                        position: 'absolute', bottom: 8, right: 8,
                        background: 'rgba(0,0,0,0.6)', color: '#fff',
                        padding: '2px 8px', borderRadius: 10, fontSize: 12,
                      }}>
                        +{player.player_photos.length - 1}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    width: '100%', height: 220,
                    background: 'linear-gradient(135deg, #1677ff22, #1677ff44)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <UserOutlined style={{ fontSize: 60, color: '#1677ff' }} />
                  </div>
                )}

                {/* 文字信息区域 */}
                <div style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Text strong style={{ fontSize: 16 }}>{player.nickname}</Text>
                    {player.position && <Tag color="blue">{player.position}</Tag>}
                  </div>

                  {player.game_ids && (
                    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                      ID: {player.game_ids}
                    </Text>
                  )}

                  {player.ladder_score != null && player.ladder_score > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <Tag color="volcano">16天梯: {player.ladder_score} 分</Tag>
                    </div>
                  )}

                  {player.bio && (
                    <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ marginBottom: 8, fontSize: 13 }}>
                      {player.bio}
                    </Paragraph>
                  )}

                  {player.games?.length > 0 && (
                    <div>
                      {player.games.map((g: string) => <Tag key={g} color="green" style={{ marginBottom: 4 }}>{g}</Tag>)}
                    </div>
                  )}
                </div>
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
            <Title level={4} style={{ marginBottom: 12 }}>
              {detailModal.player.nickname}
              {detailModal.player.position && <Tag color="blue" style={{ marginLeft: 8 }}>{detailModal.player.position}</Tag>}
            </Title>

            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              {detailModal.player.game_ids && <Descriptions.Item label="游戏ID">{detailModal.player.game_ids}</Descriptions.Item>}
              {detailModal.player.ladder_score != null && detailModal.player.ladder_score > 0 && (
                <Descriptions.Item label="16天梯分数">{detailModal.player.ladder_score} 分</Descriptions.Item>
              )}
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
