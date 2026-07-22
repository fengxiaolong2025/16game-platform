import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tabs, Tag, Button, Space, Descriptions, message, Modal, Table, Spin, Empty, Form, Input, Select } from 'antd';
import { ShareAltOutlined, EditOutlined, UserAddOutlined } from '@ant-design/icons';
import { tournamentApi, registrationApi, bracketApi, matchApi, rankingApi, teamApi } from '../api';
import { useAuthStore } from '../store';
import dayjs from 'dayjs';

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  registration: { label: '报名中', color: 'green' },
  bracket: { label: '对阵编排', color: 'blue' },
  in_progress: { label: '进行中', color: 'orange' },
  completed: { label: '已结束', color: 'default' },
};

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<any>(null);
  const [bracket, setBracket] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myReg, setMyReg] = useState<any>(null);
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [regForm] = Form.useForm();
  const [myCaptainTeams, setMyCaptainTeams] = useState<any[]>([]);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, bRes, mRes, rRes] = await Promise.all([
        tournamentApi.get(id!),
        bracketApi.get(id!).catch(() => ({ data: null })),
        matchApi.list(id!).catch(() => ({ data: [] })),
        rankingApi.get(id!).catch(() => ({ data: [] })),
      ]);
      setTournament(tRes.data);
      setBracket(bRes.data);
      setMatches(mRes.data);
      setRankings(rRes.data);

      if (token) {
        const regRes = await registrationApi.my(id!).catch(() => ({ data: null }));
        setMyReg(regRes.data);
      }
    } catch {
      message.error('加载赛事失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      const formValues = await regForm.validateFields();
      const customFields: Record<string, string> = {};
      if (formValues.player_name) customFields.player_name = formValues.player_name;
      if (formValues.game_id) customFields.game_id = formValues.game_id;
      if (formValues.note) customFields.note = formValues.note;

      const isTeam = tournament?.participant_type === 'team';
      await registrationApi.register(id!, {
        type: isTeam ? 'team' : 'individual',
        team_id: isTeam ? formValues.team_id : undefined,
        custom_fields: customFields,
      });
      message.success(isTeam ? '战队报名已提交，等待主办方审核！' : '报名已提交，等待主办方审核！');
      setRegModalOpen(false);
      loadData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || '报名失败');
    }
  };

  const openRegModal = async () => {
    const isTeam = tournament?.participant_type === 'team';

    if (isTeam) {
      // Load captain's teams
      try {
        const res = await teamApi.myCaptainTeams();
        setMyCaptainTeams(res.data || []);
      } catch { /* ignore */ }
    }

    regForm.setFieldsValue({
      player_name: user?.nickname || '',
      game_id: user?.game_ids || '',
      note: '',
      team_id: undefined,
    });
    setRegModalOpen(true);
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => message.success('链接已复制！'));
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!tournament) return <Empty description="赛事不存在" />;

  const isOwner = user?.id === tournament.creator_id;
  const canRegister = tournament.status === 'registration' && token && !myReg;

  const matchColumns = [
    { title: '轮次', dataIndex: 'round', render: (r: number) => `第${r}轮` },
    { title: '选手A', dataIndex: 'participant_a_name', render: (v: string, r: any) => r.winner_id === r.participant_a_id ? <strong>{v} 🏆</strong> : v },
    { title: '比分', render: (_: any, r: any) => r.status === 'completed' ? <Tag>{r.score_a}:{r.score_b}</Tag> : <Tag color="orange">进行中</Tag> },
    { title: '选手B', dataIndex: 'participant_b_name', render: (v: string, r: any) => r.winner_id === r.participant_b_id ? <strong>{v} 🏆</strong> : v },
    { title: '状态', dataIndex: 'status', render: (s: string) => s === 'completed' ? <Tag color="green">已结束</Tag> : <Tag>{s}</Tag> },
    { title: '时间', dataIndex: 'scheduled_at', render: (v: string) => v ? dayjs(v).format('MM-DD HH:mm') : '待定' },
  ];

  return (
    <div>
      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>{tournament.title}</h2>
            <Space style={{ marginTop: 8 }}>
              <Tag color={statusMap[tournament.status]?.color}>{statusMap[tournament.status]?.label}</Tag>
              <Tag>{tournament.game}</Tag>
              <Tag>{tournament.format === 'single_elimination' ? '单败淘汰' : tournament.format === 'double_elimination' ? '双败淘汰' : '循环赛'}</Tag>
            </Space>
          </div>
          <Space>
            <Button icon={<ShareAltOutlined />} onClick={handleShare}>分享</Button>
            {isOwner && <Button icon={<EditOutlined />} onClick={() => navigate(`/t/${id}/manage`)}>管理赛事</Button>}
            {canRegister && <Button type="primary" icon={<UserAddOutlined />} onClick={openRegModal}>立即报名</Button>}
          </Space>
        </div>
        <Descriptions style={{ marginTop: 16 }} column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="主办方">{tournament.organizer_name || '匿名'}</Descriptions.Item>
          <Descriptions.Item label="参赛类型">{tournament.participant_type === 'team' ? `团队赛 (每队${tournament.team_size}人)` : '个人赛'}</Descriptions.Item>
          <Descriptions.Item label="报名时间">{tournament.registration_start_at ? dayjs(tournament.registration_start_at).format('YYYY-MM-DD HH:mm') : '待定'} ~ {tournament.registration_end_at ? dayjs(tournament.registration_end_at).format('YYYY-MM-DD HH:mm') : '待定'}</Descriptions.Item>
          <Descriptions.Item label="比赛时间">{tournament.start_at ? dayjs(tournament.start_at).format('YYYY-MM-DD HH:mm') : '待定'}</Descriptions.Item>
        </Descriptions>
        {tournament.rules && (
          <div style={{ marginTop: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
            <strong>📋 赛事规则：</strong>
            <p style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{tournament.rules}</p>
          </div>
        )}
      </Card>

      <Card style={{ borderRadius: 12 }}>
        <Tabs items={[
          {
            key: 'matches',
            label: '赛程',
            children: matches.length > 0 ? <Table dataSource={matches} columns={matchColumns} rowKey="id" pagination={false} size="small" /> : <Empty description="暂无赛程" />,
          },
          {
            key: 'bracket',
            label: '对阵表',
            children: bracket ? (
              <div style={{ overflowX: 'auto', padding: '20px 0' }}>
                <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', minWidth: 'max-content' }}>
                  {bracket.rounds_data?.map((round: any, ri: number) => {
                    const matchCount = round.matches?.length || 0;
                    const isLast = ri === (bracket.rounds_data?.length || 0) - 1;
                    return (
                      <div key={ri} style={{ display: 'flex', flexDirection: 'column', minWidth: 200 }}>
                        <div style={{ textAlign: 'center', fontWeight: 700, marginBottom: 16, fontSize: 15, color: isLast ? '#fa541c' : '#1677ff' }}>
                          {round.name}
                        </div>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-around',
                          gap: 12,
                          minHeight: matchCount > 1 ? (matchCount - 1) * 100 + 80 : 80,
                        }}>
                          {round.matches?.map((m: any) => {
                            const aWin = m.winner_id && m.participant_a?.id === m.winner_id;
                            const bWin = m.winner_id && m.participant_b?.id === m.winner_id;
                            const aBye = m.participant_a?.is_bye;
                            const bBye = m.participant_b?.is_bye;
                            return (
                              <div key={m.id} style={{
                                border: '1px solid #d9d9d9',
                                borderRadius: 8,
                                overflow: 'hidden',
                                minWidth: 180,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                              }}>
                                <div style={{
                                  padding: '8px 12px',
                                  background: aWin ? '#f6ffed' : '#fafafa',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  borderBottom: '1px solid #f0f0f0',
                                }}>
                                  <span style={{ fontWeight: aWin ? 700 : 400, color: aWin ? '#52c41a' : '#333', fontSize: 13 }}>
                                    {aBye ? 'BYE' : (m.participant_a?.name || '待定')}
                                  </span>
                                  {aWin && <span>🏆</span>}
                                </div>
                                <div style={{
                                  padding: '8px 12px',
                                  background: bWin ? '#f6ffed' : '#fff',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}>
                                  <span style={{ fontWeight: bWin ? 700 : 400, color: bWin ? '#52c41a' : '#333', fontSize: 13 }}>
                                    {bBye ? 'BYE' : (m.participant_b?.name || '待定')}
                                  </span>
                                  {bWin && <span>🏆</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : <Empty description="对阵表尚未生成" />,
          },
          {
            key: 'rankings',
            label: '排名',
            children: rankings.length > 0 ? (
              <Table dataSource={rankings} rowKey="participant_id" pagination={false} size="small"
                columns={[
                  { title: '排名', dataIndex: 'rank', width: 50, render: (r: number) => r <= 3 ? ['🥇', '🥈', '🥉'][r - 1] : r },
                  { title: '选手/战队', dataIndex: 'participant_name' },
                  { title: '胜', dataIndex: 'wins', width: 40 },
                  { title: '负', dataIndex: 'losses', width: 40 },
                  { title: '净胜', width: 50, render: (_:any, r:any) => {
                    const diff = (r.score_for || 0) - (r.score_against || 0);
                    return <span style={{ color: diff > 0 ? 'green' : diff < 0 ? 'red' : '#999' }}>{diff > 0 ? '+' : ''}{diff}</span>;
                  }},
                  { title: '积分', dataIndex: 'score', width: 50, render: (v: number) => <strong>{v}</strong> },
                ]}
              />
            ) : <Empty description="暂无排名" />,
          },
        ]} />
      </Card>

      <Modal title={tournament.participant_type === 'team' ? '战队报名' : '报名参赛'} open={regModalOpen} onOk={handleRegister} onCancel={() => setRegModalOpen(false)} okText="提交报名" cancelText="取消" width={520}>
        <div style={{ marginBottom: 16, padding: 12, background: '#f0f5ff', borderRadius: 8 }}>
          <strong>{tournament.title}</strong>
          <p style={{ margin: '4px 0 0', color: '#666' }}>
            游戏：{tournament.game} | 赛制：{tournament.format === 'single_elimination' ? '单败淘汰' : tournament.format === 'double_elimination' ? '双败淘汰' : '循环赛'}
            {tournament.participant_type === 'team' && tournament.team_size && ` | 每队${tournament.team_size}人`}
          </p>
        </div>
        <Form form={regForm} layout="vertical">
          {tournament.participant_type === 'team' && (
            <>
              <div style={{ padding: 8, background: '#fff7e6', borderRadius: 6, marginBottom: 12, fontSize: 13, color: '#fa8c16' }}>
                ℹ️ 团队赛仅限队长报名。请先在"我的战队"中创建战队并邀请队员加入，队员人数需达到 {tournament.team_size || 1} 人。
              </div>
              <Form.Item name="team_id" label="选择你的战队" rules={[{ required: true, message: '请选择战队' }]}>
                <Select
                  placeholder="选择你要报名的战队"
                  notFoundContent="你还没有战队，请先创建战队"
                  options={myCaptainTeams.map((t: any) => ({
                    label: `${t.name}${t.tag ? ` [${t.tag}]` : ''} (${t.member_count}人)`,
                    value: t.id,
                  }))}
                />
              </Form.Item>
              {myCaptainTeams.length === 0 && (
                <div style={{ marginBottom: 12 }}>
                  <Button type="dashed" block onClick={() => { window.location.href = '/teams'; }}>
                    去创建战队 →
                  </Button>
                </div>
              )}
            </>
          )}
          <Form.Item name="player_name" label={tournament.participant_type === 'team' ? '队长昵称' : '选手昵称'} rules={[{ required: true, message: '请输入昵称' }]}>
            <Input placeholder="你的参赛昵称" maxLength={30} />
          </Form.Item>
          <Form.Item name="game_id" label={`${tournament.game} 游戏ID`} rules={[{ required: true, message: '请输入你的游戏内ID' }]}>
            <Input placeholder={`你在${tournament.game}中的ID`} maxLength={50} />
          </Form.Item>
          <Form.Item name="note" label="备注（选填）">
            <Input.TextArea rows={2} placeholder="想对主办方说的话..." maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
