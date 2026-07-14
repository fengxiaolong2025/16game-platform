import { useEffect, useState } from 'react';
import { Card, List, Tag, Button, message, Empty } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { notificationApi } from '../api';
import dayjs from 'dayjs';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await notificationApi.list();
      setNotifications(res.data.items || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleRead = async (id: string) => {
    await notificationApi.markAsRead(id);
    load();
  };

  const handleReadAll = async () => {
    await notificationApi.markAllAsRead();
    message.success('已全部标记为已读');
    load();
  };

  const typeColors: Record<string, string> = {
    registration_review: 'blue',
    match_schedule: 'orange',
    match_result: 'green',
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2><BellOutlined /> 消息通知</h2>
        <Button size="small" onClick={handleReadAll}>全部已读</Button>
      </div>
      {notifications.length === 0 ? (
        <Empty description="暂无通知" />
      ) : (
        <List
          loading={loading}
          dataSource={notifications}
          renderItem={(item) => (
            <Card
              size="small"
              style={{ marginBottom: 8, borderRadius: 8, opacity: item.is_read ? 0.6 : 1, cursor: 'pointer' }}
              onClick={() => !item.is_read && handleRead(item.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Tag color={typeColors[item.type] || 'default'}>{item.type}</Tag>
                  <strong>{item.title}</strong>
                  <p style={{ margin: '4px 0 0', color: '#666' }}>{item.content}</p>
                </div>
                <span style={{ color: '#999', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {dayjs(item.created_at).format('MM-DD HH:mm')}
                  {!item.is_read && <Tag color="red" style={{ marginLeft: 4 }}>未读</Tag>}
                </span>
              </div>
            </Card>
          )}
        />
      )}
    </div>
  );
}
