"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";
import { getAccessToken } from "@/lib/auth";
import {
    ClipboardList,
    Plus,
    Search,
    ArrowLeft,
    Save,
    CheckCircle2,
    Clock,
    MapPin,
    AlertCircle,
    FileText,
    Boxes,
    Loader2,
    Download,
    Trash2,
    Building2, Layers,
    MessageSquareText,
    Info,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from "lucide-react";

export default function CountTasksPage() {
    const router = useRouter();
    const [view, setView] = useState('LIST'); // 'LIST' | 'DETAIL'
    const [isLoading, setIsLoading] = useState(false);

    // State for List View
    const [tasks, setTasks] = useState([]);
    const [masterData, setMasterData] = useState({ warehouses: [], zones: [] });

    // 🟢 [ส่วนที่เพิ่ม] State สำหรับแบ่งหน้า
    const [page, setPage] = useState(1);
    const limit = 20;

    // ==========================================
    // 🪟 State for Modals (รวม State ป็อปอัพไว้ตรงนี้)
    // ==========================================
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // ป็อปอัพสำหรับการลบ
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);

    // ป็อปอัพสำหรับการอนุมัติปรับสต๊อก
    const [showCompleteConfirmModal, setShowCompleteConfirmModal] = useState(false);
    const [showCompleteSuccessModal, setShowCompleteSuccessModal] = useState(false);

    // ==========================================
    // State for Create Form
    const [newForm, setNewForm] = useState({ warehouseId: '', zoneId: '', remarks: '' });
    const [showError, setShowError] = useState(false);

    // State for Detail View
    const [selectedTask, setSelectedTask] = useState(null);
    const [taskItems, setTaskItems] = useState([]); // เก็บรายการเพื่อคีย์ตัวเลข

    // ==========================================
    // 🔄 INIT DATA
    // ==========================================
    useEffect(() => {
        fetchTasks();
        fetchMasterData();
    }, []);

    const fetchTasks = async () => {
        setIsLoading(true);
        try {
            const res = await apiFetch("/inventory/count-tasks");
            if (res.success) setTasks(res.data || []);
        } catch (error) {
            toast.error("ดึงข้อมูลใบสั่งนับล้มเหลว");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMasterData = async () => {
        try {
            const [w, z] = await Promise.all([
                apiFetch("/master/warehouses?limit=100").catch(() => []),
                apiFetch("/master/zones?limit=500").catch(() => [])
            ]);
            setMasterData({
                warehouses: Array.isArray(w) ? w : (w?.data || []),
                zones: Array.isArray(z) ? z : (z?.data || [])
            });
        } catch (e) { console.error(e); }
    };

    // 🟢 [ส่วนที่เพิ่ม] คำนวณการแบ่งหน้า
    const totalCount = tasks.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const paginatedTasks = useMemo(() => {
        return tasks.slice((page - 1) * limit, page * limit);
    }, [tasks, page]);

    // ==========================================
    // 📝 ACTION: CREATE TASK
    // ==========================================
    const handleCreateTask = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setIsLoading(true);
        try {
            const res = await apiFetch("/inventory/count-tasks", {
                method: "POST",
                body: JSON.stringify(newForm)
            });
            if (res.success) {
                toast.success("สร้างใบสั่งตรวจนับสำเร็จ");
                setShowCreateModal(false);
                setNewForm({ warehouseId: '', zoneId: '', remarks: '' });
                fetchTasks();
                openTaskDetail(res.data.id); // เปิดหน้าจอคีย์ข้อมูลทันที
            }
        } catch (error) {
            toast.error(error.message || "สร้างใบสั่งนับล้มเหลว (อาจไม่มีสินค้าในโซนนี้)");
        } finally {
            setIsLoading(false);
        }
    };

    // ==========================================
    // 🔍 ACTION: VIEW / DATA ENTRY
    // ==========================================
    const openTaskDetail = async (id) => {
        setIsLoading(true);
        try {
            const res = await apiFetch(`/inventory/count-tasks/${id}`);
            if (res.success) {
                setSelectedTask(res.data);
                const mappedItems = (res.data.items || []).map(it => ({
                    ...it,
                    inputQty: it.countedQty !== null ? it.countedQty : ''
                }));
                setTaskItems(mappedItems);
                setView('DETAIL');
            }
        } catch (error) {
            toast.error("ดึงข้อมูลรายละเอียดล้มเหลว");
        } finally {
            setIsLoading(false);
        }
    };

    const handleQtyChange = (index, value) => {
        const newItems = [...taskItems];
        newItems[index].inputQty = value;
        setTaskItems(newItems);
    };

    const handleSaveProgress = async () => {
        setIsLoading(true);
        try {
            const payloadItems = taskItems
                .filter(it => it.inputQty !== '')
                .map(it => ({
                    itemId: it.id,
                    countedQty: Number(it.inputQty)
                }));

            if (payloadItems.length === 0) {
                return toast.error("ไม่มีข้อมูลให้บันทึก");
            }

            const res = await apiFetch(`/inventory/count-tasks/${selectedTask.id}/scan`, {
                method: "PUT",
                body: JSON.stringify({ items: payloadItems })
            });

            if (res.success) {
                toast.success("บันทึกผลการนับสำเร็จ");
                openTaskDetail(selectedTask.id);
            }
        } catch (error) {
            toast.error("บันทึกล้มเหลว");
        } finally {
            setIsLoading(false);
        }
    };

    // เปิด Popup ยืนยันการปิดเอกสาร
    const handleCompleteTaskClick = () => {
        setShowCompleteConfirmModal(true);
    };

    // ดำเนินการปิดเอกสารจริง
    const executeCompleteTask = async () => {
        setIsLoading(true);
        try {
            const res = await apiFetch(`/inventory/count-tasks/${selectedTask.id}/complete`, {
                method: "POST"
            });
            if (res.success) {
                setShowCompleteConfirmModal(false);
                setShowCompleteSuccessModal(true); // เปิด Popup สำเร็จ
                setView('LIST');
                fetchTasks();
            }
        } catch (error) {
            toast.error(error.message || "ปิดเอกสารล้มเหลว");
            setShowCompleteConfirmModal(false);
        } finally {
            setIsLoading(false);
        }
    };

    // ==========================================
    // 📊 ACTION: EXPORT TO EXCEL (PDF)
    // ==========================================
    const handleExportPDF = async () => {
        if (!selectedTask) return toast.error("ไม่พบข้อมูลเอกสาร");

        setIsLoading(true);
        const toastId = toast.loading("กำลังสร้างเอกสาร PDF...");

        try {
            const token = getAccessToken();
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/inventory/count-tasks/${selectedTask.id}/pdf`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("ไม่สามารถสร้าง PDF ได้");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');

            toast.success("สร้างเอกสารสำเร็จ", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("เกิดข้อผิดพลาดในการดาวน์โหลด PDF", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    // ==========================================
    // 🗑️ ACTION: DELETE TASK
    // ==========================================
    const handleDeleteTask = async (taskId) => {
        setIsLoading(true);
        try {
            const res = await apiFetch(`/inventory/count-tasks/${taskId}`, {
                method: "DELETE"
            });
            if (res.success) {
                setShowDeleteModal(false);
                setShowDeleteSuccessModal(true); // แสดง Popup ลบสำเร็จ
                fetchTasks();
            }
        } catch (error) {
            toast.error(error.message || "ลบเอกสารล้มเหลว");
        } finally {
            setIsLoading(false);
        }
    };

    // ==========================================
    // 🎨 UI HELPERS
    // ==========================================
    const getStatusBadge = (status) => {
        const baseClass = "px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider border shadow-sm flex items-center gap-1.5 w-fit";

        switch (status) {
            case 'PENDING': return <span className={`${baseClass} bg-amber-50 text-amber-600 border-amber-100`}><Clock className="w-3.5 h-3.5" /> รอตรวจนับ</span>;
            case 'COUNTING': return <span className={`${baseClass} bg-blue-50 text-blue-600 border-blue-100`}><Search className="w-3.5 h-3.5" /> กำลังตรวจนับ</span>;
            case 'REVIEW': return <span className={`${baseClass} bg-purple-50 text-purple-600 border-purple-100`}><AlertCircle className="w-3.5 h-3.5" /> รอตรวจสอบ</span>;
            case 'COMPLETED': return <span className={`${baseClass} bg-emerald-50 text-emerald-600 border-emerald-100`}><CheckCircle2 className="w-3.5 h-3.5" /> เสร็จสิ้น (ปรับยอดแล้ว)</span>;
            default: return <span className={`${baseClass} bg-slate-50 text-slate-500 border-slate-200`}>{status}</span>;
        }
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-8 gap-6 print:hidden">
                    <div className="flex flex-col gap-4">
                        {/* ปุ่มย้อนกลับตาม Theme */}
                        {view === 'DETAIL' && (
                            <button
                                onClick={() => setView('LIST')}
                                className="flex items-center gap-2 w-fit text-sm font-bold text-slate-500 hover:text-[#1F3B8B] transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
                            </button>
                        )}

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-[#1F3B8B]/10 flex items-center justify-center border border-[#1F3B8B]/20 shadow-sm shrink-0">
                                <ClipboardList className="w-6 h-6 text-[#1F3B8B]" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                    ระบบตรวจนับสต๊อก
                                </h1>
                                <p className="text-sm text-slate-500 mt-1 font-medium uppercase tracking-widest">
                                    Cycle Count System
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-row items-center gap-4 w-full md:w-auto">
                        {view === 'LIST' && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:bg-emerald-700 shadow-sm active:scale-95 whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4" /> สร้างใบสั่งนับใหม่
                            </button>
                        )}
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* 📝 MODE 1: LIST VIEW */}
                {/* ========================================================================= */}
                {view === 'LIST' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-500">
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">เลขที่เอกสาร</th>
                                        <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</th>
                                        <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">วันที่สร้าง</th>
                                        <th className="py-4 px-6 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">หมายเหตุ</th>
                                        <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">ดำเนินการ</th>
                                        <th className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-16">ลบ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tasks.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="py-20 text-center text-slate-400 font-medium italic">
                                                ไม่พบประวัติรายการใบสั่งตรวจนับ
                                            </td>
                                        </tr>
                                    )}
                                    {/* 🟢 เปลี่ยนจากการ map tasks เดิม เป็น paginatedTasks ตรงนี้ครับ */}
                                    {paginatedTasks.map((task) => (
                                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="py-4 px-6">
                                                <span className="text-sm font-bold text-[#1F3B8B] uppercase tracking-tight tabular-nums">
                                                    {task.taskNo}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                {getStatusBadge(task.status)}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-xs font-bold text-slate-600 tabular-nums">
                                                    {new Date(task.createdAt).toLocaleDateString('th-TH')}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <p className="text-sm font-semibold text-slate-800 line-clamp-1">{task.remarks || '-'}</p>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <button
                                                    onClick={() => openTaskDetail(task.id)}
                                                    className="text-[11px] font-bold text-[#1F3B8B] hover:underline flex items-center justify-center gap-1 mx-auto"
                                                >
                                                    {task.status === 'COMPLETED' ? 'ดูรายละเอียด' : 'เปิดคีย์ข้อมูล'}
                                                </button>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                {task.status !== 'COMPLETED' ? (
                                                    <button
                                                        onClick={() => {
                                                            setTaskToDelete({ id: task.id, taskNo: task.taskNo });
                                                            setShowDeleteModal(true);
                                                        }}
                                                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors mx-auto block"
                                                        title="ลบเอกสาร"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* 🟢 [ส่วนที่เพิ่ม] ส่วนควบคุมการเปลี่ยนหน้า (Pagination Controls) */}
                        {tasks.length > 0 && totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-slate-200 bg-slate-50/50 print:hidden">
                                <p className="text-xs font-medium text-slate-500">
                                    หน้า {page} จาก {totalPages} | รวม {totalCount.toLocaleString()} รายการ
                                </p>
                                <div className="flex items-center gap-2">
                                    <PaginationButton onClick={() => setPage(1)} disabled={page === 1} icon={<ChevronsLeft className="w-4 h-4" />} />
                                    <PaginationButton onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1} icon={<ChevronLeft className="w-4 h-4" />} />

                                    <div className="px-4 py-1.5 text-xs font-bold text-[#1F3B8B] bg-white border border-slate-200 rounded-lg shadow-sm">
                                        {page} / {totalPages}
                                    </div>

                                    <PaginationButton onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages} icon={<ChevronRight className="w-4 h-4" />} />
                                    <PaginationButton onClick={() => setPage(totalPages)} disabled={page === totalPages} icon={<ChevronsRight className="w-4 h-4" />} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ========================================================================= */}
                {/* 📝 MODE 2: DETAIL / DATA ENTRY VIEW */}
                {/* ========================================================================= */}
                {view === 'DETAIL' && selectedTask && (
                    <div className="space-y-6 animate-in fade-in duration-500">

                        <div className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden">
                            {/* Detail Header */}
                            <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-4">
                                <div className="space-y-1.5">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">เลขที่ใบสั่งนับ</span>
                                    <h2 className="text-2xl md:text-3xl font-black text-[#1F3B8B] tabular-nums">{selectedTask.taskNo}</h2>
                                </div>
                                <div className="flex flex-col items-start md:items-end gap-3">
                                    <div className="flex justify-end">{getStatusBadge(selectedTask.status)}</div>

                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {selectedTask.status !== 'COMPLETED' && (
                                            <button
                                                onClick={handleExportPDF}
                                                disabled={isLoading}
                                                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <FileText className="w-4 h-4" /> ปรินต์ (PDF)
                                            </button>
                                        )}

                                        {selectedTask.status !== 'COMPLETED' && (
                                            <>
                                                <button
                                                    onClick={handleSaveProgress}
                                                    disabled={isLoading}
                                                    className="bg-slate-800 text-white hover:bg-slate-900 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-2"
                                                >
                                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} บันทึกยอด
                                                </button>
                                                <button
                                                    onClick={handleCompleteTaskClick}
                                                    disabled={isLoading}
                                                    className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-2"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" /> อนุมัติปรับสต๊อก
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Info Section */}
                            <div className="px-8 pt-6 pb-4">
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-2">
                                    <Boxes className="w-5 h-5 text-[#1F3B8B]" /> รายการที่ต้องตรวจนับ
                                </h3>
                                <p className="text-xs font-bold text-slate-500 ml-7">
                                    คีย์ตัวเลขที่นับได้จากกระดาษลงในช่อง "ยอดนับจริง"
                                </p>
                            </div>

                            {/* Items Table */}
                            <div className="px-8 pb-8">
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 border-b border-slate-200 text-xs font-bold uppercase text-slate-600 tracking-wider">
                                                <th className="p-4 text-left w-[25%]">ตำแหน่ง (Location)</th>
                                                <th className="p-4 text-left w-[35%]">สินค้า (Product)</th>
                                                <th className="p-4 text-center bg-slate-200/50 w-[10%]">ยอดระบบ</th>
                                                <th className="p-4 text-center text-[#1F3B8B] w-[20%]">ยอดนับจริง</th>
                                                <th className="p-4 text-center w-[10%]">ส่วนต่าง</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {taskItems.map((item, index) => {
                                                const diff = item.inputQty !== '' ? (Number(item.inputQty) - item.systemQty) : (item.diffQty || 0);
                                                return (
                                                    <tr key={item.id} className="text-base hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2">
                                                                <MapPin className="w-4 h-4 text-indigo-500" />
                                                                <span className="font-bold text-slate-900">{item.location?.code}</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-400 block ml-6 uppercase mt-0.5">
                                                                {item.location?.warehouse?.name}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            <p className="font-bold text-slate-900">{item.product?.sku}</p>
                                                            <p className="text-xs text-[#1F3B8B] font-bold uppercase mt-0.5 line-clamp-1">
                                                                {item.product?.name}
                                                            </p>
                                                        </td>
                                                        <td className="p-4 text-center bg-slate-50/50">
                                                            <span className="text-lg font-bold text-slate-500 tabular-nums">{item.systemQty}</span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {selectedTask.status === 'COMPLETED' ? (
                                                                <span className="text-xl font-bold text-[#1F3B8B] tabular-nums">{item.countedQty ?? '-'}</span>
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={item.inputQty}
                                                                    onChange={(e) => handleQtyChange(index, e.target.value)}
                                                                    className="w-24 mx-auto block text-center border border-slate-300 focus:border-[#1F3B8B] bg-slate-50 text-[#1F3B8B] rounded-lg py-2 text-lg tabular-nums font-bold outline-none focus:ring-2 focus:ring-blue-900/10 transition-all placeholder:text-slate-300"
                                                                    placeholder="ว่าง"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {item.inputQty !== '' || selectedTask.status === 'COMPLETED' ? (
                                                                <span className={`inline-block px-3 py-1.5 rounded-md text-sm font-bold tabular-nums border shadow-sm ${diff > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                                    diff < 0 ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                                        'bg-slate-100 text-slate-500 border-slate-200'
                                                                    }`}>
                                                                    {diff > 0 ? '+' : ''}{diff}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300 font-bold">-</span>
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
                    </div>
                )}

                {/* ========================================================================= */}
                {/* 🪟 MODAL: CREATE TASK */}
                {/* ========================================================================= */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!newForm.warehouseId) {
                                    setShowError(true);
                                    return;
                                }
                                setShowConfirmModal(true);
                            }}
                            className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-slate-200"
                        >
                            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                                <h3 className="text-lg font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-[#1F3B8B]" />
                                    สร้างใบสั่งนับสต๊อก
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setShowError(false);
                                    }}
                                    className="text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 p-2 rounded-lg transition-colors"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-6 mb-8">
                                <div className="group">
                                    <label
                                        className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-2 ${showError ? 'text-rose-500' : 'text-slate-500'
                                            }`}
                                    >

                                        เลือกคลังสินค้า <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={newForm.warehouseId}
                                        onChange={e => {
                                            setNewForm({ ...newForm, warehouseId: e.target.value, zoneId: '' });
                                            if (e.target.value) setShowError(false);
                                        }}
                                        className={`w-full border rounded-lg p-3 text-sm font-bold outline-none transition-all ${showError
                                            ? 'border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-500'
                                            : 'border-slate-300 bg-slate-50 focus:bg-white focus:border-[#1F3B8B]'
                                            }`}
                                    >
                                        <option value="">-- เลือกคลังสินค้า --</option>
                                        {masterData.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                    {showError && (
                                        <div className="flex items-center gap-1.5 mt-2 text-rose-500 animate-in slide-in-from-top-1">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            <span className="text-xs font-bold">กรุณาเลือกคลังสินค้า</span>
                                        </div>
                                    )}
                                </div>

                                <div className="group">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                                        เลือกโซน <span className="text-slate-400 normal-case font-medium">(Optional)</span>
                                    </label>
                                    <select
                                        value={newForm.zoneId}
                                        disabled={!newForm.warehouseId}
                                        onChange={e => setNewForm({ ...newForm, zoneId: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-3 text-sm font-bold outline-none focus:border-[#1F3B8B] bg-slate-50 focus:bg-white transition-all disabled:opacity-50 disabled:bg-slate-100"
                                    >
                                        <option value="">-- นับทุกโซนในคลังนี้ --</option>
                                        {masterData.zones
                                            .filter(z => z.warehouseId === newForm.warehouseId)
                                            .map(z => <option key={z.id} value={z.id}>{z.code} - {z.name}</option>)
                                        }
                                    </select>
                                </div>

                                <div className="group">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                                        หมายเหตุสั่งการ
                                    </label>
                                    <input
                                        type="text"
                                        value={newForm.remarks}
                                        onChange={e => setNewForm({ ...newForm, remarks: e.target.value })}
                                        placeholder="เช่น ตรวจนับประจำเดือนเมษายน"
                                        className="w-full border border-slate-300 rounded-lg p-3 text-sm font-bold outline-none focus:border-[#1F3B8B] bg-slate-50 focus:bg-white transition-all placeholder:text-slate-400"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setShowError(false);
                                    }}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-slate-200 transition-all"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} สร้างเอกสาร
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* 🪟 MODAL: CONFIRM CREATE TASK */}
                {/* ========================================================================= */}
                {showConfirmModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-slate-200 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-[#1F3B8B]/10 rounded-full flex items-center justify-center mb-5 border border-[#1F3B8B]/20">
                                <ClipboardList className="w-8 h-8 text-[#1F3B8B]" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">ยืนยันการสร้างเอกสาร</h3>
                            <p className="text-sm font-semibold text-slate-500 mb-8 leading-relaxed">
                                ยืนยันการสร้างใบสั่งนับสต๊อกตามข้อมูลที่ระบุ<br />ใช่หรือไม่?
                            </p>
                            <div className="flex w-full gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-slate-200 transition-all"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        setShowConfirmModal(false);
                                        handleCreateTask(e);
                                    }}
                                    disabled={isLoading}
                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-emerald-700 shadow-sm transition-all flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} ยืนยัน
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* 🪟 MODAL: CONFIRM APPROVE STOCK (ยืนยันปรับสต๊อก) */}
                {/* ========================================================================= */}
                {showCompleteConfirmModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-slate-200 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-5 border border-amber-200">
                                <Info className="w-8 h-8 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3 tracking-tight">ยืนยันการปิดเอกสาร</h3>
                            <p className="text-sm font-semibold text-slate-600 mb-8 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                                ระบบจะสร้างรายการปรับยอด (Stock Adjustment) <br />
                                ให้อัตโนมัติสำหรับรายการที่ยอด <span className="text-rose-500 font-bold">"ไม่ตรงกัน"</span>
                            </p>
                            <div className="flex w-full gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCompleteConfirmModal(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-slate-200 transition-all"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={executeCompleteTask}
                                    disabled={isLoading}
                                    className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-emerald-700 shadow-sm transition-all flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} อนุมัติยอด
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* 🪟 MODAL: SUCCESS APPROVE STOCK (ปรับสต๊อกสำเร็จ) */}
                {/* ========================================================================= */}
                {showCompleteSuccessModal && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-emerald-100 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-5 border border-emerald-200">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">ปรับสต๊อกสำเร็จ</h3>
                            <p className="text-sm font-semibold text-slate-500 mb-8 leading-relaxed">
                                ระบบได้ดำเนินการปรับยอดสต๊อก<br />เรียบร้อยแล้ว
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowCompleteSuccessModal(false)}
                                className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-slate-200 transition-all"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* 🪟 MODAL: CONFIRM DELETE TASK */}
                {/* ========================================================================= */}
                {showDeleteModal && taskToDelete && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-rose-100 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-5 border border-rose-200">
                                <Trash2 className="w-8 h-8 text-rose-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3 tracking-tight">ยืนยันการลบเอกสาร</h3>
                            <p className="text-sm font-semibold text-slate-600 mb-8 leading-relaxed">
                                คุณต้องการลบเอกสาร <span className="text-rose-600 font-bold">{taskToDelete.taskNo}</span><br />ใช่หรือไม่?
                                <span className="text-xs font-normal mt-2 block text-slate-400 bg-slate-50 p-2 rounded-md">ข้อมูลการนับจะถูกลบทิ้งทั้งหมด<br />และไม่สามารถกู้คืนได้</span>
                            </p>
                            <div className="flex w-full gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setTaskToDelete(null);
                                    }}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-slate-200 transition-all"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteTask(taskToDelete.id)}
                                    disabled={isLoading}
                                    className="flex-1 py-3 bg-rose-600 text-white rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-rose-700 shadow-sm transition-all flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} ยืนยันลบ
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* 🪟 MODAL: SUCCESS DELETE TASK (ลบสำเร็จ) */}
                {/* ========================================================================= */}
                {showDeleteSuccessModal && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-emerald-100 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-5 border border-emerald-200">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2 tracking-tight">ลบเอกสารสำเร็จ</h3>
                            <p className="text-sm font-semibold text-slate-500 mb-8 leading-relaxed">
                                ข้อมูลถูกลบออกจากระบบ<br />เรียบร้อยแล้ว
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowDeleteSuccessModal(false)}
                                className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-slate-200 transition-all"
                            >
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </AuthGate>
    );
}

// 🟢 [ส่วนที่เพิ่ม] Component ปุ่มกดสำหรับ Pagination
function PaginationButton({ onClick, disabled, icon }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 transition-colors shadow-sm"
        >
            {icon}
        </button>
    );
}