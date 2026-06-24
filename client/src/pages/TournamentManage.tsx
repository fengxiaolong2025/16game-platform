import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Tabs, Table, Button, Tag, Space, message, Modal, Popconfirm, Spin, Empty, DatePicker } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, EditOutlined } from '@ant-design/icons';
import { tournamentApi, registrationApi, bracketApi, matchApi } from '../api';
import dayjs from 'dayjs';

export function TournamentManagePage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [bracket, setBracket] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultModal, setResultModal] = useState<{ open: boolean; match: any; isEdit: boolean }>({ open: false, match: null, isEdit: false });
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; match: any }>({ open: false, match: null });
  const [scheduleTime, setScheduleTime] = useState<any>(null);
  const [teamRegs, setTeamRegs] = useState<any[]>([]);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const tRes = await tournamentApi.get(id!);
      setTournament(tRes.data);

      const isTeam = tRes.data.participant_type === 'team';
      const fetches: Promise<any>[] = [
        registrationApi.list(id!).catch(() => ({ data: [] })),
        bracketApi.get(id!).catch(() => ({ data: null })),
        matchApi.list(id!).catch(() => ({ data: [] })),
      ];
      if (isTeam) {
        fetches.push(registrationApi.teamRegistrations(id!).catch(() => ({ data: [] })));
      }

      const results = await Promise.all(fetches);
      setRegistrations(results[0].data);
      setBracket(results[1].data);
      setMatches(results[2].data);
      if (isTeam && results[3]) {
        setTeamRegs(results[3].data);
      }
    } catch { message.error('加载失败'); }
    finally { setLoading(false); }
  };

  const handleAdvanceStatus = async (newStatus: string) => {
    try {
      await tournamentApi.advanceStatus(id!, newStatus);
      message.success('状态已更新');
      loadData();
    } catch (err: any) { message.error(err.response?.data?.message || '操作失败'); }
  };

  const handleReview = async (regId: string, action: 'approve' | 'reject') => {
    try {
      await registrationApi.review(id!, regId, action);
      message.success(action === 'approve' ? '已通过' : '已拒绝');
      loadData();
    } catch (err: any) { message.error(err.response?.data?.message || '操作失败'); }
  };

  const handleGenerateBracket = async () => {
    try {
      await bracketApi.generate(id!, 'auto');
      message.success('对阵表已生成');
      loadData();
    } catch (err: any) { message.error(err.response?.data?.message || '生成失败'); }
  };

  const handlePublishBracket = async () => {
    try {
      await bracketApi.publish(id!);
      message.success('对阵已发布');
      loadData();
    } catch (err: any) { message.error(err.response?.data?.message || '发布失败'); }
  };

  const handleSubmitResult = async () => {
    if (!resultModal.match) return;
    try {
      const winnerId = scoreA > scoreB ? resultModal.match.participant_a_id : resultModal.match.participant_b_id;
      await matchApi.submitResult(id!, resultModal.match.id, { score_a: scoreA, score_b: scoreB, winner_id: winnerId });
      message.success(resultModal.isEdit ? '结果已更新' : '结果已提交');
      setResultModal({ open: false, match: null, isEdit: false });
      loadData();
    } catch (err: any) { message.error(err.response?.data?.message || '提交失败'); }
  };

  const handleSchedule = async () => {
    if (!scheduleModal.match || !scheduleTime) return;
    try {
      await matchApi.schedule(id!, scheduleModal.match.id, scheduleTime.toISOString());
      message.success('比赛时间已设置');
      setScheduleModal({ open: false, match: null });
      setScheduleTime(null);
      loadData();
    } catch (err: any) { message.error(err.response?.data?.message || '设置失败'); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;
  if (!tournament) return <Empty description="赛事不存在" />;

  const regColumns = [
    { title: '类型', dataIndex: 'type', render: (t: string) => t === 'team' ? '团队' : '个人', width: 60 },
    { title: '选手昵称', render: (_: any, r: any) => r.custom_fields?.player_name || '-' },
    { title: '游戏ID', render: (_: any, r: any) => r.custom_fields?.game_id || '-' },
    { title: '备注', render: (_: any, r: any) => r.custom_fields?.note || '-' },
    { title: '状态', dataIndex: 'status', render: (s: string) => {
      const m: Record<string, { color: string; label: string }> = { submitted: { color: 'blue', label: '待审核' }, approved: { color: 'green', label: '已通过' }, rejected: { color: 'red', label: '已拒绝' }, checked_in: { color: 'cyan', label: '已签到' } };
      return <Tag color={m[s]?.color}>{m[s]?.label || s}</Tag>;
    }},
    { title: '时间', dataIndex: 'created_at', render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    { title: '操作', render: (_: any, r: any) => r.status === 'submitted' ? (
      <Space>
        <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleReview(r.id, 'approve')}>通过</Button>
        <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleReview(r.id, 'reject')}>拒绝</Button>
      </Space>
    ) : null },
  ];

  const matchColumns = [
    { title: '轮次', dataIndex: 'round', render: (r: number) => `第${r}轮`, width: 60 },
    { title: '选手A', dataIndex: 'participant_a_name' },
    { title: 'VS', render: () => <span style={{ color: '#999' }}>VS</span>, width: 40 },
    { title: '选手B', dataIndex: 'participant_b_name' },
    { title: '比分', render: (_: any, r: any) => r.status === 'completed' ? <Tag color="blue">{r.score_a}:{r.score_b}</Tag> : '-' },
    { title: '时间', dataIndex: 'scheduled_at', render: (v: string) => v ? dayjs(v).format('MM-DD HH:mm') : <span style={{ color: '#ccc' }}>未设置</span> },
    { title: '状态', dataIndex: 'status', render: (s: string) => s === 'completed' ? <Tag color="green">已结束</Tag> : s === 'live' ? <Tag color="orange">进行中</Tag> : <Tag>待开始</Tag> },
    { title: '操作', render: (_: any, r: any) => {
      if (!r.participant_a_id || !r.participant_b_id) return <Tag color="default">等待晋级</Tag>;
      return (
        <Space size={4}>
          <Button size="small" icon={<ClockCircleOutlined />}
            onClick={() => { setScheduleModal({ open: true, match: r }); setScheduleTime(r.scheduled_at ? dayjs(r.scheduled_at) : null); }}>
            时间
          </Button>
          {r.status === 'completed' ? (
            <Button size="small" icon={<EditOutlined />}
              onClick={() => { setResultModal({ open: true, match: r, isEdit: true }); setScoreA(r.score_a || 0); setScoreB(r.score_b || 0); }}>
              修改
            </Button>
          ) : (
            <Button size="small" type="primary"
              onClick={() => { setResultModal({ open: true, match: r, isEdit: false }); setScoreA(0); setScoreB(0); }}>
              录入
            </Button>
          )}
        </Space>
      );
    }},
  ];

  return (
    <div>
      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0 }}>管理：{tournament.title}</h2>
          <Space wrap>
            {tournament.status === 'draft' && <Button type="primary" onClick={() => handleAdvanceStatus('registration')}>开始报名</Button>}
            {tournament.status === 'registration' && <Button type="primary" onClick={() => handleAdvanceStatus('bracket')}>截止报名 & 编排对阵</Button>}
            {tournament.status === 'bracket' && <Button type="primary" onClick={() => handleAdvanceStatus('in_progress')}>开始比赛</Button>}
            {tournament.status === 'in_progress' && <Button type="primary" onClick={() => handleAdvanceStatus('completed')}>结束赛事</Button>}
            {/* 回退按钮 */}
            {tournament.status === 'bracket' && <Button onClick={() => handleAdvanceStatus('registration')}>← 退回报名阶段</Button>}
            {tournament.status === 'in_progress' && <Button onClick={() => handleAdvanceStatus('bracket')}>← 退回对阵阶段</Button>}
            {tournament.status === 'completed' && <Button onClick={() => handleAdvanceStatus('in_progress')}>← 重新开始比赛</Button>}
          </Space>
        </div>
      </Card>

      <Card style={{ borderRadius: 12 }}>
        <Tabs items={[
          {
            key: 'registrations',
            label: `报名管理 (${tournament.participant_type === 'team' ? teamRegs.length + '支队伍' : registrations.length + '人'})`,
            children: tournament.participant_type === 'team' ? (
              <div>
                <div style={{ marginBottom: 12, display: 'flex', gap: 16 }}>
                  <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>队伍：{teamRegs.length}</Tag>
                  <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>总人数：{teamRegs.reduce((sum: number, t: any) => sum + (t.member_count || 0), 0)}</Tag>
                  <Tag style={{ fontSize: 14, padding: '4px 12px' }}>名额：{tournament.max_participants}队</Tag>
                </div>
                <Table
                  dataSource={teamRegs}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  expandable={{
                    expandedRowRender: (record: any) => (
                      <Table
                        dataSource={record.members || []}
                        rowKey="user_id"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: '角色', dataIndex: 'role', render: (r: string) => r === 'captain' ? <Tag color="gold">队长</Tag> : <Tag>队员</Tag>, width: 80 },
                          { title: '昵称', dataIndex: 'nickname' },
                          { title: '游戏ID', dataIndex: 'game_ids' },
                        ]}
                      />
                    ),
                  }}
                  columns={[
                    { title: '战队名称', dataIndex: 'team_name', render: (v: string, r: any) => <strong>{v}</strong> },
                    { title: '标签', dataIndex: 'team_tag', render: (v: string) => v ? <Tag>{v}</Tag> : '-' },
                    { title: '人数', dataIndex: 'member_count', render: (v: number) => <Tag color="blue">{v}人</Tag> },
                    { title: '状态', dataIndex: 'status', render: (s: string) => {
                      const m: Record<string, { color: string; label: string }> = { submitted: { color: 'blue', label: '待审核' }, approved: { color: 'green', label: '已通过' }, rejected: { color: 'red', label: '已拒绝' } };
                      return <Tag color={m[s]?.color}>{m[s]?.label || s}</Tag>;
                    }},
                    { title: '报名时间', dataIndex: 'created_at', render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
                    { title: '操作', render: (_: any, r: any) => r.status === 'submitted' ? (
                      <Space>
                        <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleReview(r.id, 'approve')}>通过</Button>
                        <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleReview(r.id, 'reject')}>拒绝</Button>
                      </Space>
                    ) : null },
                  ]}
                />
              </div>
            ) : (
              <Table dataSource={registrations} columns={regColumns} rowKey="id" pagination={false} size="small" />
            ),
          },
          {
            key: 'bracket',
            label: '对阵管理',
            children: (
              <div>
                {!bracket ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <p>尚未生成对阵表</p>
                    <Button type="primary" size="large" onClick={handleGenerateBracket} disabled={tournament.status !== 'bracket'}>自动生成对阵表</Button>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <Tag color={bracket.status === 'published' ? 'green' : 'blue'}>{bracket.status === 'published' ? '已发布' : '草稿'}</Tag>
                      {bracket.status !== 'published' && <Button type="primary" onClick={handlePublishBracket} style={{ marginLeft: 8 }}>发布对阵</Button>}
                    </div>
                    {bracket.rounds_data?.map((round: any, ri: number) => (
                      <div key={ri} style={{ marginBottom: 16 }}>
                        <h4>{round.name}</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {round.matches?.map((m: any) => (
                            <Card key={m.id} size="small" style={{ minWidth: 200 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{m.participant_a?.name || '待定'}</span>
                                <span>VS</span>
                                <span>{m.participant_b?.name || '待定'}</span>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'matches',
            label: '比赛管理',
            children: <Table dataSource={matches} columns={matchColumns} rowKey="id" pagination={false} size="small" />,
          },
        ]} />
      </Card>

      <Modal title={resultModal.isEdit ? '修改比赛结果' : '录入比赛结果'} open={resultModal.open} onOk={handleSubmitResult} onCancel={() => setResultModal({ open: false, match: null, isEdit: false })} okText={resultModal.isEdit ? '保存修改' : '确认提交'}>
        {resultModal.match && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <strong>{resultModal.match.participant_a_name}</strong>
              <div style={{ marginTop: 8 }}>
                <Button onClick={() => setScoreA(Math.max(0, scoreA - 1))}>-</Button>
                <span style={{ fontSize: 24, margin: '0 12px' }}>{scoreA}</span>
                <Button onClick={() => setScoreA(scoreA + 1)}>+</Button>
              </div>
            </div>
            <span style={{ fontSize: 20, color: '#999' }}>VS</span>
            <div style={{ textAlign: 'center' }}>
              <strong>{resultModal.match.participant_b_name}</strong>
              <div style={{ marginTop: 8 }}>
                <Button onClick={() => setScoreB(Math.max(0, scoreB - 1))}>-</Button>
                <span style={{ fontSize: 24, margin: '0 12px' }}>{scoreB}</span>
                <Button onClick={() => setScoreB(scoreB + 1)}>+</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal title="设置比赛时间" open={scheduleModal.open} onOk={handleSchedule} onCancel={() => { setScheduleModal({ open: false, match: null }); setScheduleTime(null); }} okText="保存时间" cancelText="取消">
        {scheduleModal.match && (
          <div style={{ padding: '10px 0' }}>
            <p style={{ marginBottom: 16 }}>
              <strong>{scheduleModal.match.participant_a_name}</strong>
              <span style={{ margin: '0 8px', color: '#999' }}>VS</span>
              <strong>{scheduleModal.match.participant_b_name}</strong>
            </p>
            <p style={{ marginBottom: 8, color: '#666' }}>比赛时间：</p>
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              placeholder="选择比赛时间"
              style={{ width: '100%' }}
              value={scheduleTime}
              onChange={setScheduleTime}
            />
            {scheduleModal.match.scheduled_at && (
              <p style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                当前时间：{dayjs(scheduleModal.match.scheduled_at).format('YYYY-MM-DD HH:mm')}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
