"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Users, Building2, Plus, UserPlus, ShieldCheck,
    Trash2, Database, CheckCircle2, RefreshCw, X,
    Lock, Save, Shield, Briefcase, Activity,
    AlertTriangle, ChevronRight, Settings
} from "lucide-react";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const AVAILABLE_ROLES = ["Admin", "Executive", "Purchasing", "Warehouse", "Staff"];

const PERMISSION_MAP = {
    "SYSTEM_SETTINGS_MANAGE": { label: "ตั้งค่าบริษัท", desc: "แก้ไขโลโก้และข้อมูลองค์กร" },
    "USER_MANAGE": { label: "จัดการผู้ใช้", desc: "เพิ่ม/ลด และกำหนดสิทธิ์พนักงาน" },
    "AUDIT_LOG_VIEW": { label: "ดูประวัติระบบ", desc: "ตรวจสอบ Log การใช้งานทั้งหมด" },
    "MASTER_DATA_READ": { label: "ดูฐานข้อมูลหลัก", desc: "รายการสินค้า หมวดหมู่ คู่ค้า" },
    "MASTER_DATA_MANAGE": { label: "จัดการฐานข้อมูล", desc: "เพิ่ม/แก้ไข สินค้าและคู่ค้า" },
    "WAREHOUSE_MANAGE": { label: "จัดการคลัง", desc: "สร้างและแก้ไขโครงสร้างคลัง/โซน" },
    "PR_READ": { label: "รายการใบขอซื้อ", desc: "ดูใบ PR ทั้งหมด" },
    "PR_CREATE": { label: "สร้างใบขอซื้อ", desc: "เปิดใบ PR เพื่อขออนุมัติซื้อ" },
    "PR_APPROVE": { label: "อนุมัติขอซื้อ", desc: "พิจารณาอนุมัติ/ปฏิเสธ PR" },
    "PO_MANAGE": { label: "จัดการใบสั่งซื้อ", desc: "สร้างและจัดการเอกสาร PO" },
    "INBOUND_READ": { label: "รายการรับเข้า", desc: "เรียกดูใบรับสินค้า (GR)" },
    "INBOUND_CREATE": { label: "บันทึกรับเข้า", desc: "สร้างใบรับสินค้าเข้าคลัง" },
    "OUTBOUND_READ": { label: "รายการจ่ายออก", desc: "เรียกดูใบเบิกจ่าย (DO)" },
    "OUTBOUND_CREATE": { label: "บันทึกจ่ายออก", desc: "สร้างใบจ่ายและตัดสต๊อก" },
    "REQUISITION_READ": { label: "รายการใบเบิก", desc: "ดูประวัติการขอเบิกภายใน" },
    "REQUISITION_CREATE": { label: "สร้างใบเบิก", desc: "ขอเบิกพัสดุหรือสินค้าไปใช้งาน" },
    "REQUISITION_APPROVE": { label: "อนุมัติเบิก", desc: "ตรวจสอบและอนุมัติการจ่ายของ" },
    "INVENTORY_READ": { label: "ยอดคงเหลือ", desc: "ดูยอดสต๊อกสินค้าคงเหลือ" },
    "MOVEMENT_READ": { label: "ประวัติการเคลื่อนไหว", desc: "ตรวจสอบความเคลื่อนไหว IN/OUT" },
    "TRANSFER_MANAGE": { label: "โอนย้ายสินค้า", desc: "สร้างใบส่งและรับสินค้าข้ามคลัง" },
    "ADJUSTMENT_MANAGE": { label: "ปรับปรุงยอด", desc: "แก้ไขยอด กรณีสินค้าเกิน/ขาดหาย" },
    "COUNT_TASK_MANAGE": { label: "ตรวจนับสต๊อก", desc: "สร้างและอนุมัติใบสั่งนับ (Count)" },
    "DASHBOARD_VIEW": { label: "หน้าภาพรวม", desc: "ดู Dashboard และกราฟสรุป" },
    "REPORT_EXPORT": { label: "ออกรายงาน", desc: "ดาวน์โหลดไฟล์ Excel และ PDF" }
};

