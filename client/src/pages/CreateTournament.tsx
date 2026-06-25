import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Steps, Form, Input, Select, DatePicker, InputNumber, Switch, Button, Radio, message } from 'antd';
import { tournamentApi } from '../api';

const { TextArea } = Input;

const games = [
  { label: '🎮 英雄联盟', value: '英雄联盟' },
  { label: '🎮 王者荣耀', value: '王者荣耀' },
  { label: '🎮 CS2', value: 'CS2' },
  { label: '🎮 Valorant', value: 'Valorant' },
  { label: '🎮 DOTA2', value: 'DOTA2' },
  { label: '🎮 DOTA1', value: 'DOTA1' },
];

const formats = [
  { label: '单败淘汰', value: 'single_elimination', desc: '输一场即淘汰，简单直接' },
  { label: '双败淘汰', value: 'double_elimination', desc: '输两场才淘汰，更公平' },
  { label: '循环赛', value: 'round_robin', desc: '每队互相交手，积分排名' },
];

const participantTypes = [
  { label: '个人赛', value: 'individual' },
  { label: '团队赛', value: 'team' },
];

export function CreateTournamentPage() {
  const [step, setStep] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFinish = async () => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      // Manual validation - check all required fields
      const errors: string[] = [];
      if (!values.game) errors.push('请选择游戏项目');
      if (!values.format) errors.push('请选择赛制');
      if (!values.max_participants || values.max_participants < 2) errors.push('参赛数量至少为 2');
      if (!values.title || !values.title.trim()) errors.push('请输入赛事名称');
      if (!values.time || !values.time[0] || !values.time[1]) errors.push('请设置报名时间');

      if (errors.length > 0) {
        if (!values.game) setStep(0);
        else if (!values.format || !values.max_participants || values.max_participants < 2) setStep(1);
        else if (!values.time || !values.time[0] || !values.time[1]) setStep(2);
        else if (!values.title || !values.title.trim()) setStep(3);
        message.error(errors[0]);
        setLoading(false);
        return;
      }

      const data: any = {
        title: values.title.trim(),
        game: values.game,
        format: values.format,
        participant_type: values.participant_type || 'individual',
        max_participants: values.max_participants,
        team_size: values.team_size || undefined,
        organizer_name: values.organizer_name || undefined,
        rules: values.rules || undefined,
        is_public: values.is_public !== false,
        registration_start_at: values.time[0]?.toISOString(),
        registration_end_at: values.time[1]?.toISOString(),
        start_at: values.match_time?.[0]?.toISOString() || undefined,
        end_at: values.match_time?.[1]?.toISOString() || undefined,
        config: {
          scoring: values.scoring || { win: 3, draw: 1, loss: 0 },
        },
      };

      const res = await tournamentApi.create(data);
      message.success('赛事创建成功！');
      navigate(`/t/${res.data.id}`);
    } catch (err: any) {
      message.error(err.response?.data?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDraft = async () => {
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const data: any = { ...values, status: 'draft' };
      if (values.time) {
        data.registration_start_at = values.time[0]?.toISOString();
        data.registration_end_at = values.time[1]?.toISOString();
      }
      if (values.match_time) {
        data.start_at = values.match_time[0]?.toISOString();
        data.end_at = values.match_time[1]?.toISOString();
      }
      delete data.time;
      delete data.match_time;
      const res = await tournamentApi.create(data);
      message.success('已保存为草稿');
      navigate(`/t/${res.data.id}/manage`);
    } catch (err: any) {
      message.error(err.response?.data?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const participantType = Form.useWatch('participant_type', form);

  // Use display:none instead of conditional rendering to preserve field values
  const stepStyle = (s: number) => ({ display: step === s ? 'block' : 'none' } as React.CSSProperties);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Card style={{ borderRadius: 12 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 32 }}>创建赛事</h2>
        <Steps
          current={step}
          onChange={setStep}
          style={{ marginBottom: 32 }}
          items={[
            { title: '选择游戏' },
            { title: '配置赛制' },
            { title: '设置时间' },
            { title: '编辑规则' },
            { title: '确认发布' },
          ]}
        />

        <Form form={form} layout="vertical" preserve={true}
          initialValues={{ format: 'single_elimination', participant_type: 'individual', max_participants: 16, is_public: true }}>

          <div style={stepStyle(0)}>
            <Form.Item name="game" label="选择游戏项目" rules={[{ required: true, message: '请选择游戏' }]}>
              <Select size="large" options={games} placeholder="请选择你要举办比赛的游戏" />
            </Form.Item>
          </div>

          <div style={stepStyle(1)}>
            <Form.Item name="format" label="选择赛制" rules={[{ required: true }]}>
              <Radio.Group size="large">
                {formats.map((f) => (
                  <Radio.Button key={f.value} value={f.value} style={{ height: 'auto', padding: '12px 16px', marginBottom: 8 }}>
                    <div><strong>{f.label}</strong></div>
                    <div style={{ fontSize: 12, color: '#999' }}>{f.desc}</div>
                  </Radio.Button>
                ))}
              </Radio.Group>
            </Form.Item>
            <Form.Item name="participant_type" label="参赛类型">
              <Radio.Group options={participantTypes} />
            </Form.Item>
            {participantType === 'team' && (
              <Form.Item name="team_size" label="每队人数" rules={[{ required: true, message: '请输入每队人数' }]}>
                <InputNumber min={2} max={10} placeholder="5" style={{ width: '100%' }} />
              </Form.Item>
            )}
            <Form.Item name="max_participants" label="最大参赛数量" rules={[{ required: true }]}>
              <Select options={[2, 4, 8, 16, 32, 64].map((n) => ({ label: `${n}`, value: n }))} />
            </Form.Item>
            <div style={{ background: '#fafafa', padding: 12, borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>📊 积分规则</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <Form.Item name={['scoring', 'win']} label="胜" style={{ marginBottom: 0 }} initialValue={3}>
                  <InputNumber min={0} max={10} style={{ width: 80 }} />
                </Form.Item>
                <Form.Item name={['scoring', 'draw']} label="平" style={{ marginBottom: 0 }} initialValue={1}>
                  <InputNumber min={0} max={10} style={{ width: 80 }} />
                </Form.Item>
                <Form.Item name={['scoring', 'loss']} label="负" style={{ marginBottom: 0 }} initialValue={0}>
                  <InputNumber min={0} max={10} style={{ width: 80 }} />
                </Form.Item>
              </div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>默认：胜3分 平1分 负0分</div>
            </div>
          </div>

          <div style={stepStyle(2)}>
            <Form.Item name="time" label="报名时间" rules={[{ required: true }]}>
              <DatePicker.RangePicker showTime style={{ width: '100%' }} placeholder={['报名开始', '报名截止']} />
            </Form.Item>
            <Form.Item name="match_time" label="比赛时间">
              <DatePicker.RangePicker showTime style={{ width: '100%' }} placeholder={['比赛开始', '预计结束']} />
            </Form.Item>
          </div>

          <div style={stepStyle(3)}>
            <Form.Item name="title" label="赛事名称" rules={[{ required: true, message: '请输入赛事名称' }, { max: 50 }]}>
              <Input size="large" placeholder="给你的赛事起个响亮的名字" maxLength={50} />
            </Form.Item>
            <Form.Item name="organizer_name" label="主办方名称">
              <Input placeholder="默认使用你的昵称" />
            </Form.Item>
            <Form.Item name="rules" label="赛事规则">
              <TextArea rows={5} placeholder="详细描述比赛规则、地图池、Ban/Pick规则等..." />
            </Form.Item>
            <Form.Item name="is_public" label="公开赛事" valuePropName="checked">
              <Switch checkedChildren="公开" unCheckedChildren="私密" />
            </Form.Item>
          </div>

          <div style={stepStyle(4)}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <h3>📋 确认赛事信息</h3>
              <div style={{ textAlign: 'left', background: '#f5f5f5', padding: 16, borderRadius: 8, marginTop: 16 }}>
                {form.getFieldValue('title') && <p><strong>赛事名称：</strong>{form.getFieldValue('title')}</p>}
                <p><strong>游戏：</strong>{form.getFieldValue('game')}</p>
                <p><strong>赛制：</strong>{formats.find((f) => f.value === form.getFieldValue('format'))?.label}</p>
                <p><strong>参赛类型：</strong>{form.getFieldValue('participant_type') === 'team' ? `团队赛（每队${form.getFieldValue('team_size')}人）` : '个人赛'}</p>
                <p><strong>最大参赛数：</strong>{form.getFieldValue('max_participants')}</p>
              </div>
            </div>
          </div>
        </Form>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <Button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>上一步</Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={handleDraft} loading={loading}>保存草稿</Button>
            {step < 4 ? (
              <Button type="primary" onClick={() => setStep(step + 1)}>下一步</Button>
            ) : (
              <Button type="primary" onClick={handleFinish} loading={loading}>发布赛事</Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
