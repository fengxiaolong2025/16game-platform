import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull } from 'typeorm';
import { CommunityPost, CommunityComment, CommunityLike } from './community.entity';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(CommunityPost)
    private postRepo: Repository<CommunityPost>,
    @InjectRepository(CommunityComment)
    private commentRepo: Repository<CommunityComment>,
    @InjectRepository(CommunityLike)
    private likeRepo: Repository<CommunityLike>,
  ) {}

  // ===== Posts =====

  async findAll(params: {
    page?: number;
    limit?: number;
    category?: string;
    keyword?: string;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 50);
    const where: any = { status: 'published' };
    if (params.category && params.category !== 'all') {
      where.category = params.category;
    }
    if (params.keyword) {
      where.title = Like(`%${params.keyword}%`);
    }

    const [items, total] = await this.postRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: { author: true },
    });

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const post = await this.postRepo.findOne({
      where: { id },
      relations: { author: true },
    });
    if (!post) return null;

    // Increment view count
    await this.postRepo.increment({ id }, 'view_count', 1);
    post.view_count += 1;

    return post;
  }

  async create(userId: string, data: {
    title: string;
    content: string;
    images?: string[];
    category?: string;
  }) {
    const post = this.postRepo.create({
      ...data,
      author_id: userId,
    });
    return this.postRepo.save(post);
  }

  async update(id: string, userId: string, data: Partial<{
    title: string;
    content: string;
    images: string[];
    category: string;
  }>) {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post) throw new Error('帖子不存在');
    if (post.author_id !== userId) throw new Error('无权编辑');

    Object.assign(post, data);
    return this.postRepo.save(post);
  }

  async delete(id: string, userId: string) {
    const post = await this.postRepo.findOne({ where: { id } });
    if (!post) throw new Error('帖子不存在');
    if (post.author_id !== userId) throw new Error('无权删除');

    post.status = 'deleted';
    return this.postRepo.save(post);
  }

  async findByAuthor(userId: string) {
    return this.postRepo.find({
      where: { author_id: userId, status: 'published' },
      order: { created_at: 'DESC' },
      relations: { author: true },
    });
  }

  // ===== Likes =====

  async toggleLike(userId: string, targetId: string, targetType: 'post' | 'comment') {
    const existing = await this.likeRepo.findOne({
      where: { user_id: userId, target_id: targetId, target_type: targetType },
    });

    if (existing) {
      // Unlike
      await this.likeRepo.remove(existing);
      if (targetType === 'post') {
        await this.postRepo.decrement({ id: targetId }, 'like_count', 1);
      } else {
        await this.commentRepo.decrement({ id: targetId }, 'like_count', 1);
      }
      return { liked: false };
    } else {
      // Like
      const like = this.likeRepo.create({
        user_id: userId,
        target_id: targetId,
        target_type: targetType,
      });
      await this.likeRepo.save(like);
      if (targetType === 'post') {
        await this.postRepo.increment({ id: targetId }, 'like_count', 1);
      } else {
        await this.commentRepo.increment({ id: targetId }, 'like_count', 1);
      }
      return { liked: true };
    }
  }

  async isLiked(userId: string, targetId: string, targetType: 'post' | 'comment') {
    const existing = await this.likeRepo.findOne({
      where: { user_id: userId, target_id: targetId, target_type: targetType },
    });
    return !!existing;
  }

  // ===== Comments =====

  async findComments(postId: string) {
    return this.commentRepo.find({
      where: { post_id: postId, status: 'published' },
      order: { created_at: 'ASC' },
      relations: { author: true },
    });
  }

  async createComment(userId: string, postId: string, data: {
    content: string;
    parent_id?: string;
  }) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new Error('帖子不存在');

    const comment = this.commentRepo.create({
      ...data,
      post_id: postId,
      author_id: userId,
    });
    const saved = await this.commentRepo.save(comment);

    // Increment comment count
    await this.postRepo.increment({ id: postId }, 'comment_count', 1);

    return saved;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new Error('评论不存在');
    if (comment.author_id !== userId) throw new Error('无权删除');

    comment.status = 'deleted';
    await this.commentRepo.save(comment);

    // Decrement comment count
    await this.postRepo.decrement({ id: comment.post_id }, 'comment_count', 1);

    return { message: '删除成功' };
  }
}
