"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Users, Building2, Plus, UserPlus, ShieldCheck,
    Trash2, CheckCircle2, RefreshCw, X,
    Lock, Save, Shield, AlertTriangle, Settings,
    ChevronDown, ChevronUp,Activity
} from "lucide-react";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

// 💡 ชื่อตำแหน่งภาษาไทยสำหรับแสดงผล
const ROLE_DISPLAY_NAMES = {
    "Admin": "ผู้ดูแลระบบ (Admin)",
    "CEO": "ประธานเจ้าหน้าที่บริหาร (CEO)",
    "Director": "ผู้อำนวยการ (Director)",
    "Department Manager": "ผู้จัดการแผนก (Department Manager)",
    "Purchasing": "เจ้าหน้าที่จัดซื้อ (Purchasing)",
    "Warehouse": "เจ้าหน้าที่คลังสินค้า (Warehouse)",
    "Staff": "พนักงานทั่วไป (Staff)"
};

const AVAILABLE_ROLES = Object.values(ROLE_DISPLAY_NAMES);

// 💡 จัดกลุ่มสิทธิ์แยกตามหน้าที่ของแต่ละตำแหน่ง (ภาษาไทย)
const ROLE_BASED_PERMISSIONS = {
    "กลุ่มสิทธิ์สำหรับผู้บริหาร / ผู้อนุมัติ": {
        "DASHBOARD_VIEW": { label: "ดูหน้าภาพรวมระบบ", desc: "เข้าถึง Dashboard และสถิติสำคัญ" },
        "PR_APPROVE_L1": { label: "ผู้อนุมัติ PR ด่านที่ 1", desc: "สิทธิ์สำหรับผู้จัดการแผนก" },
        "PR_APPROVE_L2": { label: "ผู้อนุมัติ PR ด่านที่ 2", desc: "สิทธิ์สำหรับผู้อำนวยการ (ยอด > 10,000)" },
        "PR_APPROVE_L3": { label: "ผู้อนุมัติ PR ด่านที่ 3", desc: "สิทธิ์สำหรับ CEO (ยอด > 100,000)" },
        "REQUISITION_APPROVE": { label: "อนุมัติใบเบิกพัสดุ", desc: "ตรวจสอบและยืนยันการขอเบิกภายใน" },
        "AUDIT_LOG_VIEW": { label: "ตรวจสอบประวัติระบบ", desc: "ดู Log การใช้งานย้อนหลังของทุกคน" },
    },
    "กลุ่มสิทธิ์จัดซื้อ (Procurement)": {
        "PR_READ": { label: "ดูรายการใบขอซื้อ", desc: "เรียกดูเอกสาร PR ทั้งหมดในระบบ" },
        "PR_CREATE": { label: "สร้างใบขอซื้อ", desc: "เปิดใบ PR ใหม่เพื่อขออนุมัติ" },
        "PO_MANAGE": { label: "จัดการใบสั่งซื้อ (PO)", desc: "สร้างและออกเอกสารใบสั่งซื้อสินค้า" },
        "MASTER_DATA_READ": { label: "ดูข้อมูลคู่ค้าและสินค้า", desc: "เข้าถึงรายชื่อ Supplier และ Catalog" },
    },
    "กลุ่มสิทธิ์จัดการคลังสินค้า (Warehouse)": {
        "INBOUND_CREATE": { label: "บันทึกรับสินค้าเข้า", desc: "ทำใบรับสินค้า (GR) และเอาของเข้าชั้นวาง" },
        "OUTBOUND_CREATE": { label: "บันทึกจ่ายสินค้าออก", desc: "ตัดสต๊อกตามใบเบิกหรือใบสั่งขาย" },
        "TRANSFER_MANAGE": { label: "โอนย้ายระหว่างคลัง", desc: "สร้างใบส่งและใบรับสินค้าข้ามสาขา/โซน" },
        "INVENTORY_READ": { label: "ดูยอดคงเหลือ", desc: "ตรวจสอบจำนวนสินค้าที่เหลือจริงในแต่ละจุด" },
        "MOVEMENT_READ": { label: "ดูความเคลื่อนไหวสต็อก", desc: "ตรวจสอบประวัติการเข้า-ออกของสินค้า" },
        "COUNT_TASK_MANAGE": { label: "ตรวจนับ/ปรับปรุงยอด", desc: "สร้างใบสั่งนับสต๊อกและแก้ตัวเลขให้ตรงจริง" },
        "WAREHOUSE_MANAGE": { label: "จัดการโครงสร้างคลัง", desc: "เพิ่ม/ลด โซน และตำแหน่งจัดเก็บ" },
    },
    "กลุ่มสิทธิ์พนักงานทั่วไป (Requisition)": {
        "REQUISITION_CREATE": { label: "สร้างใบเบิกของ", desc: "ขอเบิกพัสดุไปใช้ในงานของแผนก" },
        "REQUISITION_READ": { label: "ดูประวัติใบเบิก", desc: "ติดตามสถานะของที่ตัวเองขอเบิกไป" },
    },
    "กลุ่มสิทธิ์ตั้งค่าระบบ (System Admin)": {
        "USER_MANAGE": { label: "จัดการบัญชีผู้ใช้", desc: "เพิ่ม/แก้ไข พนักงานและกำหนดสิทธิ์" },
        "SYSTEM_SETTINGS_MANAGE": { label: "ตั้งค่าข้อมูลบริษัท", desc: "แก้ไขชื่อบริษัท โลโก้ และที่อยู่" },
        "MASTER_DATA_MANAGE": { label: "จัดการฐานข้อมูลหลัก", desc: "เพิ่ม/แก้ไข รายการสินค้าและหมวดหมู่" },
        "REPORT_EXPORT": { label: "ส่งออกรายงาน", desc: "ดาวน์โหลดข้อมูลเป็นไฟล์ Excel และ PDF" },
    }
};

