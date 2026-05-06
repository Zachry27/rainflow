import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/');
            return;
        }
        
        // Fetch users from backend (we will create this endpoint next)
        const fetchUsers = async () => {
            try {
                const res = await fetch('/v1/admin/users', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setUsers(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [user, token, navigate]);

    if (!user || user.role !== 'admin') return null;

    return (
        <div style={{ padding: '2rem', background: '#111', minHeight: '100vh', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Admin Dashboard</h2>
                <button 
                    onClick={() => navigate('/')}
                    style={{ padding: '8px 16px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Back to App
                </button>
            </div>
            
            <div style={{ background: '#222', padding: '1.5rem', borderRadius: '8px', border: '1px solid #333' }}>
                <h3>Users List</h3>
                {loading ? (
                    <p>Loading users...</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #444', textAlign: 'left' }}>
                                <th style={{ padding: '10px' }}>ID</th>
                                <th style={{ padding: '10px' }}>Username</th>
                                <th style={{ padding: '10px' }}>Role</th>
                                <th style={{ padding: '10px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid #333' }}>
                                    <td style={{ padding: '10px' }}>{u.id}</td>
                                    <td style={{ padding: '10px' }}>{u.username}</td>
                                    <td style={{ padding: '10px' }}>
                                        <span style={{ 
                                            background: u.role === 'admin' ? '#d32f2f' : '#1976d2',
                                            padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem'
                                        }}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        {/* Actions will go here */}
                                        <button style={{ background: 'transparent', border: '1px solid #666', color: '#ccc', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}>Edit Role</button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '1rem', color: '#aaa' }}>No users found or endpoint not ready</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
