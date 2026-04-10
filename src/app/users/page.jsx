"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Users, Building2, Plus, UserPlus, ShieldCheck, Fingerprint,
    Trash2, Database, CheckCircle2, RefreshCw, X,
    Lock, ChevronRight, Save, Shield, Briefcase, Activity,
    AlertTriangle, Type, UserSquare, Key,
    Truck, Package, ShoppingCart, ClipboardList, Monitor, Loader2, PieChart
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
    "INVENTORY_READ": { label: "ยอดคงเหลือ", desc: "ดูสต๊อกและประวัติความเคลื่อนไหว" },
    "TRANSFER_MANAGE": { label: "โอนย้ายสินค้า", desc: "สร้างใบส่งและรับสินค้าข้ามคลัง" },
    "ADJUSTMENT_MANAGE": { label: "ปรับปรุงยอด", desc: "แก้ไขยอด กรณีสินค้าเกิน/ขาดหาย" },
    "COUNT_TASK_MANAGE": { label: "ตรวจนับสต๊อก", desc: "สร้างและอนุมัติใบสั่งนับ (Count)" },
    "DASHBOARD_VIEW": { label: "หน้าภาพรวม", desc: "ดู Dashboard และกราฟสรุป" },
    "REPORT_EXPORT": { label: "ออกรายงาน", desc: "ดาวน์โหลดไฟล์ Excel และ PDF" }
};

// 💡 2. จัดกลุ่มใหม่ให้สวยงามและเป็นระเบียบ
const PERMISSION_GROUPS = {
    "ระบบและข้อมูลหลัก": ["SYSTEM_SETTINGS_MANAGE", "USER_MANAGE", "AUDIT_LOG_VIEW", "MASTER_DATA_READ", "MASTER_DATA_MANAGE", "WAREHOUSE_MANAGE"],
    "จัดซื้อ": ["PR_READ", "PR_CREATE", "PR_APPROVE", "PO_MANAGE"],
    "รับและจ่ายสินค้า": ["INBOUND_READ", "INBOUND_CREATE", "OUTBOUND_READ", "OUTBOUND_CREATE"],
    "เบิกภายใน": ["REQUISITION_READ", "REQUISITION_CREATE", "REQUISITION_APPROVE"],
    "คลังสินค้า": ["INVENTORY_READ", "TRANSFER_MANAGE", "ADJUSTMENT_MANAGE", "COUNT_TASK_MANAGE"],
    "รายงาน": ["DASHBOARD_VIEW", "REPORT_EXPORT"]
};

