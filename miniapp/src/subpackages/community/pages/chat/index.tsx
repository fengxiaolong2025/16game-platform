import { View, Text } from '@tarojs/components'
import './index.scss'

export default function Chat() {
  return (
    <View className="chat-page">
      <View className="coming-soon">
        <View className="icon-wrapper">
          <Text className="coming-icon">💬</Text>
        </View>
        <Text className="coming-title">私信功能即将上线</Text>
        <Text className="coming-desc">
          我们正在开发实时私信功能，{'\n'}
          届时您将可以与其他选手、战队队长{'\n'}
          进行一对一沟通交流。
        </Text>
        <View className="feature-list">
          <View className="feature-item">
            <Text className="feature-icon">📤</Text>
            <Text className="feature-text">一对一私信</Text>
          </View>
          <View className="feature-item">
            <Text className="feature-icon">🔔</Text>
            <Text className="feature-text">消息推送提醒</Text>
          </View>
          <View className="feature-item">
            <Text className="feature-icon">🖼️</Text>
            <Text className="feature-text">图片/表情发送</Text>
          </View>
        </View>
        <Text className="coming-hint">二期版本中实现</Text>
      </View>
    </View>
  )
}
