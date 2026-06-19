import client from './client';

export const listUsers = () => client.get('/admin/users');
export const approveUser = (id) => client.patch(`/admin/users/${id}/approve`);
export const assignRole = (id, role) => client.patch(`/admin/users/${id}/roles`, { role_name: role });
export const deleteUser = (id) => client.delete(`/admin/users/${id}`);
export const listSources = () => client.get('/admin/scraper/sources');
export const createSource = (data) => client.post('/admin/scraper/sources', data);
export const updateSource = (id, isActive) => client.patch(`/admin/scraper/sources/${id}`, { is_active: isActive });
export const runScraper = () => client.post('/admin/scraper/run');
export const getLastRun = () => client.get('/admin/scraper/runs/last');
export const refreshImages = () => client.post('/admin/images/refresh');