// 💡 3. เพิ่ม Icon ให้รองรับกลุ่มใหม่
const getGroupIconInfo = (group) => {
    switch (group) {
        case "รับและจ่ายสินค้า":
            return { icon: <Truck className="w-5 h-5 text-emerald-600" />, bg: "bg-emerald-100" };
        case "คลังสินค้า":
            return { icon: <Package className="w-5 h-5 text-amber-600" />, bg: "bg-amber-100" };
        case "จัดซื้อ":
            return { icon: <ShoppingCart className="w-5 h-5 text-sky-600" />, bg: "bg-sky-100" };
        case "เบิกภายใน":
            return { icon: <ClipboardList className="w-5 h-5 text-rose-600" />, bg: "bg-rose-100" };
        case "ระบบและข้อมูลหลัก":
            return { icon: <Monitor className="w-5 h-5 text-slate-600" />, bg: "bg-slate-200" };
        case "รายงาน":
            return { icon: <PieChart className="w-5 h-5 text-violet-600" />, bg: "bg-violet-100" };
        default:
            return { icon: <Activity className="w-5 h-5 text-[#1F3B8B]" />, bg: "bg-[#1F3B8B]/10" };
    }
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

    // --- Modal States ---
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
            firstName: u.firstName, lastName: u.lastName,
            password: "", role: getUserRole(u), isActive: u.isActive,
            departmentId: u.departmentId || ""
        });
    };

    const saveEditUser = async (id) => {
        setLoading(true);
        try {
            if (!editUserForm.firstName?.trim() || !editUserForm.lastName?.trim()) {
                throw new Error("กรุณาระบุชื่อและนามสกุลให้ครบถ้วน");
            }

            const payload = {
                firstName: editUserForm.firstName.trim(),
                lastName: editUserForm.lastName.trim(),
                isActive: editUserForm.isActive,
                departmentId: editUserForm.departmentId ? editUserForm.departmentId : null
            };

            await apiFetch(`/users/${id}`, {
                method: "PATCH",
                body: JSON.stringify(payload)
            });

            if (editUserForm.role) {
                await apiFetch(`/users/${id}/roles`, {
                    method: "POST",
                    body: JSON.stringify({ roles: [editUserForm.role] })
                });
            }

            toast.success("บันทึกการแก้ไขข้อมูลสำเร็จ");
            setEditingUserId(null);
            loadUsers();

        } catch (err) {
            toast.error(err.message || "ระบบปฏิเสธคำขอ โปรดตรวจสอบข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    const executeDeleteUser = async () => {
        if (!confirmDeleteUser) return;
        try {
            await apiFetch(`/users/${confirmDeleteUser.id}`, { method: "DELETE" });
            toast.success("ลบบัญชีผู้ใช้งานสำเร็จ");
            loadUsers();
        } catch (err) {
            toast.error("ลบไม่ได้ ข้อมูลนี้ถูกใช้งานอยู่ในระบบ");
        } finally {
            setConfirmDeleteUser(null);
        }
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
        } catch (err) {
            toast.error("ลบไม่ได้ แผนกนี้ยังมีพนักงานสังกัดอยู่");
        } finally {
            setConfirmDeleteDept(null);
        }
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

            {/* --- Modals / Popups --- */}

            {/* 1. Modal ลบ User */}
            {confirmDeleteUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full mx-4 shadow-2xl border-2 border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 border-2 border-rose-100 shadow-inner">
                            <AlertTriangle className="w-8 h-8 text-rose-500" />
                        </div>
                        <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight mb-2">ยืนยันการลบข้อมูล?</h3>
                        <p className="text-sm font-bold text-slate-500 mb-8">คุณต้องการลบบัญชีผู้ใช้ <span className="text-rose-600 font-black">@{confirmDeleteUser.username}</span> ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้</p>

                        <div className="flex w-full gap-3">
                            <button onClick={() => setConfirmDeleteUser(null)} className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95">ยกเลิก</button>
                            <button onClick={executeDeleteUser} className="flex-1 bg-rose-600 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/30 active:scale-95 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> ยืนยันลบ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Modal ลบ Dept */}
            {confirmDeleteDept && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full mx-4 shadow-2xl border-2 border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 border-2 border-rose-100 shadow-inner">
                            <AlertTriangle className="w-8 h-8 text-rose-500" />
                        </div>
                        <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight mb-2">ยืนยันการลบแผนก?</h3>
                        <p className="text-sm font-bold text-slate-500 mb-8">คุณแน่ใจหรือไม่ที่จะลบแผนกนี้? หากยังมีพนักงานอยู่ในแผนก ระบบจะปฏิเสธการลบ</p>

                        <div className="flex w-full gap-3">
                            <button
                                onClick={() => setConfirmDeleteDept(null)}
                                className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                            >
                                ยกเลิก
                            </button>
                            <button onClick={executeDeleteDept} className="flex-1 bg-rose-600 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/30 active:scale-95 flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> ยืนยันลบ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Modal บันทึก Permission */}
            {confirmSavePerms && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full mx-4 shadow-2xl border-2 border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-[#1F3B8B]/10 rounded-2xl flex items-center justify-center mb-6 border-2 border-[#1F3B8B]/20 shadow-inner">
                            <ShieldCheck className="w-8 h-8 text-[#1F3B8B]" />
                        </div>
                        <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight mb-2">ยืนยันการเปลี่ยนสิทธิ์?</h3>
                        <p className="text-sm font-bold text-slate-500 mb-8">ระบบจะทำการอัปเดตสิทธิ์การเข้าถึงข้อมูลใหม่ทั้งหมดสำหรับกลุ่มผู้ใช้งานนี้</p>

                        <div className="flex w-full gap-3">
                            <button onClick={() => setConfirmSavePerms(false)} className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95">ยกเลิก</button>
                            <button onClick={executeSavePermissions} className="flex-1 bg-emerald-600 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30 active:scale-95 flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> ยืนยันบันทึก</button>
                        </div>
                    </div>
                </div>
            )}
            {/* --- End Modals --- */}


            <div className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-10 min-h-screen bg-slate-50/30 pb-20">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-2 border-slate-100 pb-8">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-white text-[#1F3B8B] rounded-[1.5rem] shadow-sm border-2 border-slate-100">
                            <Shield className="w-8 h-8 text-[#1F3B8B]" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#1F3B8B] mb-1">System Administration</p>
                            <h1 className="text-4xl font-black text-slate-950 tracking-tighter uppercase">แผงควบคุมระบบ</h1>
                            <p className="text-slate-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2 mt-2">
                                <Database className="w-4 h-4 text-emerald-500" /> จัดการผู้ใช้งาน สิทธิ์ และโครงสร้างแผนก
                            </p>
                        </div>
                    </div>
                    <div className="flex bg-white p-1.5 rounded-[2rem] shadow-sm border-2 border-slate-100 overflow-x-auto w-full md:w-auto">
                        <TabItem active={activeTab === 'users'} onClick={() => setActiveTab("users")} icon={Users} label="บัญชีผู้ใช้" />
                        <TabItem active={activeTab === 'depts'} onClick={() => setActiveTab("depts")} icon={Building2} label="แผนก" color="emerald" />
                        <TabItem active={activeTab === 'security'} onClick={() => setActiveTab("security")} icon={Lock} label="สิทธิ์การใช้งาน" color="rose" />
                    </div>
                </header>

                <main>
                    {activeTab === "users" && (
                        <div className="space-y-8 animate-in fade-in">
                            {!showAddForm ? (
                                <button onClick={() => setShowAddForm(true)} className="group w-full bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] flex items-center justify-between hover:border-[#1F3B8B]/50 hover:shadow-xl transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-[#1F3B8B] rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-[#1F3B8B]/20">
                                            <UserPlus className="w-8 h-8 text-white" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">สร้างบัญชีผู้ใช้งานใหม่</h3>
                                            <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">เพิ่มพนักงานเข้าสู่ระบบ</p>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors shadow-sm">
                                        <Plus className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 group-hover:scale-110 transition-transform" />
                                    </div>
                                </button>
                            ) : (
                                <div className="bg-white border-2 border-[#1F3B8B] rounded-[3rem] p-10 shadow-2xl relative">
                                    <button onClick={() => setShowAddForm(false)} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500 transition-colors"><X size={32} /></button>
                                    <h2 className="text-2xl font-black text-slate-950 uppercase mb-8 flex items-center gap-3 pb-6 border-b-2 border-slate-50"><Fingerprint className="text-[#1F3B8B] w-8 h-8" /> ลงทะเบียนผู้ใช้ (Enrollment)</h2>
                                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <InputGroup icon={UserSquare} iconColor="text-sky-500" label="ชื่อผู้ใช้งาน (Username)" value={username} onChange={e => setUsername(e.target.value)} placeholder="เช่น jhon_doe" />
                                        <InputGroup icon={Type} iconColor="text-amber-500" label="ชื่อจริง (First Name)" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="สมชาย" />
                                        <InputGroup icon={Type} iconColor="text-orange-500" label="นามสกุล (Last Name)" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="ใจดี" />
                                        <InputGroup icon={Key} iconColor="text-rose-500" label="รหัสผ่าน (Password)" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />

                                        <div className="lg:col-span-2 space-y-2">
                                            <label className="text-sm font-black text-slate-950 uppercase tracking-widest ml-1 flex items-center gap-2"><Building2 className="w-4 h-4 text-violet-500" /> แผนก / สังกัด (Department)</label>
                                            <select className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 shadow-inner outline-none focus:bg-[#1F3B8B]/5 focus:border-[#1F3B8B] transition-all cursor-pointer appearance-none" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
                                                <option value="">-- ไม่ระบุแผนก --</option>
                                                {deptRows.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="lg:col-span-2 space-y-2">
                                            <label className="text-sm font-black text-slate-950 uppercase tracking-widest ml-1 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" /> ระดับสิทธิ์ (Access Level)</label>
                                            <select className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 uppercase shadow-inner outline-none focus:bg-[#1F3B8B]/5 focus:border-[#1F3B8B] transition-all cursor-pointer appearance-none" value={role} onChange={e => setRole(e.target.value)}>{AVAILABLE_ROLES.map(r => <option key={r}>{r}</option>)}</select>
                                        </div>

                                        <div className="lg:col-span-4 mt-6 flex justify-end">
                                            <button type="submit" disabled={loading} className="w-full md:w-auto bg-[#1F3B8B] text-white rounded-full px-14 py-4 font-black text-sm uppercase tracking-[0.3em] hover:bg-[#152968] transition-all shadow-xl shadow-[#1F3B8B]/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
                                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                สร้างบัญชี (Create Account)
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden hover:shadow-lg transition-all">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left min-w-[800px]">
                                        <thead className="bg-slate-50 border-b-2 border-slate-100">
                                            <tr className="text-sm font-black text-slate-950 uppercase tracking-[0.15em]">
                                                <th className="px-8 py-6 whitespace-nowrap">ข้อมูลพนักงาน</th>
                                                <th className="px-8 py-6 text-center whitespace-nowrap">สิทธิ์และแผนก</th>
                                                <th className="px-8 py-6 text-center whitespace-nowrap">สถานะ</th>
                                                <th className="px-8 py-6 text-right whitespace-nowrap">จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {userRows.map(u => {
                                                const isEditing = editingUserId === u.id;
                                                return (
                                                    <tr key={u.id} className={isEditing ? "bg-[#1F3B8B]/5" : "hover:bg-slate-50/80 transition-colors group"}>
                                                        <td className="p-8">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-2xl bg-[#1F3B8B]/10 text-[#1F3B8B] flex items-center justify-center font-black text-lg border-2 border-white shadow-sm">{u.firstName?.[0]}</div>
                                                                {isEditing ? (
                                                                    <div className="flex flex-col gap-2 w-full max-w-[250px]">
                                                                        <input className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black focus:border-[#1F3B8B] outline-none shadow-inner text-[#1F3B8B]" value={editUserForm.firstName} onChange={e => setEditUserForm({ ...editUserForm, firstName: e.target.value })} placeholder="ชื่อจริง" />
                                                                        <input className="border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black focus:border-[#1F3B8B] outline-none shadow-inner text-[#1F3B8B]" value={editUserForm.lastName} onChange={e => setEditUserForm({ ...editUserForm, lastName: e.target.value })} placeholder="นามสกุล" />
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <p className="font-black text-slate-950 uppercase text-sm">{u.firstName} {u.lastName}</p>
                                                                        <p className="text-xs font-bold text-[#1F3B8B] mt-1 tracking-wider">@{u.username}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-8 text-center">
                                                            {isEditing ? (
                                                                <div className="flex flex-col gap-2 items-center">
                                                                    <select className="border-2 border-slate-200 rounded-xl text-sm px-4 py-2.5 font-black w-full max-w-[160px] text-[#1F3B8B] outline-none cursor-pointer focus:border-[#1F3B8B]" value={editUserForm.role} onChange={e => setEditUserForm({ ...editUserForm, role: e.target.value })}>{AVAILABLE_ROLES.map(r => <option key={r}>{r}</option>)}</select>
                                                                    <select className="border-2 border-slate-200 rounded-xl text-sm px-4 py-2.5 font-bold w-full max-w-[160px] text-[#1F3B8B] outline-none cursor-pointer focus:border-[#1F3B8B]" value={editUserForm.departmentId} onChange={e => setEditUserForm({ ...editUserForm, departmentId: e.target.value })}>
                                                                        <option value="">No Dept</option>
                                                                        {deptRows.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                                    </select>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <span className="bg-[#1F3B8B] text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">{getUserRole(u)}</span>
                                                                    {u.department && (
                                                                        <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1.5">
                                                                            <Briefcase className="w-3.5 h-3.5" /> {u.department.name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-8 text-center">
                                                            {isEditing ? (
                                                                <select className="border-2 border-slate-200 rounded-xl text-sm px-4 py-2.5 font-black text-[#1F3B8B] focus:border-[#1F3B8B] outline-none cursor-pointer" value={String(editUserForm.isActive)} onChange={e => setEditUserForm({ ...editUserForm, isActive: e.target.value === 'true' })}><option value="true">ใช้งานปกติ</option><option value="false">ระงับการใช้งาน</option></select>
                                                            ) : (
                                                                <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider border ${u.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>{u.isActive ? "ใช้งานปกติ" : "ระงับการใช้งาน"}</span>
                                                            )}
                                                        </td>
                                                        <td className="p-8 text-right">
                                                            {isEditing ? (
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        onClick={() => setEditingUserId(null)}
                                                                        className="bg-slate-100 text-slate-500 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                                                                    >
                                                                        ยกเลิก
                                                                    </button>

                                                                    <button
                                                                        onClick={() => saveEditUser(u.id)}
                                                                        disabled={loading}
                                                                        className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
                                                                    >
                                                                        บันทึก
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        onClick={() => startEditUser(u)}
                                                                        className="p-3 text-slate-400 hover:text-amber-500 bg-slate-50 hover:bg-amber-50 rounded-xl transition-all font-black text-xs uppercase tracking-widest border border-transparent hover:border-amber-200 active:scale-95"
                                                                    >
                                                                        แก้ไข
                                                                    </button>
                                                                    <button onClick={() => setConfirmDeleteUser(u)} className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all active:scale-95"><Trash2 className="w-4 h-4" /></button>
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
                        </div>
                    )}

                    {activeTab === "security" && (
                        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* ส่วนบน: กลุ่มสิทธิ์การใช้งาน (เรียงแนวนอน) */}
                            <div className="w-full space-y-6">
                                <h3 className="text-sm font-black uppercase text-slate-950 ml-10 tracking-widest flex items-center gap-2">
                                    <Users className="w-5 h-5 text-[#1F3B8B]" /> กลุ่มผู้ใช้งาน
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                                    {systemRoles.map(r => {
                                        const isSelected = selectedRoleId === r.id;
                                        const roleName = r.name.toLowerCase();

                                        let RoleIcon = Shield; // Default
                                        if (roleName.includes('admin')) RoleIcon = Key;
                                        else if (roleName.includes('manager')) RoleIcon = Briefcase;
                                        else if (roleName.includes('staff')) RoleIcon = Users;

                                        return (
                                            <button
                                                key={r.id}
                                                onClick={() => setSelectedRoleId(r.id)}
                                                className={`group relative w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-300 border-2 overflow-hidden outline-none ${isSelected
                                                    ? 'bg-gradient-to-br from-[#1F3B8B] to-[#2A4B9F] text-white border-transparent shadow-xl shadow-[#1F3B8B]/30 scale-[1.03] z-10'
                                                    : 'bg-white text-slate-600 border-slate-100 hover:border-[#1F3B8B]/30 hover:shadow-md hover:bg-slate-50/80'
                                                    }`}
                                            >
                                                {isSelected && (
                                                    <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" />
                                                )}

                                                <div className="flex items-center gap-3 relative z-10">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isSelected
                                                        ? 'bg-white/20 text-white shadow-inner backdrop-blur-sm ring-1 ring-white/30'
                                                        : 'bg-slate-100 text-slate-400 group-hover:bg-[#1F3B8B]/10 group-hover:text-[#1F3B8B] group-hover:scale-110'
                                                        }`}>
                                                        <RoleIcon size={18} />
                                                    </div>
                                                    <span className={`font-black text-xs uppercase tracking-wide transition-colors ${isSelected ? 'text-white' : 'text-slate-800 group-hover:text-[#1F3B8B]'
                                                        }`}>
                                                        {r.name}
                                                    </span>
                                                </div>

                                                <div className={`relative z-10 flex items-center justify-center transition-all duration-300 ${isSelected
                                                    ? 'text-white translate-x-0 opacity-100'
                                                    : 'text-slate-300 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-[#1F3B8B]'
                                                    }`}>
                                                    <ChevronRight size={18} strokeWidth={3} />
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* ส่วนล่าง: ตารางสิทธิ์การใช้งาน (เต็มจอ) */}
                            <div className="w-full">
                                <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden hover:shadow-lg transition-all">
                                    <div className="p-8 border-b-2 border-slate-50 flex flex-col md:flex-row justify-between items-center bg-white sticky top-0 z-20 gap-4">
                                        <div>
                                            <h2 className="text-sm font-black uppercase text-slate-950 ml-2 tracking-widest flex items-center gap-2">
                                                <Lock className="w-5 h-5 text-[#1F3B8B]" /> ตารางสิทธิ์การใช้งาน (Matrix Control)
                                            </h2>
                                            <p className="text-xs text-[#1F3B8B] font-bold uppercase mt-2 ml-9 tracking-widest bg-[#1F3B8B]/10 inline-block px-3 py-1.5 rounded-lg">
                                                กลุ่มที่เลือก: {systemRoles.find(r => r.id === selectedRoleId)?.name}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setConfirmSavePerms(true)}
                                            disabled={loading}
                                            className="w-full md:w-auto bg-emerald-600 text-white hover:bg-emerald-700 px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                                        >
                                            {loading ? <RefreshCw className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />} บันทึกสิทธิ์
                                        </button>
                                    </div>
                                    <div className="p-8 md:p-12 space-y-16 bg-slate-50/30">
                                        {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => {
                                            const { icon, bg } = getGroupIconInfo(group);
                                            return (
                                                <div key={group} className="space-y-8 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center`}>
                                                            {icon}
                                                        </div>
                                                        <span className="text-base font-black text-slate-950 uppercase tracking-[0.2em]">{group}</span>
                                                        <div className="h-[2px] flex-1 bg-slate-100 ml-4 rounded-full" />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-5">
                                                        {perms.map(code => (
                                                            <PermissionToggle key={code} code={code} active={rolePerms.includes(code)} onToggle={() => togglePermission(code)} />
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "depts" && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                            <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-12 shadow-sm text-center hover:shadow-lg transition-all">
                                <div className="w-20 h-20 bg-emerald-600/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                    <Building2 className="w-10 h-10 text-emerald-600" />
                                </div>
                                <h2 className="text-2xl font-black uppercase text-slate-950">ทะเบียนแผนก (Department Registry)</h2>
                                <p className="text-slate-500 text-sm font-bold mb-10 mt-2">จัดการโครงสร้างและแผนกในองค์กร</p>
                                <form onSubmit={handleCreateDept} className="flex flex-col md:flex-row gap-4 max-w-xl mx-auto">
                                    <input className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-slate-900 focus:bg-[#1F3B8B]/5 focus:border-[#1F3B8B] outline-none transition-all shadow-inner placeholder:text-slate-300" placeholder="ระบุชื่อแผนกใหม่..." value={newDeptName} onChange={e => setNewDeptName(e.target.value)} />
                                    <button className="bg-emerald-600 text-white px-10 py-4 md:py-0 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 whitespace-nowrap flex items-center justify-center gap-2">
                                        <Plus className="w-4 h-4" /> เพิ่มแผนก
                                    </button>
                                </form>
                            </div>

                            <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden hover:shadow-lg transition-all">
                                {deptRows.map(d => (
                                    <div key={d.id} className="p-6 border-b-2 border-slate-50 flex justify-between items-center hover:bg-slate-50/80 transition-colors px-10 group">
                                        <div className="flex items-center gap-5">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors"><Briefcase className="w-5 h-5" /></div>
                                            <span className="font-black text-slate-950 uppercase text-sm">{d.name}</span>
                                        </div>
                                        <button onClick={() => setConfirmDeleteDept(d.id)} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-95"><Trash2 className="w-5 h-5" /></button>
                                    </div>
                                ))}
                                {deptRows.length === 0 && (
                                    <div className="p-16 text-center text-slate-400 font-bold text-sm">
                                        ยังไม่มีข้อมูลแผนกในระบบ
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

// --- Local Sub-components ---

function PermissionToggle({ code, active, onToggle }) {
    const info = PERMISSION_MAP[code] || { label: code, desc: "-" };
    return (
        <div onClick={onToggle} className={`group flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all cursor-pointer shadow-sm hover:shadow-md ${active ? 'bg-[#1F3B8B]/5 border-[#1F3B8B]/30' : 'bg-white border-slate-100 hover:border-[#1F3B8B]/20'}`}>
            <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all ${active ? 'bg-[#1F3B8B] text-white shadow-lg shadow-[#1F3B8B]/30 scale-110' : 'bg-slate-50 text-slate-300 group-hover:bg-slate-100'}`}><ShieldCheck size={22} /></div>
                <div>
                    <h4 className={`text-sm font-black uppercase tracking-wide ${active ? 'text-[#1F3B8B]' : 'text-slate-900'}`}>{info.label}</h4>
                    <p className={`text-xs font-bold mt-1 ${active ? 'text-[#1F3B8B]/80' : 'text-slate-400'}`}>{info.desc}</p>
                </div>
            </div>
            <div className={`relative w-12 h-6 rounded-full transition-all duration-300 border-2 ${active ? 'bg-[#1F3B8B] border-[#1F3B8B]' : 'bg-slate-100 border-slate-200'}`}><div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${active ? 'translate-x-6' : ''}`} /></div>
        </div>
    );
}

function TabItem({ active, onClick, icon: Icon, label, color }) {
    let style = "bg-[#1F3B8B] shadow-[#1F3B8B]/30";
    if (color === 'rose') style = "bg-rose-600 shadow-rose-600/30";
    if (color === 'emerald') style = "bg-emerald-600 shadow-emerald-600/30";
    return (
        <button onClick={onClick} className={`flex items-center gap-3 px-8 py-4 rounded-[1.8rem] transition-all whitespace-nowrap font-black text-sm uppercase tracking-widest ${active ? `${style} text-white shadow-xl` : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
            <Icon size={18} />{label}
        </button>
    );
}

function InputGroup({ label, icon: Icon, iconColor = "text-sky-500", ...props }) {
    return (
        <div className="space-y-2">
            <label className="text-sm font-black text-slate-950 uppercase tracking-widest ml-1 flex items-center gap-2">
                {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />} {label}
            </label>
            <input className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-900 shadow-inner outline-none focus:bg-[#1F3B8B]/5 focus:border-[#1F3B8B] transition-all placeholder:text-slate-300" {...props} />
        </div>
    );
}