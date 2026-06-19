import client from './client';

export const listArticles = (params) => client.get('/articles', { params });
export const getArticle = (id) => client.get(`/articles/${id}`);
export const createArticle = (data) => client.post('/articles', data);
export const updateArticle = (id, data) => client.patch(`/articles/${id}`, data);
export const submitArticle = (id) => client.post(`/articles/${id}/submit`);
export const uploadMedia = (id, file) => {
  const form = new FormData();
  form.append('file', file);
  return client.post(`/articles/${id}/media`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const getMyArticles = () => client.get('/articles/mine');
export const getEditorQueue = () => client.get('/articles/queue/editor');
export const reviewArticle = (id, data) => client.post(`/articles/${id}/review`, data);
export const deleteArticle = (id) => client.delete(`/articles/${id}`);
export const addView = (id) => client.post(`/articles/${id}/views`);
