/**
 * 论坛 API：帖子信息流/详情/发布/编辑/删除、评论、点赞/收藏/关注、我的论坛。
 * 调用方式照 eventApi.js：client 已封装 baseURL=/api/v1、JWT 注入、code≠0 抛错、统一解包。
 */
import client from './client';

/** 帖子列表：{page,page_size,sort:'latest'|'hot',topic,keyword,author_id} → {list,total,page,page_size} */
export function listPosts(params) {
  return client.get('/forum/posts', { params });
}

/** 帖子详情 → {post,comments,liked,favorited,following} */
export function getPost(id) {
  return client.get(`/forum/posts/${id}`);
}

/** 发帖：{title,content,media:{videos:[]},topics:[]} → {post} */
export function createPost(body) {
  return client.post('/forum/posts', body);
}

/** 编辑帖子（全量） → {post} */
export function updatePost(id, body) {
  return client.put(`/forum/posts/${id}`, body);
}

/** 删除帖子 → null */
export function deletePost(id) {
  return client.delete(`/forum/posts/${id}`);
}

/** 发表评论：{content,parent_id} → {comment} */
export function addComment(id, body) {
  return client.post(`/forum/posts/${id}/comments`, body);
}

/** 删除评论 → null */
export function deleteComment(id) {
  return client.delete(`/forum/comments/${id}`);
}

/** 点赞 / 再点取消 → {liked} */
export function likePost(id) {
  return client.post(`/forum/posts/${id}/like`);
}

/** 收藏 / 再点取消 → {favorited} */
export function favoritePost(id) {
  return client.post(`/forum/posts/${id}/favorite`);
}

/** 关注 / 再点取消 → {following} */
export function followUser(id) {
  return client.post(`/forum/users/${id}/follow`);
}

/** 我的帖子 → {list,total,page,page_size} */
export function myPosts(params) {
  return client.get('/forum/me/posts', { params });
}

/** 我的评论（带帖子标题） → {list,total,page,page_size} */
export function myComments(params) {
  return client.get('/forum/me/comments', { params });
}

/** 我的收藏 → {list,total,page,page_size} */
export function myFavorites(params) {
  return client.get('/forum/me/favorites', { params });
}

/** 我的点赞 → {list,total,page,page_size} */
export function myLikes(params) {
  return client.get('/forum/me/likes', { params });
}
