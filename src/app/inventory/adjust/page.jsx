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
    Trash2// 💡 นำเข้าไอคอน Download
} from "lucide-react";

export default function CountTasksPage() {
    const router = useRouter();
    const [view, setView] = useState('LIST'); // 'LIST' | 'DETAIL'
    const [isLoading, setIsLoading] = useState(false);

    // State for List View
    const [tasks, setTasks] = useState([]);
    const [masterData, setMasterData] = useState({ warehouses: [], zones: [] });
    const [showCreateModal, setShowCreateModal] = useState(false);

    // State for Create Form
    const [newForm, setNewForm] = useState({ warehouseId: '', zoneId: '', remarks: '' });

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
            // 💡 ใช้ getAccessToken() ดึง Token ที่ถูกต้องของระบบคุณ
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
    const handleDeleteTask = async (taskId, taskNo) => {
        if (!confirm(`คุณต้องการลบเอกสารใบสั่งตรวจนับ ${taskNo} ใช่หรือไม่?\nข้อมูลการนับในเอกสารนี้จะถูกลบทิ้งทั้งหมด`)) return;

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
        }
    };

    // ==========================================
    // 🎨 UI HELPERS
    // ==========================================
    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDING': return <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-black tracking-wider">รอตรวจนับ</span>;
            case 'COUNTING': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black tracking-wider">กำลังตรวจนับ</span>;
            case 'REVIEW': return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-black tracking-wider">รอตรวจสอบ</span>;
            case 'COMPLETED': return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black tracking-wider">เสร็จสิ้น (ปรับยอดแล้ว)</span>;
            default: return <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-black">{status}</span>;
        }
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-6 pb-10 pt-6 px-4 md:px-0">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 pb-6 gap-4">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                            <ClipboardList className="w-7 h-7 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-1">Cycle Count System</p>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">ระบบตรวจนับสต๊อก</h1>
                        </div>
                    </div>
                    {view === 'LIST' && (
                        <button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md transition-colors flex items-center gap-2">
                            <Plus className="w-4 h-4" /> สร้างใบสั่งนับใหม่
                        </button>
                    )}
                </div>

                {/* ========================================================================= */}
                {/* 📝 MODE 1: LIST VIEW */}
                {/* ========================================================================= */}
                {view === 'LIST' && (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="p-5 pl-6">เลขที่เอกสาร</th>
                                        <th className="p-5">สถานะ</th>
                                        <th className="p-5">วันที่สร้าง</th>
                                        <th className="p-5">หมายเหตุ</th>
                                        <th className="p-5 text-center">ดำเนินการ</th>
                                        <th className="p-5 text-center pr-6 w-16">ลบ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tasks.length === 0 && (
                                        <tr><td colSpan="6" className="p-10 text-center text-slate-400 font-bold">ไม่พบใบสั่งตรวจนับในระบบ</td></tr>
                                    )}
                                    {tasks.map((task) => (
                                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="p-5 pl-6 font-black text-indigo-700">{task.taskNo}</td>
                                            <td className="p-5">{getStatusBadge(task.status)}</td>
                                            <td className="p-5 text-sm font-bold text-slate-600 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-slate-400" />
                                                {new Date(task.createdAt).toLocaleDateString('th-TH')}
                                            </td>
                                            <td className="p-5 text-sm text-slate-500 truncate max-w-[200px]">{task.remarks || '-'}</td>

                                            {/* คอลัมน์ดำเนินการ (เปิดดู/คีย์ข้อมูล) */}
                                            <td className="p-5 text-center">
                                                <button
                                                    onClick={() => openTaskDetail(task.id)}
                                                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                                >
                                                    {task.status === 'COMPLETED' ? 'ดูรายละเอียด' : 'เปิดคีย์ข้อมูล'}
                                                </button>
                                            </td>

                                            {/* 💡 คอลัมน์ลบแยกต่างหาก */}
                                            <td className="p-5 text-center pr-6">
                                                {task.status !== 'COMPLETED' ? (
                                                    <button
                                                        onClick={() => handleDeleteTask(task.id, task.taskNo)}
                                                        className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-xl transition-all shadow-sm"
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
                    </div>
                )}

                {/* ========================================================================= */}
                {/* 📝 MODE 2: DETAIL / DATA ENTRY VIEW */}
                {/* ========================================================================= */}
                {view === 'DETAIL' && selectedTask && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                        {/* Control Bar */}
                        <div className="flex items-center gap-4">
                            <button onClick={() => setView('LIST')} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                เอกสาร: <span className="text-indigo-600">{selectedTask.taskNo}</span>
                                {getStatusBadge(selectedTask.status)}
                            </h2>
                        </div>

                        {/* Data Entry Table */}
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-2">
                                        <Boxes className="w-5 h-5 text-indigo-500" /> รายการที่ต้องตรวจนับ
                                    </h3>
                                    <p className="text-xs font-bold text-slate-500">
                                        คีย์ตัวเลขที่นับได้จากกระดาษลงในช่อง "ยอดนับจริง" หรือดาวน์โหลดไฟล์ไปจด
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    {/* 💡 แสดงปุ่ม PDF เฉพาะเมื่อสถานะยังไม่เป็น COMPLETED เท่านั้น */}
                                    {selectedTask.status !== 'COMPLETED' && (
                                        <button
                                            onClick={handleExportPDF}
                                            disabled={isLoading}
                                            className="px-5 py-2.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm transition-colors flex items-center gap-2"
                                        >
                                            <FileText className="w-4 h-4" /> ปรินต์ใบสั่งตรวจนับ (PDF)
                                        </button>
                                    )}

                                    {/* Actions Button (Show only if not completed) */}
                                    {selectedTask.status !== 'COMPLETED' && (
                                        <>
                                            <button
                                                onClick={handleSaveProgress}
                                                disabled={isLoading}
                                                className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm transition-colors flex items-center gap-2"
                                            >
                                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                บันทึกยอด (Save)
                                            </button>
                                            <button
                                                onClick={handleCompleteTask}
                                                disabled={isLoading}
                                                className="px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm transition-colors flex items-center gap-2"
                                            >
                                                <CheckCircle2 className="w-4 h-4" /> อนุมัติปรับสต๊อก
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white border-b border-slate-200 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                                        <tr>
                                            <th className="p-4 pl-6">ตำแหน่ง (Location)</th>
                                            <th className="p-4">สินค้า (Product)</th>
                                            <th className="p-4 text-center bg-slate-50">ยอดระบบ</th>
                                            <th className="p-4 text-center bg-indigo-50/50 text-indigo-700">ยอดนับจริง (Input)</th>
                                            <th className="p-4 text-center">ส่วนต่าง</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {taskItems.map((item, index) => {
                                            const diff = item.inputQty !== '' ? (Number(item.inputQty) - item.systemQty) : (item.diffQty || 0);
                                            const hasDiff = diff !== 0 && item.inputQty !== '';

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 pl-6">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="w-4 h-4 text-slate-400" />
                                                            <span className="font-black text-sm text-slate-700">{item.location?.code}</span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{item.location?.warehouse?.name}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="font-black text-sm text-indigo-800">{item.product?.sku}</p>
                                                        <p className="text-xs font-semibold text-slate-500 truncate max-w-[250px]">{item.product?.name}</p>
                                                    </td>
                                                    <td className="p-4 text-center bg-slate-50">
                                                        <span className="text-sm font-black text-slate-400 tabular-nums">{item.systemQty}</span>
                                                    </td>
                                                    <td className="p-4 text-center bg-indigo-50/20">
                                                        {selectedTask.status === 'COMPLETED' ? (
                                                            <span className="text-base font-black text-indigo-700 tabular-nums">{item.countedQty ?? '-'}</span>
                                                        ) : (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={item.inputQty}
                                                                onChange={(e) => handleQtyChange(index, e.target.value)}
                                                                className="w-24 mx-auto block text-center border-2 border-indigo-200 focus:border-indigo-600 bg-white text-indigo-900 rounded-lg py-2 text-base tabular-nums font-black outline-none focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-slate-300"
                                                                placeholder="ว่าง"
                                                            />
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {item.inputQty !== '' || selectedTask.status === 'COMPLETED' ? (
                                                            <span className={`inline-block min-w-[50px] px-2.5 py-1 rounded-md text-xs font-black tabular-nums border ${diff > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                                                diff < 0 ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                                    'bg-slate-100 text-slate-400 border-transparent'
                                                                }`}>
                                                                {diff > 0 ? '+' : ''}{diff}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
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

                {/* ========================================================================= */}
                {/* 🪟 MODAL: CREATE TASK */}
                {/* ========================================================================= */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                        <form onSubmit={handleCreateTask} className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100">
                            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-indigo-600" /> สร้างใบสั่งนับสต๊อก
                                </h3>
                                <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                    <AlertCircle className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">เลือกคลังสินค้า</label>
                                    <select
                                        required
                                        value={newForm.warehouseId}
                                        onChange={e => setNewForm({ ...newForm, warehouseId: e.target.value, zoneId: '' })}
                                        className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                                    >
                                        <option value="">-- เลือกคลังสินค้า --</option>
                                        {masterData.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">เลือกโซน (Optional)</label>
                                    <select
                                        value={newForm.zoneId}
                                        disabled={!newForm.warehouseId}
                                        onChange={e => setNewForm({ ...newForm, zoneId: e.target.value })}
                                        className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500 disabled:bg-slate-50"
                                    >
                                        <option value="">-- นับทุกโซนในคลังนี้ --</option>
                                        {masterData.zones
                                            .filter(z => z.warehouseId === newForm.warehouseId)
                                            .map(z => <option key={z.id} value={z.id}>{z.code} - {z.name}</option>)
                                        }
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">หมายเหตุสั่งการ</label>
                                    <input
                                        type="text"
                                        value={newForm.remarks}
                                        onChange={e => setNewForm({ ...newForm, remarks: e.target.value })}
                                        placeholder="เช่น ตรวจนับประจำเดือนเมษายน"
                                        className="w-full border-2 border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
                                    ยกเลิก
                                </button>
                                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} สร้างเอกสาร
                                </button>
                            </div>
                        </form>
                    </div>
                )}

            </div>
        </AuthGate>
    );
}