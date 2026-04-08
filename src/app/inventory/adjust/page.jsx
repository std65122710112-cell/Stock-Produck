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
    MessageSquareText
} from "lucide-react";

export default function CountTasksPage() {
    const router = useRouter();
    const [view, setView] = useState('LIST'); // 'LIST' | 'DETAIL'
    const [isLoading, setIsLoading] = useState(false);

    // State for List View
    const [tasks, setTasks] = useState([]);
    const [masterData, setMasterData] = useState({ warehouses: [], zones: [] });

    // ==========================================
    // 🪟 State for Modals (รวม State ป็อปอัพไว้ตรงนี้)
    // ==========================================
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // 💡 นำ 2 บรรทัดนี้มาวางตรงนี้ครับ (State สำหรับ Pop-up ลบเอกสาร)
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);

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

    // ==========================================
    // 📝 ACTION: CREATE TASK
    // ==========================================
    const handleCreateTask = async (e) => {
        e.preventDefault();
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
                // Map ข้อมูลไอเทม เพื่อเตรียมรับ input
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
            // กรองเฉพาะอันที่มีการพิมพ์ตัวเลขลงไป
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
                openTaskDetail(selectedTask.id); // โหลดข้อมูลใหม่เพื่ออัปเดต Diff
            }
        } catch (error) {
            toast.error("บันทึกล้มเหลว");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCompleteTask = async () => {
        if (!confirm("⚠️ ยืนยันการปิดเอกสาร?\nระบบจะสร้างรายการปรับยอด (Stock Adjustment) ให้อัตโนมัติสำหรับรายการที่ยอดไม่ตรงกัน")) return;

        setIsLoading(true);
        try {
            const res = await apiFetch(`/inventory/count-tasks/${selectedTask.id}/complete`, {
                method: "POST"
            });
            if (res.success) {
                toast.success(res.message);
                setView('LIST');
                fetchTasks();
            }
        } catch (error) {
            toast.error(error.message || "ปิดเอกสารล้มเหลว");
        } finally {
            setIsLoading(false);
        }
    };

    // ==========================================
    // 📊 ACTION: EXPORT TO EXCEL (CSV)
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

            // แปลง Response เป็น Blob (ไฟล์)
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            // เปิด PDF ในแท็บใหม่ให้สั่งปรินต์ได้เลย
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
        // 💡 เอา if(!confirm(...)) ออก เพราะเราไปเช็คใน Pop-up แล้ว
        setIsLoading(true);
        try {
            const res = await apiFetch(`/inventory/count-tasks/${taskId}`, {
                method: "DELETE"
            });
            if (res.success) {
                toast.success("ลบเอกสารสำเร็จ");
                fetchTasks(); // โหลดข้อมูลใหม่
            }
        } catch (error) {
            toast.error(error.message || "ลบเอกสารล้มเหลว");
        } finally {
            setIsLoading(false);
            setShowDeleteModal(false); // ปิด Pop-up หลังลบเสร็จ
            setTaskToDelete(null); // เคลียร์ค่า
        }
    };

    // ==========================================
    // 🎨 UI HELPERS
    // ==========================================
    const getStatusBadge = (status) => {
        const baseClass = "px-4 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest border shadow-sm flex items-center gap-2 w-fit";

        switch (status) {
            case 'PENDING': return <span className={`${baseClass} bg-amber-50 text-amber-600 border-amber-100`}><Clock className="w-4 h-4" /> รอตรวจนับ</span>;
            case 'COUNTING': return <span className={`${baseClass} bg-blue-50 text-blue-600 border-blue-100`}><Search className="w-4 h-4" /> กำลังตรวจนับ</span>;
            case 'REVIEW': return <span className={`${baseClass} bg-purple-50 text-purple-600 border-purple-100`}><AlertCircle className="w-4 h-4" /> รอตรวจสอบ</span>;
            case 'COMPLETED': return <span className={`${baseClass} bg-emerald-50 text-emerald-600 border-emerald-100`}><CheckCircle2 className="w-4 h-4" /> เสร็จสิ้น (ปรับยอดแล้ว)</span>;
            default: return <span className={`${baseClass} bg-slate-50 text-slate-500 border-slate-200`}>{status}</span>;
        }
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="w-[96%] max-w-[1600px] mx-auto space-y-8 pt-10 pb-10">

                {/* --- HEADER --- */}
                <div className="w-full mb-6 print:hidden">
                    <div className="flex flex-col gap-6 px-6 md:px-10">

                        {/* 💡 1. ปุ่มย้อนกลับทรงเหลี่ยม (แสดงเฉพาะหน้า DETAIL) จัดให้อยู่บรรทัดบนสุด */}
                        {view === 'DETAIL' && (
                            <div className="flex justify-start animate-in fade-in duration-300">
                                <button
                                    onClick={() => setView('LIST')}
                                    className="group flex items-center gap-2.5 bg-white border-2 border-slate-200 px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md hover:border-[#1F3B8B] hover:bg-slate-50 transition-all active:scale-95 w-fit"
                                >
                                    <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-[#1F3B8B] transition-colors" />
                                    <span className="text-sm font-black text-slate-600 group-hover:text-[#1F3B8B] uppercase tracking-wider transition-colors">
                                        ย้อนกลับ
                                    </span>
                                </button>
                            </div>
                        )}

                        {/* 💡 2. ส่วนแถวหัวข้อ และ ปุ่มสร้างใบสั่งนับ */}
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">

                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                                    <ClipboardList className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                            Cycle Count System
                                        </p>
                                    </div>
                                    <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                                        ระบบตรวจนับสต๊อก
                                    </h1>
                                </div>
                            </div>

                            {view === 'LIST' && (
                                <div className="flex items-center">
                                    <button onClick={() => setShowCreateModal(true)} className="group flex items-center gap-2 bg-emerald-600 text-white px-7 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-emerald-700 shadow-xl shadow-emerald-900/10 transition-all active:scale-95 whitespace-nowrap">
                                        <Plus className="w-5 h-5 shrink-0" strokeWidth={3} /> สร้างใบสั่งนับใหม่
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* 📝 MODE 1: LIST VIEW */}
                {/* ========================================================================= */}
                {view === 'LIST' && (
                    <section className="overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/70 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.12)] backdrop-blur-sm animate-in fade-in duration-500 mx-6 md:mx-10">
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-base text-left border-collapse">
                                <thead className="bg-slate-50 border-b-2 border-slate-100">
                                    <tr className="text-slate-500 font-bold text-base tracking-wider">
                                        <th className="p-6 pl-8">เลขที่เอกสาร</th>
                                        <th className="p-6">สถานะ</th>
                                        <th className="p-6">วันที่สร้าง</th>
                                        <th className="p-6">หมายเหตุ</th>
                                        <th className="p-6 text-center">ดำเนินการ</th>
                                        <th className="p-6 text-center pr-8 w-16">ลบ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white/50">
                                    {tasks.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="p-24 text-center">
                                                <ClipboardList className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                                                <p className="text-slate-500 font-black tracking-wide text-sm">ไม่พบใบสั่งตรวจนับในระบบ</p>
                                            </td>
                                        </tr>
                                    )}
                                    {tasks.map((task) => (
                                        <tr key={task.id} className="hover:bg-slate-50/80 group transition-colors">
                                            <td className="p-6 pl-8 font-black text-blue-800 uppercase tracking-tight text-base tabular-nums group-hover:text-blue-600">
                                                {task.taskNo}
                                            </td>
                                            <td className="p-6">
                                                {getStatusBadge(task.status)}
                                            </td>
                                            <td className="p-6">
                                                <div className="font-mono text-sm text-slate-600 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors"></div>
                                                    {new Date(task.createdAt).toLocaleDateString('th-TH')}
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <p className="font-bold text-slate-800 text-sm truncate max-w-[200px]">{task.remarks || '-'}</p>
                                            </td>
                                            <td className="p-6 text-center">
                                                <button
                                                    onClick={() => openTaskDetail(task.id)}
                                                    className="bg-white text-[#1e3b8a] border border-slate-200 hover:border-[#1e3b8a] hover:bg-[#1e3b8a] hover:text-white px-5 py-2.5 rounded-xl transition-all font-black text-xs uppercase tracking-wider shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2 mx-auto"
                                                >
                                                    {task.status === 'COMPLETED' ? 'ดูรายละเอียด' : 'เปิดคีย์ข้อมูล'}
                                                </button>
                                            </td>
                                            <td className="p-6 text-center pr-8">
                                                {task.status !== 'COMPLETED' ? (
                                                    <button
                                                        onClick={() => {
                                                            // 💡 เปลี่ยนจากการเรียกฟังก์ชันลบตรงๆ เป็นการเก็บข้อมูลและเปิด Pop-up แทน
                                                            setTaskToDelete({ id: task.id, taskNo: task.taskNo });
                                                            setShowDeleteModal(true);
                                                        }}
                                                        className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-xl transition-all shadow-sm active:scale-95 mx-auto block"
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
                    </section>
                )}

                {/* ========================================================================= */}
                {/* 📝 MODE 2: DETAIL / DATA ENTRY VIEW */}
                {/* ========================================================================= */}
                {view === 'DETAIL' && selectedTask && (
                    <div className="px-6 md:px-10 space-y-6 animate-in slide-in-from-bottom-4 duration-500">



                        <div className="bg-white rounded-[3.5rem] border-2 border-slate-200 shadow-2xl overflow-hidden w-full max-w-[1550px] mx-auto flex flex-col mb-10">

                            {/* Card Header */}
                            <div className="bg-white p-12 text-slate-950 border-b-2 border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">

                                {/* 📍 ฝั่งซ้าย: หัวข้อและเลขที่เอกสาร */}
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <p className="text-slate-500 text-sm font-black uppercase tracking-[0.3em]">
                                            เอกสาร
                                        </p>
                                    </div>
                                    <h2 className="text-2xl lg:text-3xl tabular-nums font-black tracking-tighter text-[#1F3B8B]">
                                        {selectedTask.taskNo}
                                    </h2>
                                </div>

                                {/* 📍 ฝั่งขวา: ป้ายสถานะ และ ปุ่ม Action ต่างๆ */}
                                <div className="flex flex-col items-start md:items-end gap-4">

                                    {/* 💡 ย้าย Badge ป้ายสถานะ มาไว้ฝั่งขวาตรงนี้ */}
                                    {getStatusBadge(selectedTask.status)}

                                    {/* กลุ่มปุ่ม Action */}
                                    <div className="flex flex-wrap gap-3 mt-1">
                                        {selectedTask.status !== 'COMPLETED' && (
                                            <button
                                                onClick={handleExportPDF}
                                                disabled={isLoading}
                                                className="bg-white border-2 border-[#1F3B8B] text-[#1F3B8B] hover:bg-blue-50 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <FileText className="w-4 h-4" /> ปรินต์ใบสั่งตรวจนับ (PDF)
                                            </button>
                                        )}

                                        {selectedTask.status !== 'COMPLETED' && (
                                            <>
                                                <button
                                                    onClick={handleSaveProgress}
                                                    disabled={isLoading}
                                                    className="bg-slate-800 text-white hover:bg-slate-900 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-2"
                                                >
                                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                    บันทึกยอด (Save)
                                                </button>
                                                <button
                                                    onClick={handleCompleteTask}
                                                    disabled={isLoading}
                                                    className="bg-emerald-600 text-white hover:bg-emerald-700 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-900/10 transition-all active:scale-95 flex items-center gap-2"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" /> อนุมัติปรับสต๊อก
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Info Bar */}
                            <div className="px-12 pt-8 pb-4">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 mb-2">
                                    <Boxes className="w-6 h-6 text-indigo-500" /> รายการที่ต้องตรวจนับ
                                </h3>
                                <p className="text-sm font-bold text-slate-500 ml-9">
                                    คีย์ตัวเลขที่นับได้จากกระดาษลงในช่อง "ยอดนับจริง" หรือดาวน์โหลดไฟล์ไปจด
                                </p>
                            </div>

                            {/* Data Entry Table */}
                            <div className="p-12 pt-4">
                                <div className="border-2 border-slate-200 rounded-[3.5rem] overflow-hidden shadow-2xl bg-white">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50 border-b-2 border-slate-200">
                                            <tr className="text-sm font-black uppercase text-slate-500 tracking-widest whitespace-nowrap">
                                                <th className="p-8 pl-12 w-[25%]">ตำแหน่ง (Location)</th>
                                                <th className="p-8 w-[35%]">สินค้า (Product)</th>
                                                <th className="p-8 text-center bg-slate-100/50 w-[10%]">ยอดระบบ</th>
                                                <th className="p-8 text-center text-[#1F3B8B] w-[20%]">ยอดนับจริง (Input)</th>
                                                <th className="p-8 text-center pr-12 w-[10%]">ส่วนต่าง</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {taskItems.map((item, index) => {
                                                const diff = item.inputQty !== '' ? (Number(item.inputQty) - item.systemQty) : (item.diffQty || 0);

                                                return (
                                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="p-8 pl-12">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <MapPin className="w-5 h-5 text-indigo-500 shrink-0" />
                                                                <span className="font-black text-lg text-slate-800">{item.location?.code}</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-400 block ml-7 uppercase tracking-widest">
                                                                {item.location?.warehouse?.name}
                                                            </span>
                                                        </td>
                                                        <td className="p-8">
                                                            <p className="font-black text-slate-900 text-lg uppercase mb-1.5">{item.product?.sku}</p>
                                                            <span className="text-xs text-[#1F3B8B] font-black bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 tabular-nums line-clamp-1 w-fit">
                                                                {item.product?.name}
                                                            </span>
                                                        </td>
                                                        <td className="p-8 text-center bg-slate-50/30">
                                                            <span className="text-2xl font-black text-slate-400 tabular-nums">{item.systemQty}</span>
                                                        </td>
                                                        <td className="p-8 text-center">
                                                            {selectedTask.status === 'COMPLETED' ? (
                                                                <span className="text-3xl font-black text-[#1F3B8B] tabular-nums bg-slate-50 px-6 py-3 rounded-3xl border border-slate-100">{item.countedQty ?? '-'}</span>
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={item.inputQty}
                                                                    onChange={(e) => handleQtyChange(index, e.target.value)}
                                                                    className="w-32 mx-auto block text-center border-2 border-slate-200 focus:border-[#1F3B8B] bg-slate-50 text-[#1F3B8B] rounded-2xl py-3 text-2xl tabular-nums font-black outline-none focus:ring-4 focus:ring-blue-900/10 transition-all placeholder:text-slate-300"
                                                                    placeholder="ว่าง"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="p-8 text-center pr-12">
                                                            {item.inputQty !== '' || selectedTask.status === 'COMPLETED' ? (
                                                                <span className={`inline-block min-w-[70px] px-4 py-2.5 rounded-xl text-base font-black tabular-nums border shadow-sm ${diff > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                                    diff < 0 ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                                        'bg-slate-100 text-slate-400 border-slate-200'
                                                                    }`}>
                                                                    {diff > 0 ? '+' : ''}{diff}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300 font-black text-xl">-</span>
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
                                // 💡 Validation: ตรวจสอบก่อนส่งฟอร์ม ถ้าไม่มีให้แสดง Error
                                if (!newForm.warehouseId) {
                                    setShowError(true);
                                    return;
                                }

                                // 💡 เปลี่ยนจากการเรียก confirm() ของ Browser เป็นการเปิด Modal ที่เราสร้างเอง
                                setShowConfirmModal(true);
                            }}
                            className="bg-white rounded-[3.5rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-slate-100"
                        >

                            <div className="flex justify-between items-center mb-8 border-b-2 border-slate-100 pb-6">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                    <div className="p-3 bg-[#1F3B8B]/10 rounded-2xl">
                                        <ClipboardList className="w-6 h-6 text-[#1F3B8B]" />
                                    </div>
                                    สร้างใบสั่งนับสต๊อก
                                </h3>
                                {/* 💡 เอา Confirm ออก กดแล้วปิดทันที พร้อมเคลียร์ Error */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setShowError(false);
                                    }}
                                    className="bg-slate-50 hover:bg-rose-50 hover:text-rose-500 text-slate-400 p-3 rounded-full transition-colors active:scale-95"
                                >
                                    <AlertCircle className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-8 mb-10">
                                {/* เลือกคลังสินค้า */}
                                <div className="group">
                                    <label className={`text-[12px] font-black uppercase tracking-widest flex items-center gap-2 mb-3 ${showError ? 'text-rose-500' : 'text-slate-400'}`}>
                                        <div className={`p-1.5 rounded-lg transition-colors ${showError ? 'bg-rose-100' : 'bg-indigo-50 group-focus-within:bg-indigo-100'}`}>
                                            <Building2 className={`w-4 h-4 ${showError ? 'text-rose-600' : 'text-indigo-600'}`} />
                                        </div>
                                        เลือกคลังสินค้า *
                                    </label>
                                    <select
                                        value={newForm.warehouseId}
                                        onChange={e => {
                                            setNewForm({ ...newForm, warehouseId: e.target.value, zoneId: '' });
                                            if (e.target.value) setShowError(false); // พิมพ์แล้วให้ Error หายไป
                                        }}
                                        // 💡 เปลี่ยนสีขอบและพื้นหลังเมื่อเกิด Error
                                        className={`w-full border-2 rounded-2xl p-4 text-base font-bold outline-none transition-all shadow-sm ${showError
                                            ? 'border-rose-400 bg-rose-50 text-rose-900 focus:border-rose-500'
                                            : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-[#1F3B8B]'
                                            }`}
                                    >
                                        <option value="">-- เลือกคลังสินค้า --</option>
                                        {masterData.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>

                                    {/* 💡 ข้อความ Alert ใต้ช่อง */}
                                    {showError && (
                                        <div className="flex items-center gap-1.5 mt-3 text-rose-500 animate-in slide-in-from-top-1">
                                            <AlertCircle className="w-4 h-4" />
                                            <span className="text-xs font-bold tracking-wide">กรุณาเลือกคลังสินค้า</span>
                                        </div>
                                    )}
                                </div>

                                {/* เลือกโซน */}
                                <div className="group">
                                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                                        <div className="p-1.5 bg-amber-50 rounded-lg group-focus-within:bg-amber-100 transition-colors">
                                            <Layers className="w-4 h-4 text-amber-600" />
                                        </div>
                                        เลือกโซน (Optional)
                                    </label>
                                    <select
                                        value={newForm.zoneId}
                                        disabled={!newForm.warehouseId}
                                        onChange={e => setNewForm({ ...newForm, zoneId: e.target.value })}
                                        className="w-full border-2 border-slate-200 rounded-2xl p-4 text-base font-bold outline-none focus:border-[#1F3B8B] bg-slate-50 focus:bg-white transition-all disabled:opacity-50 disabled:bg-slate-100 shadow-sm"
                                    >
                                        <option value="">-- นับทุกโซนในคลังนี้ --</option>
                                        {masterData.zones
                                            .filter(z => z.warehouseId === newForm.warehouseId)
                                            .map(z => <option key={z.id} value={z.id}>{z.code} - {z.name}</option>)
                                        }
                                    </select>
                                </div>

                                {/* หมายเหตุสั่งการ */}
                                <div className="group">
                                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                                        <div className="p-1.5 bg-sky-50 rounded-lg group-focus-within:bg-sky-100 transition-colors">
                                            <MessageSquareText className="w-4 h-4 text-sky-600" />
                                        </div>
                                        หมายเหตุสั่งการ
                                    </label>
                                    <input
                                        type="text"
                                        value={newForm.remarks}
                                        onChange={e => setNewForm({ ...newForm, remarks: e.target.value })}
                                        placeholder="เช่น ตรวจนับประจำเดือนเมษายน"
                                        className="w-full border-2 border-slate-200 rounded-2xl p-4 text-base font-bold outline-none focus:border-[#1F3B8B] bg-slate-50 focus:bg-white transition-all placeholder:text-slate-300 shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8">
                                {/* 💡 เอา Confirm ออก กดแล้วปิดทันที */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setShowError(false);
                                    }}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-emerald-700 shadow-xl shadow-emerald-900/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} สร้างเอกสาร
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                {/* 📍 นำโค้ด ขั้นตอนที่ 3 มาวางต่อท้ายตรงนี้ได้เลยครับ 📍 */}
                {/* ========================================================================= */}
                {/* 🪟 MODAL: CONFIRM CREATE TASK (ป็อปอัพยืนยันการสร้าง) */}
                {/* ========================================================================= */}
                {showConfirmModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[3.5rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-slate-100 flex flex-col items-center text-center">

                            {/* ไอคอนตรงกลาง */}
                            <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-indigo-100">
                                <ClipboardList className="w-10 h-10 text-indigo-600" />
                            </div>

                            <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">
                                ยืนยันการสร้างเอกสาร
                            </h3>
                            <p className="text-sm font-bold text-slate-500 mb-8">
                                ยืนยันการสร้างใบสั่งนับสต๊อกใช่หรือไม่?
                            </p>

                            {/* ปุ่มกดยืนยัน / ยกเลิก */}
                            <div className="flex w-full gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        setShowConfirmModal(false);
                                        // 💡 ส่ง mock event ไปให้ ป้องกัน Error เพราะใน handleCreateTask มีการเรียก e.preventDefault()
                                        handleCreateTask({ preventDefault: () => { } });
                                    }}
                                    disabled={isLoading}
                                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-emerald-700 shadow-xl shadow-emerald-900/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />} ยืนยัน
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* ========================================================================= */}
                {/* 🪟 MODAL: CONFIRM DELETE TASK (ป็อปอัพยืนยันการลบ สีแดง) */}
                {/* ========================================================================= */}
                {showDeleteModal && taskToDelete && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[3.5rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border-2 border-slate-100 flex flex-col items-center text-center">

                            {/* ไอคอนตรงกลาง (โทนสีแดง) */}
                            <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-rose-100">
                                <Trash2 className="w-10 h-10 text-rose-600" />
                            </div>

                            <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">
                                ยืนยันการลบเอกสาร
                            </h3>
                            <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">
                                คุณต้องการลบเอกสาร <span className="text-rose-600 font-black">{taskToDelete.taskNo}</span> ใช่หรือไม่? <br />
                                <span className="text-xs font-normal mt-1 block">ข้อมูลการนับในเอกสารนี้จะถูกลบทิ้งทั้งหมด</span>
                            </p>

                            {/* ปุ่มกดยืนยัน / ยกเลิก */}
                            <div className="flex w-full gap-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setTaskToDelete(null); // เคลียร์ค่าทิ้งถ้ายกเลิก
                                    }}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteTask(taskToDelete.id)}
                                    disabled={isLoading}
                                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-rose-700 shadow-xl shadow-rose-900/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />} ยืนยันลบ
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </AuthGate>
    );
}