const PERMISSION_GROUPS = {
    "ระบบและข้อมูลหลัก": ["SYSTEM_SETTINGS_MANAGE", "USER_MANAGE", "AUDIT_LOG_VIEW", "MASTER_DATA_READ", "MASTER_DATA_MANAGE", "WAREHOUSE_MANAGE"],
    "จัดซื้อ": ["PR_READ", "PR_CREATE", "PR_APPROVE", "PO_MANAGE"],
    "รับและจ่ายสินค้า": ["INBOUND_READ", "INBOUND_CREATE", "OUTBOUND_READ", "OUTBOUND_CREATE"],
    "เบิกภายใน": ["REQUISITION_READ", "REQUISITION_CREATE", "REQUISITION_APPROVE"],
    "คลังสินค้า": ["INVENTORY_READ", "MOVEMENT_READ", "TRANSFER_MANAGE", "ADJUSTMENT_MANAGE", "COUNT_TASK_MANAGE"],
    "รายงาน": ["DASHBOARD_VIEW", "REPORT_EXPORT"]
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

    const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
    const [confirmDeleteDept, setConfirmDeleteDept] = useState(null);
    const [confirmSavePerms, setConfirmSavePerms] = useState(false);

    const getUserRole = (u) => u.roles?.[0]?.role?.name || u.roles?.[0]?.name || "Staff";
    const togglePermission = (code) => setRolePerms(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try { const data = await apiFetch("/users"); setUserRows(Array.isArray(data) ? data : []); }
        catch (err) { toast.error("โหลดข้อมูลผู้ใช้งานล้มเหลว"); } finally { setLoading(false); }
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
        if (!username.trim() || !USERNAME_REGEX.test(username.trim())) return toast.error("รูปแบบชื่อผู้ใช้งานไม่ถูกต้อง");
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
            firstName: u.firstName, 
            lastName: u.lastName,
            password: "", 
            role: getUserRole(u), 
            isActive: u.isActive,
            departmentId: u.departmentId || ""
        });
    };

    const saveEditUser = async (id) => {
        setLoading(true);
        try {
            if (!editUserForm.firstName?.trim() || !editUserForm.lastName?.trim()) throw new Error("กรุณาระบุชื่อและนามสกุลให้ครบถ้วน");
            const payload = {
                firstName: editUserForm.firstName.trim(),
                lastName: editUserForm.lastName.trim(),
                isActive: editUserForm.isActive,
                departmentId: editUserForm.departmentId ? editUserForm.departmentId : null
            };
            if (editUserForm.password && editUserForm.password.trim() !== "") payload.password = editUserForm.password.trim();

            await apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
            if (editUserForm.role) await apiFetch(`/users/${id}/roles`, { method: "POST", body: JSON.stringify({ roles: [editUserForm.role] }) });

            toast.success("บันทึกการแก้ไขข้อมูลสำเร็จ");
            setEditingUserId(null);
            loadUsers();
        } catch (err) { toast.error(err.message || "ระบบปฏิเสธคำขอ โปรดตรวจสอบข้อมูล"); } finally { setLoading(false); }
    };

    const executeDeleteUser = async () => {
        if (!confirmDeleteUser) return;
        try {
            await apiFetch(`/users/${confirmDeleteUser.id}`, { method: "DELETE" });
            toast.success("ลบบัญชีผู้ใช้งานสำเร็จ");
            loadUsers();
        } catch (err) { toast.error("ลบไม่ได้ ข้อมูลนี้ถูกใช้งานอยู่ในระบบ"); } finally { setConfirmDeleteUser(null); }
    };

    const handleCreateDept = async (e) => {
        e.preventDefault();
        if (!newDeptName.trim()) return;
        try { await apiFetch("/master/departments", { method: "POST", body: JSON.stringify({ name: newDeptName }) }); setNewDeptName(""); loadDepts(); toast.success("เพิ่มแผนกสำเร็จ"); } catch (err) { }
    };

    const executeDeleteDept = async () => {
        if (!confirmDeleteDept) return;
        try {
            await apiFetch(`/master/departments/${confirmDeleteDept}`, { method: "DELETE" });
            toast.success("ลบแผนกสำเร็จ");
            loadDepts();
        } catch (err) { toast.error("ลบไม่ได้ แผนกนี้ยังมีพนักงานสังกัดอยู่"); } finally { setConfirmDeleteDept(null); }
    };

    const executeSavePermissions = async () => {
        setLoading(true);
        setConfirmSavePerms(false);
        try {
            await apiFetch(`/users/roles/${selectedRoleId}/permissions`, { method: "POST", body: JSON.stringify({ permissions: rolePerms }) });
            toast.success("อัปเดตสิทธิ์สำเร็จ (มีผลเมื่อเข้าสู่ระบบใหม่)");
        } catch (err) { toast.error(err.message); } finally { setLoading(false); }
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />

            {/* --- MODALS --- */}
            {confirmDeleteUser && (
                <ConfirmModal 
                    title="ยืนยันการลบผู้ใช้งาน?" 
                    desc={`คุณต้องการลบบัญชี @${confirmDeleteUser.username} ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`} 
                    onCancel={() => setConfirmDeleteUser(null)} 
                    onConfirm={executeDeleteUser} 
                    type="danger" 
                />
            )}
            {confirmDeleteDept && (
                <ConfirmModal 
                    title="ยืนยันการลบแผนก?" 
                    desc="คุณแน่ใจหรือไม่ที่จะลบแผนกนี้? หากยังมีพนักงานอยู่ในแผนก ระบบจะปฏิเสธการลบ" 
                    onCancel={() => setConfirmDeleteDept(null)} 
                    onConfirm={executeDeleteDept} 
                    type="danger" 
                />
            )}
            {confirmSavePerms && (
                <ConfirmModal 
                    title="ยืนยันการเปลี่ยนสิทธิ์?" 
                    desc="ระบบจะทำการอัปเดตสิทธิ์การเข้าถึงข้อมูลใหม่ทั้งหมดสำหรับกลุ่มผู้ใช้งานนี้" 
                    onCancel={() => setConfirmSavePerms(false)} 
                    onConfirm={executeSavePermissions} 
                    type="success" 
                />
            )}

            {/* --- MAIN PAGE --- */}
            <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 min-h-screen ">
                
                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-200/50 flex items-center justify-center border border-slate-300 shadow-sm shrink-0">
                            <Settings className="w-6 h-6 text-slate-700" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                แผงควบคุมระบบ (System Admin)
                            </h1>
                            <p className="text-sm text-slate-500 mt-1 font-medium flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                จัดการบัญชีผู้ใช้งาน สิทธิ์การเข้าถึง และโครงสร้างองค์กร
                            </p>
                        </div>
                    </div>
                </div>

                {/* TAB NAVIGATION */}
                <div className="flex gap-2 border-b border-slate-200 overflow-x-auto custom-scrollbar pb-1">
                    <TabBtn active={activeTab === 'users'} onClick={() => setActiveTab("users")} icon={<Users size={16} />} label="บัญชีผู้ใช้งาน" />
                    <TabBtn active={activeTab === 'security'} onClick={() => setActiveTab("security")} icon={<Lock size={16} />} label="สิทธิ์การใช้งาน (Roles)" />
                    <TabBtn active={activeTab === 'depts'} onClick={() => setActiveTab("depts")} icon={<Building2 size={16} />} label="โครงสร้างแผนก" />
                </div>

                <main className="pt-2">
                    
                    {/* =========================================
                        TAB 1: USERS MANAGEMENT
                    ========================================= */}
                    {activeTab === "users" && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {!showAddForm ? (
                                <button onClick={() => setShowAddForm(true)} className="w-full bg-white border border-slate-200 p-6 rounded-xl flex items-center justify-between hover:border-[#1F3B8B]/40 hover:shadow-md transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-[#1F3B8B]/10 rounded-lg flex items-center justify-center text-[#1F3B8B] group-hover:bg-[#1F3B8B] group-hover:text-white transition-colors">
                                            <UserPlus className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">สร้างบัญชีผู้ใช้งานใหม่</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">เพิ่มพนักงานเข้าสู่ระบบ</p>
                                        </div>
                                    </div>
                                    <Plus className="w-6 h-6 text-slate-400 group-hover:text-[#1F3B8B] transition-colors" />
                                </button>
                            ) : (
                                <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm relative">
                                    <button onClick={() => setShowAddForm(false)} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 transition-colors"><X size={24} /></button>
                                    <h2 className="text-lg font-bold text-slate-900 uppercase mb-8 flex items-center gap-2 border-b border-slate-100 pb-4">
                                        <UserPlus className="text-[#1F3B8B] w-5 h-5" /> ลงทะเบียนพนักงานใหม่
                                    </h2>
                                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <InputGroup label="ชื่อผู้ใช้ (Username)" value={username} onChange={e => setUsername(e.target.value)} placeholder="jhon_doe" required />
                                        <InputGroup label="ชื่อจริง" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="สมชาย" required />
                                        <InputGroup label="นามสกุล" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="ใจดี" required />
                                        <InputGroup label="รหัสผ่าน" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />

                                        <div className="lg:col-span-2 space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">แผนก (Department)</label>
                                            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:bg-white transition-all cursor-pointer" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
                                                <option value="">-- ไม่ระบุแผนก --</option>
                                                {deptRows.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="lg:col-span-2 space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">สิทธิ์ (Role)</label>
                                            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:bg-white transition-all cursor-pointer" value={role} onChange={e => setRole(e.target.value)}>
                                                {AVAILABLE_ROLES.map(r => <option key={r}>{r}</option>)}
                                            </select>
                                        </div>

                                        <div className="lg:col-span-4 mt-4 flex justify-end">
                                            <button type="submit" disabled={loading} className="bg-[#1F3B8B] text-white rounded-lg px-10 py-3.5 font-bold text-xs uppercase tracking-widest hover:bg-blue-900 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
                                                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                บันทึกบัญชีผู้ใช้
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left border-collapse">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                <th className="px-6 py-4">ข้อมูลพนักงาน</th>
                                                <th className="px-6 py-4 text-center">สิทธิ์ / แผนก</th>
                                                <th className="px-6 py-4 text-center">สถานะ</th>
                                                <th className="px-6 py-4 text-right">ดำเนินการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {userRows.map(u => {
                                                const isEditing = editingUserId === u.id;
                                                return (
                                                    <tr key={u.id} className={isEditing ? "bg-slate-50" : "hover:bg-slate-50/50 transition-colors group"}>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm uppercase">{u.firstName?.[0] || 'U'}</div>
                                                                {isEditing ? (
                                                                    <div className="flex flex-col gap-2 w-full max-w-[250px]">
                                                                        <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-[#1F3B8B] outline-none text-slate-900" value={editUserForm.firstName} onChange={e => setEditUserForm({ ...editUserForm, firstName: e.target.value })} placeholder="ชื่อจริง" />
                                                                        <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-[#1F3B8B] outline-none text-slate-900" value={editUserForm.lastName} onChange={e => setEditUserForm({ ...editUserForm, lastName: e.target.value })} placeholder="นามสกุล" />
                                                                        <input type="text" className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:border-[#1F3B8B] outline-none text-slate-900 placeholder:text-slate-400 placeholder:font-medium" value={editUserForm.password} onChange={e => setEditUserForm({ ...editUserForm, password: e.target.value })} placeholder="เปลี่ยนรหัสผ่าน (เว้นว่างได้)" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-slate-900">{u.firstName} {u.lastName}</span>
                                                                        <span className="text-[10px] font-bold text-slate-500 tracking-wider">@{u.username}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center align-middle">
                                                            {isEditing ? (
                                                                <div className="flex flex-col gap-2 items-center">
                                                                    <select className="border border-slate-200 rounded-lg text-sm px-3 py-2 font-bold w-full max-w-[160px] text-slate-900 outline-none focus:border-[#1F3B8B]" value={editUserForm.role} onChange={e => setEditUserForm({ ...editUserForm, role: e.target.value })}>{AVAILABLE_ROLES.map(r => <option key={r}>{r}</option>)}</select>
                                                                    <select className="border border-slate-200 rounded-lg text-sm px-3 py-2 font-bold w-full max-w-[160px] text-slate-900 outline-none focus:border-[#1F3B8B]" value={editUserForm.departmentId} onChange={e => setEditUserForm({ ...editUserForm, departmentId: e.target.value })}>
                                                                        <option value="">No Dept</option>
                                                                        {deptRows.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                                    </select>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-1.5">
                                                                    <span className="bg-[#1F3B8B]/10 text-[#1F3B8B] px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">{getUserRole(u)}</span>
                                                                    {u.department && <span className="text-[10px] font-bold text-slate-500">{u.department.name}</span>}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center align-middle">
                                                            {isEditing ? (
                                                                <select className="border border-slate-200 rounded-lg text-sm px-3 py-2 font-bold text-slate-900 outline-none focus:border-[#1F3B8B]" value={String(editUserForm.isActive)} onChange={e => setEditUserForm({ ...editUserForm, isActive: e.target.value === 'true' })}><option value="true">Active</option><option value="false">Suspended</option></select>
                                                            ) : (
                                                                <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{u.isActive ? "Active" : "Suspended"}</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right align-middle">
                                                            {isEditing ? (
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => setEditingUserId(null)} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold uppercase hover:bg-slate-200 transition-colors">ยกเลิก</button>
                                                                    <button onClick={() => saveEditUser(u.id)} disabled={loading} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-[11px] font-bold uppercase shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50">บันทึก</button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-end gap-2">
                                                                    <button onClick={() => startEditUser(u)} className="p-2 text-slate-400 hover:text-[#1F3B8B] hover:bg-blue-50 rounded-lg transition-colors font-bold text-xs uppercase">Edit</button>
                                                                    <button onClick={() => setConfirmDeleteUser(u)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* =========================================
                        TAB 2: ROLE & PERMISSION MATRIX
                    ========================================= */}
                    {activeTab === "security" && (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                            
                            {/* Role Selector */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                {systemRoles.map(r => {
                                    const isSelected = selectedRoleId === r.id;
                                    return (
                                        <button
                                            key={r.id}
                                            onClick={() => setSelectedRoleId(r.id)}
                                            className={`p-3 rounded-xl border text-sm font-bold uppercase tracking-wider transition-all duration-200 ${
                                                isSelected 
                                                    ? 'bg-[#1F3B8B] border-[#1F3B8B] text-white shadow-md' 
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-[#1F3B8B]/40 hover:bg-slate-50'
                                            }`}
                                        >
                                            {r.name}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Matrix Control */}
                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                                    <div>
                                        <h2 className="text-sm font-bold uppercase text-slate-900 flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-[#1F3B8B]" /> ตารางสิทธิ์การใช้งาน (Access Matrix)
                                        </h2>
                                        <p className="text-xs text-slate-500 font-medium mt-1">
                                            สิทธิ์สำหรับกลุ่ม: <span className="font-bold text-[#1F3B8B]">{systemRoles.find(r => r.id === selectedRoleId)?.name}</span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setConfirmSavePerms(true)}
                                        disabled={loading}
                                        className="w-full sm:w-auto bg-[#1F3B8B] text-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-900 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" /> บันทึกสิทธิ์
                                    </button>
                                </div>
                                
                                <div className="p-6 space-y-8">
                                    {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                                        <div key={group} className="space-y-4">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">{group}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                {perms.map(code => (
                                                    <PermissionToggle key={code} code={code} active={rolePerms.includes(code)} onToggle={() => togglePermission(code)} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* =========================================
                        TAB 3: DEPARTMENTS
                    ========================================= */}
                    {activeTab === "depts" && (
                        <div className="max-w-4xl space-y-6 animate-in fade-in duration-300">
                            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
                                <h2 className="text-base font-bold uppercase text-slate-900 mb-4 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-[#1F3B8B]" /> เพิ่มแผนกใหม่
                                </h2>
                                <form onSubmit={handleCreateDept} className="flex flex-col sm:flex-row gap-3">
                                    <input className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold text-slate-900 focus:border-[#1F3B8B] focus:bg-white outline-none transition-all placeholder:text-slate-400" placeholder="ระบุชื่อแผนก..." value={newDeptName} onChange={e => setNewDeptName(e.target.value)} />
                                    <button className="bg-[#1F3B8B] text-white px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-900 transition-all shadow-sm flex items-center justify-center gap-2 shrink-0">
                                        <Plus className="w-4 h-4" /> บันทึกแผนก
                                    </button>
                                </form>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                {deptRows.length === 0 ? (
                                    <div className="p-16 text-center text-slate-400 font-medium text-sm">ยังไม่มีข้อมูลแผนกในระบบ</div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {deptRows.map(d => (
                                            <div key={d.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                <span className="font-bold text-slate-700 ml-2">{d.name}</span>
                                                <button onClick={() => setConfirmDeleteDept(d.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </AuthGate>
    );
}

// --- SUB-COMPONENTS ---

function TabBtn({ active, onClick, icon, label }) {
    return (
        <button 
            onClick={onClick} 
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs uppercase tracking-widest transition-colors whitespace-nowrap ${
                active 
                    ? 'border-[#1F3B8B] text-[#1F3B8B]' 
                    : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
            {icon} {label}
        </button>
    );
}

function InputGroup({ label, value, onChange, placeholder, type = "text", required = false }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <input 
                type={type} 
                value={value} 
                onChange={onChange} 
                required={required}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:bg-white transition-all placeholder:text-slate-300 placeholder:font-medium" 
                placeholder={placeholder} 
            />
        </div>
    );
}

function PermissionToggle({ code, active, onToggle }) {
    const info = PERMISSION_MAP[code] || { label: code, desc: "-" };
    return (
        <div onClick={onToggle} className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
            active ? 'bg-[#1F3B8B]/5 border-[#1F3B8B]/40 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }`}>
            <div>
                <h4 className={`text-xs font-bold uppercase ${active ? 'text-[#1F3B8B]' : 'text-slate-700'}`}>{info.label}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{info.desc}</p>
            </div>
            <div className={`relative w-10 h-5 rounded-full transition-all duration-200 ${active ? 'bg-[#1F3B8B]' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${active ? 'translate-x-5' : ''}`} />
            </div>
        </div>
    );
}

function ConfirmModal({ title, desc, onCancel, onConfirm, type }) {
    const isDanger = type === 'danger';
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 border ${isDanger ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-[#1F3B8B]/10 border-[#1F3B8B]/20 text-[#1F3B8B]'}`}>
                    {isDanger ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-xs text-slate-500 mb-8 leading-relaxed">{desc}</p>
                <div className="flex w-full gap-3">
                    <button onClick={onCancel} className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-lg font-bold text-xs uppercase hover:bg-slate-100 transition-colors border border-slate-200">ยกเลิก</button>
                    <button onClick={onConfirm} className={`flex-1 text-white py-3 rounded-lg font-bold text-xs uppercase shadow-sm transition-all ${isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#1F3B8B] hover:bg-blue-900'}`}>
                        ยืนยัน
                    </button>
                </div>
            </div>
        </div>
    );
}