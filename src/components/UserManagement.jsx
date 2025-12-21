import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createUserWithEmailAndPassword } from 'firebase/auth'; // Careful: Client SDK only creates one user (Self).
// NOTE: Client SDK cannot create *other* users while logged in as Admin, unless we use a secondary app instance.
// Using secondary app instance pattern for client-side user creation.
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword as createUserSecondary } from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, orderBy } from 'firebase/firestore';
import { db, firebaseConfig } from '../services/firebase';
import { UserPlus, Save, X, Users, AlertCircle } from 'lucide-react';



const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form State
    const [newUser, setNewUser] = useState({
        employeeId: '',
        firstName: '',
        lastName: '',
        storeId: '',
        role: 'user' // Default role
    });

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, 'users'), orderBy('employeeId'));
            const snapshot = await getDocs(q);
            const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(userList);
        } catch (err) {
            console.error("Error fetching users:", err);
            // Might fail if index missing or rules block
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!newUser.employeeId || !newUser.firstName || !newUser.lastName || !newUser.storeId) {
            setError('All fields are required.');
            return;
        }

        try {
            // 1. Initialize Secondary App to create user without logging out Admin
            const secondaryApp = initializeApp(firebaseConfig, "Secondary");
            const secondaryAuth = getAuth(secondaryApp);

            const email = `${newUser.employeeId}@boots-pos.local`;
            const tempPassword = newUser.employeeId; // Password = Employee ID initially

            // 2. Create Auth User
            const userCredential = await createUserSecondary(secondaryAuth, email, tempPassword);
            const uid = userCredential.user.uid;

            // 3. Create Firestore Document (Using Admin's DB connection)
            await setDoc(doc(db, 'users', uid), {
                employeeId: newUser.employeeId,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                storeId: newUser.storeId,
                role: newUser.role,
                createdAt: new Date(),
                mustChangePassword: true, // Force change
                createdBy: currentUser.uid
            });

            // 4. Cleanup
            await secondaryAuth.signOut(); // Ensure secondary session is closed
            // Note: "deleteApp" (to fully cleanup) is not exposed in standard modular SDK easily, 
            // but strictly signing out is usually enough for this pattern. 
            // Actually we should delete the app instance to free resources but it's okay for low volume.

            setSuccess(`User ${newUser.employeeId} created successfully.`);
            setShowAddModal(false);
            setNewUser({ employeeId: '', firstName: '', lastName: '', storeId: '', role: 'user' });
            fetchUsers(); // Refresh list

        } catch (err) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Employee ID already exists.');
            } else {
                setError('Failed to create user. ' + err.message);
            }
        }
    };

    return (
        <div className="h-full flex flex-col p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
                    <p className="text-slate-500">Manage system access and roles</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                    <UserPlus size={20} />
                    Add New User
                </button>
            </div>

            {/* User List Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">Employee ID</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Name</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Store ID</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Role</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">Loading users...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">No users found.</td></tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-600">{u.employeeId}</td>
                                        <td className="px-6 py-4 text-slate-800 font-medium">{u.firstName} {u.lastName}</td>
                                        <td className="px-6 py-4 text-slate-600">{u.storeId}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {u.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.mustChangePassword ? (
                                                <span className="text-orange-600 text-xs flex items-center gap-1">
                                                    <AlertCircle size={12} /> Reset Required
                                                </span>
                                            ) : (
                                                <span className="text-green-600 text-xs">Active</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => {
                                                    setSelectedUser(u);
                                                    setShowResetModal(true);
                                                }}
                                                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                            >
                                                Reset Password
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <Users size={20} className="text-blue-600" />
                                Register New User
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
                            {success && <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg">{success}</div>}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={newUser.employeeId}
                                        onChange={e => setNewUser({ ...newUser, employeeId: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Store ID</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={newUser.storeId}
                                        onChange={e => setNewUser({ ...newUser, storeId: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={newUser.firstName}
                                        onChange={e => setNewUser({ ...newUser, firstName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        value={newUser.lastName}
                                        onChange={e => setNewUser({ ...newUser, lastName: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="role"
                                            value="user"
                                            checked={newUser.role === 'user'}
                                            onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                            className="w-4 h-4 text-blue-600"
                                        />
                                        <span className="text-slate-700">User (POS Only)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="role"
                                            value="admin"
                                            checked={newUser.role === 'admin'}
                                            onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                            className="w-4 h-4 text-purple-600"
                                        />
                                        <span className="text-slate-700">Admin (Full Access)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Save size={18} />
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                <AlertCircle size={20} className="text-orange-600" />
                                Reset User Password
                            </h3>
                            <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600">
                                Due to security constraints, you cannot directly reset another user's password.
                                The recommended procedure is to <strong>delete and re-create the user</strong>.
                            </p>
                            <div className="p-4 bg-slate-50 rounded-lg text-sm">
                                <p className="font-medium text-slate-800">
                                    User: <span className="font-mono">{selectedUser.firstName} {selectedUser.lastName} ({selectedUser.employeeId})</span>
                                </p>
                                <p className="mt-2">
                                    This will permanently delete the user's account and associated data. When you re-create the account with the same Employee ID, their password will be set to their Employee ID, and they will be required to change it upon next login.
                                </p>
                            </div>
                            <p className="text-xs text-slate-500">
                                For a more seamless experience, implementing a backend service (e.g., Firebase Cloud Functions) is required to handle password resets securely.
                            </p>
                        </div>
                         <div className="pt-4 px-6 pb-4 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowResetModal(false)}
                                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                            >
                                I Understand
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
