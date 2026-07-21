import { View, Text, Image, Input, Button, ScrollView } from '@tarojs/components'
import Taro, { useRouter, useLoad } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { communityApi } from '../../../../api'
import { useAuthStore } from '../../../../store/auth'
import { toAbsUrl, formatDate } from '../../../../utils'
import './index.scss'

export default function PostDetail() {
  const router = useRouter()
  const id = router.params.id
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  const [post, setPost] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [liked, setLiked] = useState(false)

  const fetchData = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const [postRes, commentRes] = await Promise.all([
        communityApi.getPost(id),
        communityApi.listComments(id),
      ])
      setPost(postRes.data as any)
      const commentData = (commentRes.data as any) || []
      setComments(Array.isArray(commentData) ? commentData : commentData.items || [])

      if (token) {
        try {
          const likedRes = await communityApi.isPostLiked(id)
          setLiked((likedRes.data as any)?.liked || false)
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.error('加载失败', err)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [id, token])

  useLoad(() => {
    fetchData()
  })

  const handleLike = async () => {
    if (!token) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    try {
      const res = await communityApi.togglePostLike(id)
      setLiked((res.data as any)?.liked || false)
      setPost((prev: any) => ({
        ...prev,
        like_count: prev.like_count + ((res.data as any)?.liked ? 1 : -1),
      }))
    } catch (err: any) {
      Taro.showToast({ title: '操作失败', icon: 'none' })
    }
  }

  const handleComment = async () => {
    if (!token) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    if (!commentText.trim()) {
      Taro.showToast({ title: '请输入评论内容', icon: 'none' })
      return
    }
    setSubmitting(true)
    try {
      await communityApi.createComment(id, { content: commentText.trim() })
      setCommentText('')
      Taro.showToast({ title: '评论成功', icon: 'success' })
      fetchData()
    } catch (err: any) {
      Taro.showToast({ title: err?.data?.message || '评论失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = (commentId: string) => {
    Taro.showModal({
      title: '删除评论',
      content: '确认删除此评论？',
      confirmColor: '#f44336',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await communityApi.deleteComment(commentId)
          Taro.showToast({ title: '已删除', icon: 'success' })
          fetchData()
        } catch (err: any) {
          Taro.showToast({ title: err?.data?.message || '删除失败', icon: 'none' })
        }
      },
    })
  }

  const handleDeletePost = () => {
    Taro.showModal({
      title: '删除帖子',
      content: '确认删除此帖子？',
      confirmColor: '#f44336',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await communityApi.deletePost(id)
          Taro.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => Taro.navigateBack(), 1500)
        } catch (err: any) {
          Taro.showToast({ title: err?.data?.message || '删除失败', icon: 'none' })
        }
      },
    })
  }

  const goToUser = (userId: string) => {
    Taro.navigateTo({ url: `/subpackages/community/pages/user/index?id=${userId}` })
  }

  if (loading) {
    return (
      <View className="post-detail-page">
        <View className="loading-text">加载中...</View>
      </View>
    )
  }

  if (!post) {
    return (
      <View className="post-detail-page">
        <View className="empty-state"><Text>帖子不存在</Text></View>
      </View>
    )
  }

  const isAuthor = user?.id === post.author_id

  return (
    <View className="post-detail-page">
      <ScrollView scrollY className="post-scroll">
        {/* 作者信息 */}
        <View className="post-author-bar">
          <Image
            className="author-avatar"
            src={toAbsUrl(post.author?.avatar) || 'https://via.placeholder.com/64'}
            mode="aspectFill"
            onClick={() => goToUser(post.author_id)}
          />
          <View className="author-info">
            <Text className="author-name">{post.author?.nickname || '匿名'}</Text>
            <Text className="post-time">{formatDate(post.created_at)}</Text>
          </View>
          {isAuthor && (
            <Text className="delete-post-btn" onClick={handleDeletePost}>删除</Text>
          )}
        </View>

        {/* 帖子内容 */}
        <View className="post-content-section">
          <Text className="post-title">{post.title}</Text>
          <Text className="post-content">{post.content}</Text>
          {post.images && post.images.length > 0 && (
            <View className="post-images">
              {post.images.map((img: string, idx: number) => (
                <Image
                  key={idx}
                  className="post-image"
                  src={toAbsUrl(img)}
                  mode="widthFix"
                  onClick={() => Taro.previewImage({ urls: post.images.map((p: string) => toAbsUrl(p)), current: toAbsUrl(img) })}
                />
              ))}
            </View>
          )}
        </View>

        {/* 互动栏 */}
        <View className="post-actions">
          <View className={`action-item ${liked ? 'liked' : ''}`} onClick={handleLike}>
            <Text className="action-icon">{liked ? '❤️' : '🤍'}</Text>
            <Text className="action-text">{post.like_count || 0}</Text>
          </View>
          <View className="action-item">
            <Text className="action-icon">💬</Text>
            <Text className="action-text">{post.comment_count || 0}</Text>
          </View>
          <View className="action-item">
            <Text className="action-icon">👁</Text>
            <Text className="action-text">{post.view_count || 0}</Text>
          </View>
        </View>

        {/* 评论区 */}
        <View className="comments-section">
          <Text className="comments-title">评论 ({comments.length})</Text>
          {comments.length === 0 ? (
            <View className="empty-comments">
              <Text>暂无评论，快来抢沙发</Text>
            </View>
          ) : (
            <View className="comment-list">
              {comments.map((comment) => (
                <View key={comment.id} className="comment-item">
                  <Image
                    className="comment-avatar"
                    src={toAbsUrl(comment.author?.avatar) || 'https://via.placeholder.com/56'}
                    mode="aspectFill"
                    onClick={() => goToUser(comment.author_id)}
                  />
                  <View className="comment-body">
                    <View className="comment-header">
                      <Text className="comment-author" onClick={() => goToUser(comment.author_id)}>
                        {comment.author?.nickname || '匿名'}
                      </Text>
                      <Text className="comment-time">{formatDate(comment.created_at)}</Text>
                    </View>
                    <Text className="comment-content">{comment.content}</Text>
                  </View>
                  {user?.id === comment.author_id && (
                    <Text className="comment-delete" onClick={() => handleDeleteComment(comment.id)}>删除</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 评论输入栏 */}
      <View className="comment-bar">
        <Input
          className="comment-input"
          placeholder={token ? '写下你的评论...' : '请先登录后评论'}
          value={commentText}
          onInput={(e) => setCommentText(e.detail.value)}
          disabled={!token || submitting}
        />
        <Button
          className="comment-submit-btn"
          size="mini"
          disabled={!token || submitting || !commentText.trim()}
          onClick={handleComment}
        >
          发送
        </Button>
      </View>
    </View>
  )
}
