"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Users, Building2, Plus, UserPlus, ShieldCheck, Fingerprint, KeyRound,
    Trash2, Database, CheckCircle2, XCircle, RefreshCw, X,
    Lock, ChevronRight, Save, Shield, Info, Briefcase, Activity
} from "lucide-react";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const AVAILABLE_ROLES = ["Admin", "Manager", "Staff"];

const PERMISSION_MAP = {
    "INBOUND_READ": { label: "รายการรับเข้า", desc: "เรียกดูใบรับสินค้า" },
    "INBOUND_CREATE": { label: "บันทึกรับเข้า", desc: "ลงทะเบียนสินค้าใหม่" },
    "OUTBOUND_READ": { label: "รายการจ่ายออก", desc: "เรียกดูใบเบิกจ่าย" },
    "OUTBOUND_CREATE": { label: "บันทึกจ่ายออก", desc: "ตัดสต็อกออกจากคลัง" },
    "INVENTORY_VIEW": { label: "ยอดคงเหลือ", desc: "เช็คจำนวนสินค้าจริง" },
    "INVENTORY_READ": { label: "ความเคลื่อนไหว", desc: "ดูประวัติสต็อก Card" },
    "INVENTORY_TRANSFER": { label: "โอนย้ายสินค้า", desc: "ย้ายระหว่างคลัง/โซน" },
    "INVENTORY_ADJUST": { label: "ปรับปรุงยอด", desc: "แก้ไขยอดตรวจนับจริง" },
    "PURCHASE_CREATE": { label: "เปิดใบสั่งซื้อ", desc: "สร้างเอกสาร PO" },
    "PR_READ": { label: "ดูใบขอซื้อ", desc: "รายการ PR ทั้งหมด" },
    "PR_CREATE": { label: "สร้างใบขอซื้อ", desc: "เปิดขอซื้อสินค้าใหม่" },
    "PR_APPROVE": { label: "อนุมัติขอซื้อ", desc: "สิทธิ์อนุมัติงบประมาณ" },
    "REQUISITION_CREATE": { label: "สร้างใบเบิก", desc: "ขอเบิกพัสดุใช้งาน" },
    "REQUISITION_APPROVE": { label: "อนุมัติเบิก", desc: "ยืนยันการจ่ายพัสดุ" },
    "MASTER_DATA_READ": { label: "ดูฐานข้อมูล", desc: "รายการสินค้า/คลัง" },
    "MASTER_DATA_CREATE": { label: "จัดการข้อมูล", desc: "เพิ่ม/แก้ข้อมูลพื้นฐาน" },
    "MASTER_EDITx": { label: "ตั้งค่าขั้นสูง", desc: "สิทธิ์แก้โครงสร้างระบบ" },
    "AUDIT_LOG_VIEW": { label: "ประวัติการใช้งาน", desc: "ตรวจสอบ Log พนักงาน" }
};

const PERMISSION_GROUPS = {
    "Logistics": ["INBOUND_READ", "INBOUND_CREATE", "OUTBOUND_READ", "OUTBOUND_CREATE"],
    "Inventory": ["INVENTORY_VIEW", "INVENTORY_READ", "INVENTORY_TRANSFER", "INVENTORY_ADJUST"],
    "Procurement": ["PURCHASE_CREATE", "PR_READ", "PR_CREATE", "PR_APPROVE"],
    "Requisition": ["REQUISITION_CREATE", "REQUISITION_APPROVE"],
    "System": ["MASTER_DATA_READ", "MASTER_DATA_CREATE", "MASTER_EDITx", "AUDIT_LOG_VIEW"]
};