export default function UserAndDeptManagementPage() {
    const [activeTab, setActiveTab] = useState("users");
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    
    // State สำหรับ UI การพับ/เปิด กลุ่มสิทธิ์
    const [expandedGroups, setExpandedGroups] = useState(Object.keys(ROLE_BASED_PERMISSIONS));

    const [userRows, setUserRows] = useState([]);
    const [username, setUsername] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("พนักงานทั่วไป (Staff)");
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

    const toggleGroup = (groupName) => {
        setExpandedGroups(prev => prev.includes(groupName) ? prev.filter(g => g !== groupName) : [...prev, groupName]);
    };

    const getUserRole = (u) => u.roles?.[0]?.role?.name || u.roles?.[0]?.name || "พนักงานทั่วไป (Staff)";
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
            toast.success("อัปเดตสิทธิ์สำเร็จ (มีผลเมื่อพนักงานเข้าสู่ระบบใหม่)");
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
                    desc="ระบบจะทำการอัปเดตสิทธิ์การเข้าถึงข้อมูลใหม่ทั้งหมดสำหรับกลุ่มผู้ใช้งานนี้ การเปลี่ยนแปลงจะมีผลทันที" 
                    onCancel={() => setConfirmSavePerms(false)} 
                    onConfirm={executeSavePermissions} 
                    type="success" 
                />
            )}

            {/* --- MAIN PAGE --- */}
            <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 min-h-screen">
                
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
                                จัดการบัญชีผู้ใช้ และกำหนดสิทธิ์ตามตำแหน่งพนักงาน
                            </p>
                        </div>
                    </div>
                </div>

                {/* TAB NAVIGATION */}
                <div className="flex gap-2 border-b border-slate-200 overflow-x-auto custom-scrollbar pb-1">
                    <TabBtn active={activeTab === 'users'} onClick={() => setActiveTab("users")} icon={<Users size={16} />} label="จัดการบัญชี" />
                    <TabBtn active={activeTab === 'security'} onClick={() => setActiveTab("security")} icon={<Lock size={16} />} label="ตั้งค่าสิทธิ์ตามตำแหน่ง" />
                    <TabBtn active={activeTab === 'depts'} onClick={() => setActiveTab("depts")} icon={<Building2 size={16} />} label="แผนกและหน่วยงาน" />
                </div>

                <main className="pt-2">
                    
                    {activeTab === "users" && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {!showAddForm ? (
                                <button onClick={() => setShowAddForm(true)} className="w-full bg-white border border-slate-200 p-6 rounded-xl flex items-center justify-between hover:border-[#1F3B8B]/40 hover:shadow-md transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-[#1F3B8B]/10 rounded-lg flex items-center justify-center text-[#1F3B8B] group-hover:bg-[#1F3B8B] group-hover:text-white transition-colors">
                                            <UserPlus className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">สร้างบัญชีผู้ใช้ใหม่</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">เพิ่มพนักงานเข้าสู่ระบบ</p>
                                        </div>
                                    </div>
                                    <Plus className="w-6 h-6 text-slate-400 group-hover:text-[#1F3B8B] transition-colors" />
                                </button>
                            ) : (
                                <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm relative">
                                    <button onClick={() => setShowAddForm(false)} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 transition-colors"><X size={24} /></button>
                                    <h2 className="text-lg font-bold text-slate-900 uppercase mb-8 flex items-center gap-2 border-b border-slate-100 pb-4">
                                        <UserPlus className="text-[#1F3B8B] w-5 h-5" /> แบบฟอร์มเพิ่มพนักงาน
                                    </h2>
                                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <InputGroup label="ชื่อผู้ใช้ (Username)" value={username} onChange={e => setUsername(e.target.value)} placeholder="jhon_doe" required />
                                        <InputGroup label="ชื่อจริง" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="สมชาย" required />
                                        <InputGroup label="นามสกุล" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="ใจดี" required />
                                        <InputGroup label="รหัสผ่านชั่วคราว" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />

                                        <div className="lg:col-span-2 space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">สังกัดแผนก</label>
                                            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:bg-white transition-all cursor-pointer" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
                                                <option value="">-- ไม่ระบุแผนก --</option>
                                                {deptRows.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="lg:col-span-2 space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">ตำแหน่ง</label>
                                            <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-[#1F3B8B] focus:bg-white transition-all cursor-pointer" value={role} onChange={e => setRole(e.target.value)}>
                                                {AVAILABLE_ROLES.map(r => <option key={r}>{r}</option>)}
                                            </select>
                                        </div>

                                        <div className="lg:col-span-4 mt-4 flex justify-end">
                                            <button type="submit" disabled={loading} className="bg-[#1F3B8B] text-white rounded-lg px-10 py-3.5 font-bold text-xs uppercase tracking-widest hover:bg-blue-900 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
                                                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                ยืนยันการเพิ่มพนักงาน
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
                                                <th className="px-6 py-4 text-center">ตำแหน่ง / แผนก</th>
                                                <th className="px-6 py-4 text-center">สถานะ</th>
                                                <th className="px-6 py-4 text-right">ดำเนินการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {userRows.map(u => {
                                                const isEditing = editingUserId === u.id;
                                                const currentRole = getUserRole(u);
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
                                                                    <select className="border border-slate-200 rounded-lg text-xs px-3 py-2 font-bold w-full max-w-[200px] text-slate-900 outline-none focus:border-[#1F3B8B]" value={editUserForm.role} onChange={e => setEditUserForm({ ...editUserForm, role: e.target.value })}>{AVAILABLE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select>
                                                                    <select className="border border-slate-200 rounded-lg text-xs px-3 py-2 font-bold w-full max-w-[200px] text-slate-900 outline-none focus:border-[#1F3B8B]" value={editUserForm.departmentId} onChange={e => setEditUserForm({ ...editUserForm, departmentId: e.target.value })}>
                                                                        <option value="">ไม่มีแผนกสังกัด</option>
                                                                        {deptRows.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                                    </select>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-1.5">
                                                                    <span className="bg-[#1F3B8B]/10 text-[#1F3B8B] px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">{currentRole}</span>
                                                                    {u.department ? <span className="text-[10px] font-bold text-slate-500">{u.department.name}</span> : <span className="text-[10px] text-slate-300">-</span>}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-center align-middle">
                                                            {isEditing ? (
                                                                <select className="border border-slate-200 rounded-lg text-xs px-3 py-2 font-bold text-slate-900 outline-none focus:border-[#1F3B8B]" value={String(editUserForm.isActive)} onChange={e => setEditUserForm({ ...editUserForm, isActive: e.target.value === 'true' })}><option value="true">Active</option><option value="false">Suspended</option></select>
                                                            ) : (
                                                                <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>{u.isActive ? "ปกติ" : "ระงับ"}</span>
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
                                                                    <button onClick={() => startEditUser(u)} className="p-2 text-slate-400 hover:text-[#1F3B8B] hover:bg-blue-50 rounded-lg transition-colors font-bold text-xs uppercase">แก้ไข</button>
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
                        TAB 2: SECURITY MATRIX (ปรับแต่งใหม่)
                    ========================================= */}
                    {activeTab === "security" && (
                        <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                            
                            {/* Role Selector */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2">
                                {systemRoles.map(r => {
                                    const isSelected = selectedRoleId === r.id;
                                    return (
                                        <button
                                            key={r.id}
                                            onClick={() => setSelectedRoleId(r.id)}
                                            className={`p-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
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

                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                                            <Shield className="w-5 h-5 text-[#1F3B8B]" />
                                        </div>
                                        <div>
                                            <h2 className="text-base font-black uppercase text-slate-900 tracking-tight">กำหนดสิทธิ์การใช้งาน (Access Matrix)</h2>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                                กำลังตั้งค่าให้: <span className="text-[#1F3B8B] font-bold">{systemRoles.find(r => r.id === selectedRoleId)?.name}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setConfirmSavePerms(true)}
                                        disabled={loading}
                                        className="w-full sm:w-auto bg-[#1F3B8B] text-white px-8 py-3 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-900 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" /> บันทึกสิทธิ์ทั้งหมด
                                    </button>
                                </div>
                                
                                <div className="p-0">
                                    {Object.entries(ROLE_BASED_PERMISSIONS).map(([groupName, permissions]) => {
                                        const isExpanded = expandedGroups.includes(groupName);
                                        return (
                                            <div key={groupName} className="border-b border-slate-100 last:border-0">
                                                <button 
                                                    onClick={() => toggleGroup(groupName)}
                                                    className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-slate-50/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Activity size={14} className="text-[#1F3B8B]" />
                                                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{groupName}</h3>
                                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                                                            {Object.keys(permissions).length} รายการ
                                                        </span>
                                                    </div>
                                                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                                                </button>
                                                
                                                {isExpanded && (
                                                    <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-300">
                                                        {Object.entries(permissions).map(([code, info]) => (
                                                            <div 
                                                                key={code} 
                                                                onClick={() => togglePermission(code)}
                                                                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                                                                    rolePerms.includes(code) 
                                                                        ? 'bg-[#1F3B8B]/5 border-[#1F3B8B]/30 shadow-sm' 
                                                                        : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'
                                                                }`}
                                                            >
                                                                <div className="flex-1 pr-4">
                                                                    <h4 className={`text-xs font-black uppercase ${rolePerms.includes(code) ? 'text-[#1F3B8B]' : 'text-slate-700'}`}>
                                                                        {info.label}
                                                                    </h4>
                                                                    <p className="text-[10px] text-slate-400 mt-1 font-medium leading-relaxed">
                                                                        {info.desc}
                                                                    </p>
                                                                </div>
                                                                <div className={`relative w-10 h-5 rounded-full shrink-0 transition-all duration-300 ${rolePerms.includes(code) ? 'bg-[#1F3B8B]' : 'bg-slate-200'}`}>
                                                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${rolePerms.includes(code) ? 'translate-x-5 shadow-sm' : ''}`} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "depts" && (
                        <div className="max-w-4xl space-y-6 animate-in fade-in duration-300">
                            <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
                                <h2 className="text-base font-bold uppercase text-slate-900 mb-4 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-[#1F3B8B]" /> จัดการแผนก / Cost Center
                                </h2>
                                <form onSubmit={handleCreateDept} className="flex flex-col sm:flex-row gap-3">
                                    <input className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold text-slate-900 focus:border-[#1F3B8B] focus:bg-white outline-none transition-all placeholder:text-slate-400" placeholder="ระบุชื่อแผนกใหม่..." value={newDeptName} onChange={e => setNewDeptName(e.target.value)} />
                                    <button className="bg-[#1F3B8B] text-white px-8 py-3 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-blue-900 transition-all shadow-sm flex items-center justify-center gap-2 shrink-0">
                                        <Plus className="w-4 h-4" /> เพิ่มแผนก
                                    </button>
                                </form>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                {deptRows.length === 0 ? (
                                    <div className="p-16 text-center text-slate-400 font-medium text-sm">ยังไม่มีข้อมูลแผนกในระบบ</div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {deptRows.map(d => (
                                            <div key={d.id} className="p-5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#1F3B8B] font-bold text-xs">{d.name.slice(0,2)}</div>
                                                    <span className="font-bold text-slate-700">{d.name}</span>
                                                </div>
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
            className={`flex items-center gap-2 px-6 py-4 border-b-2 font-black text-xs uppercase tracking-[0.1em] transition-all whitespace-nowrap ${
                active 
                    ? 'border-[#1F3B8B] text-[#1F3B8B] bg-[#1F3B8B]/5' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
            }`}
        >
            {icon} {label}
        </button>
    );
}

function InputGroup({ label, value, onChange, placeholder, type = "text", required = false }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
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

function ConfirmModal({ title, desc, onCancel, onConfirm, type }) {
    const isDanger = type === 'danger';
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 border ${isDanger ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-[#1F3B8B]/10 border-[#1F3B8B]/20 text-[#1F3B8B]'}`}>
                    {isDanger ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">{title}</h3>
                <p className="text-xs text-slate-500 mb-8 leading-relaxed font-medium">{desc}</p>
                <div className="flex w-full gap-3">
                    <button onClick={onCancel} className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-lg font-bold text-xs uppercase hover:bg-slate-100 transition-colors border border-slate-200">ยกเลิก</button>
                    <button onClick={onConfirm} className={`flex-1 text-white py-3 rounded-lg font-bold text-xs uppercase shadow-lg transition-all ${isDanger ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-[#1F3B8B] hover:bg-blue-900 shadow-blue-200'}`}>
                        ยืนยัน
                    </button>
                </div>
            </div>
        </div>
    );
}