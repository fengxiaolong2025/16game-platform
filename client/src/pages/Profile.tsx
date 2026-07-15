import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Select, message, Table, Tag, Upload, Image } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store';
import { authApi, playerApi, tournamentApi } from '../api';

export function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>(user?.player_photos || []);
  const [form] = Form.useForm();

  useEffect(() => {
    loadMyTournaments();
    if (user) {
      form.setFieldsValue({
        nickname: user.nickname,
        games: user.games || [],
        game_ids: user.game_ids || '',
        bio: user.bio || '',
        position: user.position || '',
        ladder_score: user.ladder_score || '',
      });
      setPhotos(user.player_photos || []);
    }
  }, [user]);

  const loadMyTournaments = async () => {
    try {
      const res = await tournamentApi.myList('created');
      setTournaments(res.data || []);
    } catch { /* ignore */ }
  };

  const handleUpdateProfile = async (values: any) => {
    setLoading(true);
    try {
      const data = { ...values, player_photos: photos };
      const res = await authApi.updateProfile(data);
      setUser(res.data);
      message.success('信息已更新');
    } catch (err: any) {
      message.error(err.response?.data?.message || '更新失败');
    } finally { setLoading(false); }
  };

  const handleUploadPhoto = async (file: any) => {
    if (photos.length >= 6) {
      message.warning('最多上传6张照片');
      return false;
    }
    setUploading(true);
    try {
      const res = await playerApi.uploadPhotos([file]);
      const newPhotos = [...photos, ...(res.data.urls || [])];
      setPhotos(newPhotos);
      message.success('上传成功');
    } catch (err: any) {
      message.error(err.response?.data?.message || '上传失败');
    } finally { setUploading(false); }
    return false;
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const statusMap: Record<string, { label: string; color: string }> = {
    draft: { label: '草稿', color: 'default' },
    registration: { label: '报名中', color: 'green' },
    bracket: { label: '对阵编排', color: 'blue' },
    in_progress: { label: '进行中', color: 'orange' },
    completed: { label: '已结束', color: 'default' },
  };

  const columns = [
    { title: '赛事名称', dataIndex: 'title' },
    { title: '游戏', dataIndex: 'game', render: (v: string) => <Tag>{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={statusMap[s]?.color}>{statusMap[s]?.label}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleDateString('zh-CN') },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card title="个人信息" style={{ borderRadius: 12, marginBottom: 16 }}>
        <Form form={form} layout="vertical" onFinish={handleUpdateProfile}>
          <Form.Item name="nickname" label="昵称" rules={[{ required: true }]}>
            <Input placeholder="你的昵称" />
          </Form.Item>
          <Form.Item name="position" label="位置/角色">
            <Select placeholder="选择你的位置" allowClear options={[
              { label: '上单', value: '上单' },
              { label: '打野', value: '打野' },
              { label: '中单', value: '中单' },
              { label: 'ADC', value: 'ADC' },
              { label: '辅助', value: '辅助' },
              { label: '指挥', value: '指挥' },
              { label: '狙击手', value: '狙击手' },
              { label: '突破手', value: '突破手' },
              { label: '自由人', value: '自由人' },
              { label: '教练', value: '教练' },
              { label: '队长', value: '队长' },
            ]} />
          </Form.Item>
          <Form.Item name="bio" label="个人简介">
            <Input.TextArea rows={4} placeholder="介绍一下你自己，你的游戏经历、擅长英雄等" maxLength={500} showCount />
          </Form.Item>
          <Form.Item name="games" label="常玩游戏">
            <Select mode="multiple" placeholder="选择你常玩的游戏" options={[
              { label: '英雄联盟', value: '英雄联盟' },
              { label: '王者荣耀', value: '王者荣耀' },
              { label: 'CS2', value: 'CS2' },
              { label: 'Valorant', value: 'Valorant' },
              { label: 'DOTA2', value: 'DOTA2' },
              { label: 'DOTA1', value: 'DOTA1' },
            ]} />
          </Form.Item>
          <Form.Item name="game_ids" label="游戏内ID">
            <Input placeholder="你的游戏内ID（可选）" />
          </Form.Item>
          <Form.Item name="ladder_score" label="16天梯分数">
            <Input type="number" placeholder="输入你的16天梯分数" />
          </Form.Item>

          <Form.Item label="个人照片（最多6张）">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {photos.map((url, index) => (
                <div key={index} style={{ position: 'relative' }}>
                  <Image src={url} width={100} height={100} style={{ objectFit: 'cover', borderRadius: 8 }} />
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    style={{ position: 'absolute', top: -8, right: -8, minWidth: 20, height: 20, padding: 0, borderRadius: '50%' }}
                    onClick={() => removePhoto(index)}
                  />
                </div>
              ))}
            </div>
            {photos.length < 6 && (
              <Upload beforeUpload={handleUploadPhoto} showUploadList={false} accept="image/*">
                <Button icon={<UploadOutlined />} loading={uploading}>上传照片</Button>
              </Upload>
            )}
          </Form.Item>

          <Button type="primary" htmlType="submit" loading={loading}>保存</Button>
        </Form>
      </Card>

      <Card title="我创建的赛事" style={{ borderRadius: 12 }}>
        <Table dataSource={tournaments} columns={columns} rowKey="id" pagination={false} size="small" />
      </Card>
    </div>
  );
}