export default function UserAndDeptManagementPage() {
    const [activeTab, setActiveTab] = useState("users");
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    const [userRows, setUserRows] = useState([]);
    const [username, setUsername] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("Staff");
    const [departmentId, setDepartmentId] = useState("");

    const [editingUserId, setEditingUserId] = useState(null);
    const [editUserForm, setEditUserForm] = useState({});

    const [deptRows, setDeptRows] = useState([]);
    const [newDeptName, setNewDeptName] = useState("");

    const [systemRoles, setSystemRoles] = useState([]);
    const [selectedRoleId, setSelectedRoleId] = useState(null);
    const [rolePerms, setRolePerms] = useState([]);

    const getUserRole = (u) => u.roles?.[0]?.role?.name || u.roles?.[0]?.name || "Staff";
    const togglePermission = (code) => setRolePerms(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try { const data = await apiFetch("/users"); setUserRows(Array.isArray(data) ? data : []); }
        catch (err) { toast.error("Load users failed"); } finally { setLoading(false); }
    }, []);

    const loadDepts = useCallback(async () => {
        try { const data = await apiFetch("/master/departments"); setDeptRows(data || []); } catch (err) { }
    }, []);

    const loadSecurity = useCallback(async () => {
        try {
            const rolesData = await apiFetch("/users/roles/list");
            setSystemRoles(rolesData || []);
            if (rolesData?.length > 0 && !selectedRoleId) setSelectedRoleId(rolesData[0].id);
        } catch (err) { }
    }, [selectedRoleId]);

    useEffect(() => { loadUsers(); loadDepts(); loadSecurity(); }, [loadUsers, loadDepts, loadSecurity]);

    useEffect(() => {
        if (activeTab === "security" && selectedRoleId) {
            apiFetch(`/users/roles/${selectedRoleId}/permissions`).then(res => setRolePerms(res || []));
        }
    }, [activeTab, selectedRoleId]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!username.trim() || !USERNAME_REGEX.test(username.trim())) return toast.error("Username ไม่ถูกต้อง");
        setLoading(true);
        try {
            const payload = { username, firstName, lastName, password, departmentId };
            const newUser = await apiFetch("/users", { method: "POST", body: JSON.stringify(payload) });

            if (newUser?.id) await apiFetch(`/users/${newUser.id}/roles`, { method: "POST", body: JSON.stringify({ roles: [role] }) });

            toast.success("เพิ่มบัญชีผู้ใช้สำเร็จ");
            setShowAddForm(false);
            setUsername(""); setFirstName(""); setLastName(""); setPassword(""); setDepartmentId("");
            loadUsers();
        } catch (err) { toast.error(err.message); } finally { setLoading(false); }
    };

    const startEditUser = (u) => {
        setEditingUserId(u.id);
        setEditUserForm({
            firstName: u.firstName, lastName: u.lastName,
            password: "", role: getUserRole(u), isActive: u.isActive,
            departmentId: u.departmentId || ""
        });
    };

    const saveEditUser = async (id) => {
        setLoading(true);
        try {
            const payload = {
                firstName: editUserForm.firstName,
                lastName: editUserForm.lastName,
                isActive: editUserForm.isActive,
                departmentId: editUserForm.departmentId || ""
            };

            if (editUserForm.password && editUserForm.password.trim() !== "") {
                payload.password = editUserForm.password;
            }

            await apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
            await apiFetch(`/users/${id}/roles`, { method: "POST", body: JSON.stringify({ roles: [editUserForm.role] }) });

            toast.success("บันทึกข้อมูลเรียบร้อย");
            setEditingUserId(null);
            loadUsers();
        } catch (err) { toast.error(err.message); } finally { setLoading(false); }
    };

    const handleDeleteUser = async (u) => {
        if (!confirm(`ยืนยันการลบ ${u.username}?`)) return;
        try { await apiFetch(`/users/${u.id}`, { method: "DELETE" }); toast.success("ลบสำเร็จ"); loadUsers(); } catch (err) { toast.error("ลบไม่ได้ ข้อมูลถูกใช้งานอยู่"); }
    };

    const handleCreateDept = async (e) => {
        e.preventDefault();
        if (!newDeptName.trim()) return;
        try { await apiFetch("/master/departments", { method: "POST", body: JSON.stringify({ name: newDeptName }) }); setNewDeptName(""); loadDepts(); toast.success("เพิ่มแผนกสำเร็จ"); } catch (err) { }
    };

    const handleDeleteDept = async (id) => {
        if (!confirm("ยืนยันลบแผนก?")) return;
        try { await apiFetch(`/master/departments/${id}`, { method: "DELETE" }); toast.success("ลบแผนกสำเร็จ"); loadDepts(); } catch (err) { toast.error("ลบไม่ได้ แผนกนี้มีพนักงานอยู่"); }
    };

    const handleSavePermissions = async () => {
        setLoading(true);
        try {
            await apiFetch(`/users/roles/${selectedRoleId}/permissions`, { method: "POST", body: JSON.stringify({ permissions: rolePerms }) });
            toast.success("อัปเดตสิทธิ์สำเร็จ (มีผลเมื่อ Login ใหม่)");
        } catch (err) { toast.error(err.message); } finally { setLoading(false); }
    };

    return (
        <AuthGate>
            <Toaster position="top-center" />
            <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-10 min-h-screen bg-slate-50/30">
                <header className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-200 pb-8">
                    <div>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Control Panel</h1>
                        <p className="text-slate-400 text-sm font-medium mt-1 uppercase tracking-widest">TJC Group Core Infrastructure</p>
                    </div>
                    <div className="flex bg-white p-1.5 rounded-[2rem] shadow-sm border border-slate-200">
                        <TabItem active={activeTab === 'users'} onClick={() => setActiveTab("users")} icon={Users} label="Accounts" />
                        <TabItem active={activeTab === 'depts'} onClick={() => setActiveTab("depts")} icon={Building2} label="Depts" />
                        <TabItem active={activeTab === 'security'} onClick={() => setActiveTab("security")} icon={Lock} label="Security" color="rose" />
                    </div>
                </header>

                <main>
                    {activeTab === "users" && (
                        <div className="space-y-8 animate-in fade-in">
                            {!showAddForm ? (
                                <button onClick={() => setShowAddForm(true)} className="group w-full bg-white border border-slate-200 p-8 rounded-[2.5rem] flex items-center justify-between hover:border-indigo-400 hover:shadow-xl transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform"><UserPlus className="w-8 h-8" /></div>
                                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Provision New Staff Account</h3>
                                    </div>
                                    <Plus className="w-6 h-6 text-slate-300 group-hover:text-indigo-600" />
                                </button>
                            ) : (
                                <div className="bg-white border-2 border-indigo-600 rounded-[3rem] p-10 shadow-2xl relative">
                                    <button onClick={() => setShowAddForm(false)} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500"><X size={32} /></button>
                                    <h2 className="text-2xl font-black text-slate-900 uppercase mb-8 flex items-center gap-3"><Fingerprint className="text-indigo-600" /> Enrollment</h2>
                                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <InputGroup label="Username" value={username} onChange={e => setUsername(e.target.value)} />
                                        <InputGroup label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} />
                                        <InputGroup label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} />
                                        <InputGroup label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />

                                        <div className="lg:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
                                            <select className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
                                                <option value="">-- ไม่ระบุแผนก --</option>
                                                {deptRows.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="lg:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Level</label>
                                            <select className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 text-sm font-black uppercase outline-none focus:bg-white focus:border-indigo-500 transition-all" value={role} onChange={e => setRole(e.target.value)}>{AVAILABLE_ROLES.map(r => <option key={r}>{r}</option>)}</select>
                                        </div>

                                        <button type="submit" disabled={loading} className="lg:col-span-4 mt-2 bg-slate-900 text-white rounded-2xl py-4 font-black text-[10px] uppercase hover:bg-indigo-600 transition-all shadow-lg">CREATE ACCOUNT</button>
                                    </form>
                                </div>
                            )}

                            <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b"><tr><th className="p-8">Staff Identity</th><th className="p-8 text-center">Group & Dept</th><th className="p-8 text-center">Status</th><th className="p-8 text-right">Actions</th></tr></thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {userRows.map(u => {
                                            const isEditing = editingUserId === u.id;
                                            return (
                                                <tr key={u.id} className={isEditing ? "bg-indigo-50/50" : "hover:bg-slate-50/80 group"}>
                                                    <td className="p-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">{u.firstName?.[0]}</div>
                                                            {isEditing ? (
                                                                <div className="flex flex-col gap-2 w-full max-w-[200px]">
                                                                    <input className="border rounded-lg px-3 py-1.5 text-xs font-bold w-full" value={editUserForm.firstName} onChange={e => setEditUserForm({ ...editUserForm, firstName: e.target.value })} placeholder="First Name" />
                                                                    <input className="border rounded-lg px-3 py-1.5 text-xs font-bold w-full" value={editUserForm.lastName} onChange={e => setEditUserForm({ ...editUserForm, lastName: e.target.value })} placeholder="Last Name" />
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <p className="font-black text-slate-800 uppercase text-sm">{u.firstName} {u.lastName}</p>
                                                                    <p className="text-[10px] font-bold text-indigo-500 uppercase mt-0.5">@{u.username}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-8 text-center">
                                                        {isEditing ? (
                                                            <div className="flex flex-col gap-2 items-center">
                                                                <select className="border rounded-lg text-xs px-3 py-1.5 font-black w-full max-w-[140px]" value={editUserForm.role} onChange={e => setEditUserForm({ ...editUserForm, role: e.target.value })}>{AVAILABLE_ROLES.map(r => <option key={r}>{r}</option>)}</select>
                                                                <select className="border rounded-lg text-[10px] px-3 py-1.5 font-bold w-full max-w-[140px] text-indigo-600" value={editUserForm.departmentId} onChange={e => setEditUserForm({ ...editUserForm, departmentId: e.target.value })}>
                                                                    <option value="">No Dept</option>
                                                                    {deptRows.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                                </select>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1.5">
                                                                <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{getUserRole(u)}</span>
                                                                {u.department && <span className="text-[9px] font-bold text-indigo-600 flex items-center gap-1"><Briefcase className="w-3 h-3" /> {u.department.name}</span>}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-8 text-center">
                                                        {isEditing ? (
                                                            <select className="border rounded-lg text-xs px-3 py-1.5 font-bold" value={String(editUserForm.isActive)} onChange={e => setEditUserForm({ ...editUserForm, isActive: e.target.value === 'true' })}><option value="true">Active</option><option value="false">Disabled</option></select>
                                                        ) : (
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${u.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{u.isActive ? "Active" : "Disabled"}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-8 text-right">
                                                        {isEditing ? (
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => saveEditUser(u.id)} disabled={loading} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-md">SAVE</button>
                                                                <button onClick={() => setEditingUserId(null)} className="bg-slate-200 text-slate-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Cancel</button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => startEditUser(u)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-all font-black text-[10px] uppercase">Edit</button>
                                                                <button onClick={() => handleDeleteUser(u)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "security" && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="lg:col-span-3 space-y-6">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Authority Groups</h3>
                                <div className="space-y-1.5">
                                    {systemRoles.map(r => (
                                        <button key={r.id} onClick={() => setSelectedRoleId(r.id)} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${selectedRoleId === r.id ? 'bg-white shadow-md border-l-4 border-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}>
                                            <div className="flex items-center gap-3"><Shield size={18} className={selectedRoleId === r.id ? 'text-indigo-600' : 'text-slate-300'} /><span className="font-black text-[11px] uppercase">{r.name}</span></div>
                                            <ChevronRight size={16} className={selectedRoleId === r.id ? 'opacity-100' : 'opacity-0'} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="lg:col-span-9">
                                <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
                                    <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-white sticky top-0 z-20 gap-4">
                                        <div><h2 className="text-xl font-black text-slate-900 uppercase italic flex items-center gap-2"><Lock className="text-indigo-600" /> Matrix Control</h2><p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 ml-7">Target Group: {systemRoles.find(r => r.id === selectedRoleId)?.name}</p></div>
                                        <button onClick={handleSavePermissions} disabled={loading} className="w-full md:w-auto bg-slate-900 text-white hover:bg-indigo-600 px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all flex items-center gap-2">{loading ? <RefreshCw className="animate-spin" /> : <Save size={16} />} Save Changes</button>
                                    </div>
                                    <div className="p-8 md:p-12 space-y-16">
                                        {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                                            <div key={group} className="space-y-6">
                                                <div className="flex items-center gap-4"><span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">{group} Module</span><div className="h-[1px] flex-1 bg-slate-100" /></div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                                    {perms.map(code => (
                                                        <PermissionToggle key={code} code={code} active={rolePerms.includes(code)} onToggle={() => togglePermission(code)} />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "depts" && (
                        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
                            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm text-center">
                                <Building2 className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
                                <h2 className="text-xl font-black uppercase text-slate-800">Department Registry</h2>
                                <p className="text-slate-400 text-sm mb-8">Structural organizational units management</p>
                                <form onSubmit={handleCreateDept} className="flex gap-4 max-w-md mx-auto">
                                    <input className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all" placeholder="Department Name..." value={newDeptName} onChange={e => setNewDeptName(e.target.value)} />
                                    <button className="bg-slate-900 text-white px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all">Add</button>
                                </form>
                            </div>
                            <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
                                {deptRows.map(d => (
                                    <div key={d.id} className="p-6 border-b border-slate-50 flex justify-between items-center hover:bg-slate-50 transition-colors px-10">
                                        <div className="flex items-center gap-4"><Briefcase className="text-slate-300" /><span className="font-black text-slate-800 uppercase text-xs">{d.name}</span></div>
                                        <button onClick={() => handleDeleteDept(d.id)} className="text-slate-200 hover:text-rose-500 transition-all"><Trash2 size={18} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </AuthGate>
    );
}

// --- Local Sub-components ---

function PermissionToggle({ code, active, onToggle }) {
    const info = PERMISSION_MAP[code] || { label: code, desc: "-" };
    return (
        <div onClick={onToggle} className={`group flex items-center justify-between p-5 rounded-[1.8rem] border-2 transition-all cursor-pointer ${active ? 'bg-indigo-50/40 border-indigo-100' : 'bg-white border-transparent hover:bg-slate-50'}`}>
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-300'}`}><ShieldCheck size={20} /></div>
                <div><h4 className={`text-[11px] font-black uppercase ${active ? 'text-indigo-900' : 'text-slate-700'}`}>{info.label}</h4><p className="text-[10px] font-bold text-slate-400 mt-0.5">{info.desc}</p></div>
            </div>
            <div className={`relative w-10 h-5 rounded-full transition-all duration-300 ${active ? 'bg-indigo-600' : 'bg-slate-200'}`}><div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${active ? 'translate-x-5' : ''}`} /></div>
        </div>
    );
}

function TabItem({ active, onClick, icon: Icon, label, color }) {
    const style = color === 'rose' ? "bg-rose-600 shadow-rose-100" : "bg-slate-900 shadow-slate-100";
    return (
        <button onClick={onClick} className={`flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] transition-all font-black text-[11px] uppercase ${active ? `${style} text-white shadow-xl` : 'text-slate-400 hover:text-slate-600'}`}>
            <Icon size={16} />{label}
        </button>
    );
}

function InputGroup({ label, ...props }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <input className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all" {...props} />
        </div>
    );
}