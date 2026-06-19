import { useEffect, useState } from 'react';
import { listUsers, approveUser, assignRole } from '../../api/admin';
import AdminNav from '../../components/AdminNav';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const res = await listUsers();
      setUsers(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    try {
      await approveUser(id);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Approve failed');
    }
  }

  async function handleRole(id, role) {
    try {
      await assignRole(id, role);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Role assignment failed');
    }
  }

  if (loading) return <div className="loading">Loading users...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="container">
      <AdminNav />
      <h1 className="page-title">Manage Users</h1>

      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.user_id}>
                <td>{u.full_name}</td>
                <td>{u.email}</td>
                <td>{u.roles || 'reader'}</td>
                <td>
                  {!u.roles?.includes('reader') && <button className="btn btn-secondary" onClick={() => handleApprove(u.user_id)}>Approve Reader</button>}
                  {!u.roles?.includes('journalist') && <button className="btn btn-secondary" onClick={() => handleRole(u.user_id, 'journalist')}>Make Journalist</button>}
                  {!u.roles?.includes('editor') && <button className="btn btn-secondary" onClick={() => handleRole(u.user_id, 'editor')}>Make Editor</button>}
                  {!u.roles?.includes('administrator') && <button className="btn btn-secondary" onClick={() => handleRole(u.user_id, 'administrator')}>Make Admin</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-table">
        {users.map((u) => (
          <div key={u.user_id} className="mobile-table-row">
            <div className="mobile-table-header">Name</div>
            <div className="mobile-table-cell">{u.full_name}</div>

            <div className="mobile-table-header">Email</div>
            <div className="mobile-table-cell">{u.email}</div>

            <div className="mobile-table-header">Roles</div>
            <div className="mobile-table-cell">{u.roles || 'reader'}</div>

            <div className="mobile-table-actions">
              {!u.roles?.includes('reader') && <button className="btn btn-secondary" onClick={() => handleApprove(u.user_id)}>Approve Reader</button>}
              {!u.roles?.includes('journalist') && <button className="btn btn-secondary" onClick={() => handleRole(u.user_id, 'journalist')}>Make Journalist</button>}
              {!u.roles?.includes('editor') && <button className="btn btn-secondary" onClick={() => handleRole(u.user_id, 'editor')}>Make Editor</button>}
              {!u.roles?.includes('administrator') && <button className="btn btn-secondary" onClick={() => handleRole(u.user_id, 'administrator')}>Make Admin</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
