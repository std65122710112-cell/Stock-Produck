"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Truck, ClipboardCheck, Database, ArrowLeft, Package, MapPin,
    User, Hash, CheckCircle2, Trash2, Layers, ShieldCheck,
    UserCheck, Clock, X, LayoutDashboard, Building2,
    MessageSquare, Info, AlertTriangle, ArrowUpRight,
    MapPinned, FileText, Plus // 💡 นำเข้า Plus icon สำหรับปุ่มแบ่งเบิก
} from "lucide-react";

export default function ProfessionalOutboundPage() {
    const [viewMode, setViewMode] = useState('LIST');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [allSRs, setAllSRs] = useState([]);
    const [stockBalances, setStockBalances] = useState([]);
    const [selectedSR, setSelectedSR] = useState(null);
    const [doNo, setDoNo] = useState("");
    const [remarks, setRemarks] = useState("");
    const [items, setItems] = useState([]);

    // 💡 State สำหรับ Custom Modal
    const [modal, setModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null, type: "primary" });

    // 🔒 ฟังก์ชันล็อกการเลื่อนหน้าจอ (Body Scroll Lock)
    useEffect(() => {
        if (modal.isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [modal.isOpen]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [srRes, balRes] = await Promise.all([
                apiFetch("/outbound/requisitions").catch(() => []),
                apiFetch("/inventory/balances").catch(() => [])
            ]);
            const filtered = (Array.isArray(srRes) ? srRes : []).filter(r => r.status === 'APPROVED' || r.status === 'COMPLETED');
            setAllSRs(filtered);
            setStockBalances(Array.isArray(balRes) ? balRes : balRes?.data || []);
        } catch (e) {
            toast.error("โหลดข้อมูลล้มเหลว");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleSelectSR = (sr) => {
        if (sr.status === 'COMPLETED') return;
        setSelectedSR(sr);
        setDoNo(`DO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`);
        const mappedItems = (sr.items || []).map(it => ({
            id: Date.now() + Math.random(),
            originalId: it.id, // ใช้ในการอ้างอิงสินค้าตัวเดิม กรณีแยกคลัง
            productId: it.productId,
            productName: it.product?.name,
            sku: it.product?.sku,
            requiredQty: Number(it.quantity),
            quantity: Number(it.quantity),
            locationId: "",
            remark: it.remark
        }));
        setItems(mappedItems);
        setRemarks("");
        setViewMode('FORM');
    };

    const getAvailableLocations = (productId) => stockBalances.filter(b => b.productId === productId && b.quantity > 0);

    const getAvailableStock = (productId, locationId) => {
        const balance = stockBalances.find(b => b.productId === productId && b.locationId === locationId);
        return balance ? balance.quantity : 0;
    };

    const updateItem = (id, field, value) => setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));

    // 💡 ฟังก์ชันสำหรับกดปุ่ม "แยกเบิก" (เพิ่มแถวใหม่สำหรับสินค้าเดิม)
    const handleSplitItem = (itemToSplit) => {
        // คำนวณว่าตอนนี้กรอกยอดไปแล้วเท่าไหร่
        const currentTotalPicked = items.filter(it => it.originalId === itemToSplit.originalId).reduce((sum, it) => sum + Number(it.quantity || 0), 0);
        const remaining = itemToSplit.requiredQty - currentTotalPicked;

        const newItem = {
            ...itemToSplit,
            id: Date.now() + Math.random(), // สร้าง ID แถวใหม่
            locationId: "", // ล้างช่องคลังสินค้าให้เลือกใหม่
            quantity: remaining > 0 ? remaining : 0, // คำนวณยอดที่เหลือไปใส่ให้อัตโนมัติ
        };

        const index = items.findIndex(it => it.id === itemToSplit.id);
        const newItems = [...items];
        newItems.splice(index + 1, 0, newItem); // แทรกแถวใหม่ต่อท้ายแถวเดิม
        setItems(newItems);
    };

    const removeItem = (id) => {
        if (items.length > 1) {
            setModal({
                isOpen: true,
                title: "ยืนยันการลบรายการ",
                message: "คุณต้องการลบพัสดุนี้ออกจากรายการนำจ่ายใช่หรือไม่?",
                type: "danger",
                onConfirm: () => {
                    setItems(items.filter(it => it.id !== id));
                    setModal({ ...modal, isOpen: false });
                }
            });
        } else {
            toast.error("ต้องมีอย่างน้อย 1 รายการ");
        }
    };

    const checkIsOverRequired = (originalId, requiredQty) => {
        const sumInputQty = items.filter(it => it.originalId === originalId).reduce((sum, it) => sum + Number(it.quantity || 0), 0);
        return sumInputQty > requiredQty;
    };

    const canSubmit = useMemo(() => {
        return doNo.trim() !== "" && items.every(it => {
            return it.locationId !== "" && it.quantity > 0 && it.quantity <= getAvailableStock(it.productId, it.locationId) && !checkIsOverRequired(it.originalId, it.requiredQty);
        }) && !isSubmitting;
    }, [doNo, items, isSubmitting, stockBalances]);

    const executeSubmit = async () => {
        setModal({ ...modal, isOpen: false });
        setIsSubmitting(true);
        const tid = toast.loading("กำลังบันทึกข้อมูล...");
        try {
            await apiFetch("/outbound/delivery-orders", {
                method: "POST",
                body: JSON.stringify({
                    doNo: doNo.trim(),
                    srId: selectedSR.id,
                    reference: selectedSR.srNumber,
                    remarks: remarks.trim(),
                    items: items.map(it => ({
                        productId: it.productId,
                        locationId: it.locationId,
                        quantity: Number(it.quantity)
                    }))
                })
            });
            toast.success("จ่ายสินค้าและตัดสต๊อกสำเร็จ", { id: tid });
            setViewMode('LIST');
            loadData();
        } catch (err) {
            toast.error(err.message, { id: tid });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setModal({
            isOpen: true,
            title: "ยืนยันการจ่ายพัสดุ",
            message: "ยอดคงเหลือในคลังจะถูกตัดออกทันที และไม่สามารถแก้ไขข้อมูลได้หลังจากนี้ ยืนยันดำเนินการหรือไม่?",
            type: "primary",
            onConfirm: executeSubmit
        });
    };

    return (
        <AuthGate>
            <Toaster position="top-right" />

            {/* --- CUSTOM FIXED MODAL (ล็อกกลางจอ) --- */}
            {modal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
                        onClick={() => setModal({ ...modal, isOpen: false })}
                    />
                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${modal.type === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-[#1e3b8a]'}`}>
                            {modal.type === 'danger' ? <AlertTriangle className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">{modal.title}</h3>
                        <p className="text-slate-500 font-medium leading-relaxed mb-8">{modal.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setModal({ ...modal, isOpen: false })}
                                className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-400 hover:bg-slate-50 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={modal.onConfirm}
                                className={`flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all active:scale-95 ${modal.type === 'danger' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' : 'bg-[#1e3b8a] hover:bg-[#1a3673] shadow-blue-200'}`}
                            >
                                ยืนยันดำเนินการ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-8 py-8 px-4 md:px-0 animate-in fade-in duration-500">
                {/* HEADER SECTION */}
                <div className="w-full pt-10 mb-6 print:hidden">
                    <div className="w-full px-6 md:px-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="w-[4.5rem] h-[4.5rem] rounded-[1.25rem] bg-white flex items-center justify-center shadow-sm shrink-0 border-2 border-slate-100">
                                <Truck className="w-8 h-8 text-[#1F3B8B]" strokeWidth={2} />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <ArrowUpRight className="w-4 h-4 text-[#1F3B8B]" strokeWidth={2.5} />
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#1F3B8B]">
                                        Inventory Outbound Management
                                    </p>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tighter leading-none mb-2">
                                    {viewMode === 'LIST' ? "คิวเบิกและประวัติการนำจ่าย" : "บันทึกการเบิกพัสดุ"}
                                </h1>
                                <div className="flex items-center gap-2 pt-1 opacity-90">
                                    <MapPinned className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                                        ระบบบริหารจัดการนำจ่ายสินค้าและตรวจสอบตำแหน่งจัดเก็บ
                                    </p>
                                </div>
                            </div>
                        </div>

                        {viewMode === 'FORM' && (
                            <div className="flex items-center">
                                <button
                                    onClick={() => setViewMode('LIST')}
                                    className="group flex items-center gap-3 bg-white border-2 border-slate-100 text-slate-600 px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95 shadow-sm"
                                >
                                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-[#1F3B8B] transition-colors" />
                                    ย้อนกลับ
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- LIST VIEW --- */}
                {viewMode === 'LIST' && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
                        <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-sm font-black text-slate-900 tracking-wide flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg"><LayoutDashboard className="w-5 h-5 text-indigo-600" /></div>
                                รายการใบเบิกพัสดุที่ผ่านการอนุมัติ (Approved SR)
                            </h2>
                            <div className="bg-sky-50 text-sky-700 border border-sky-200 text-xs px-4 py-1.5 rounded-full font-black uppercase tracking-wider">
                                {allSRs.length} รายการในระบบ
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white border-b border-slate-200">
                                    <tr className="text-xs font-black uppercase text-slate-500 tracking-wider">
                                        <th className="p-6">เลขที่ใบเบิก</th>
                                        <th className="p-6">ผู้ขอเบิก / แผนก</th>
                                        <th className="p-6 text-center">ผู้อนุมัติ</th>
                                        <th className="p-6 text-center">สถานะ</th>
                                        <th className="p-6 text-right">ดำเนินการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white/50">
                                    {isLoading ? (
                                        <tr><td colSpan="5" className="p-24 text-center text-slate-400 font-black uppercase text-sm animate-pulse tracking-widest">กำลังโหลดข้อมูลระบบ...</td></tr>
                                    ) : allSRs.length === 0 ? (
                                        <tr><td colSpan="5" className="p-32 text-center text-slate-400 font-black uppercase text-xs">ไม่มีรายการใบเบิกในขณะนี้</td></tr>
                                    ) : allSRs.map(sr => (
                                        <tr key={sr.id} className="hover:bg-blue-50 transition-colors group">
                                            <td className="p-6">
                                                <span className={`tabular-nums font-black text-base tracking-tight transition-colors ${sr.status === 'COMPLETED' ? 'text-slate-300' : 'text-[#1e3b8a] group-hover:text-blue-800'}`}>
                                                    {sr.srNumber}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <p className={`font-black text-sm uppercase ${sr.status === 'COMPLETED' ? 'text-slate-400' : 'text-slate-800'}`}>{sr.user?.firstName} {sr.user?.lastName}</p>
                                                <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-1"><Building2 className="w-3.5 h-3.5" /> {sr.department?.name}</p>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                                                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                                    <span className="text-xs font-black text-slate-700 uppercase">{sr.approver?.firstName || "System"}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm ${sr.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                                    {sr.status === 'COMPLETED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                                    {sr.status === 'COMPLETED' ? 'เบิกจ่ายแล้ว' : 'รอการนำจ่าย'}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right">
                                                {sr.status === 'COMPLETED' ? (
                                                    <span className="text-xs font-black text-slate-400 uppercase italic pr-4">จ่ายออกสำเร็จ ✓</span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleSelectSR(sr)}
                                                        className="bg-white text-[#1e3b8a] border border-slate-200 hover:border-[#1e3b8a] hover:bg-[#1e3b8a] hover:text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm hover:shadow-md active:scale-95"
                                                    >
                                                        จัดของ & จ่ายออก
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- FORM MODE --- */}
                {viewMode === 'FORM' && selectedSR && (
                    <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">

                        {/* Summary Header Card (Dark Theme) */}
                        <div className="bg-slate-950 text-white p-8 md:p-10 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row gap-6 md:gap-12 relative overflow-hidden border border-slate-800">
                            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                                <Truck className="w-64 h-64 text-emerald-400" />
                            </div>
                            <div className="relative z-10 w-full md:w-auto">
                                <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">เลขที่ใบนำจ่าย (Delivery Order)</p>
                                <p className="tabular-nums font-black text-3xl md:text-4xl tracking-tight text-white">{doNo}</p>
                            </div>
                            <div className="hidden md:block w-px bg-white/20 relative z-10"></div>
                            <div className="relative z-10 w-full md:w-auto flex-1">
                                <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">อ้างอิงใบเบิก (SR Ref.)</p>
                                <p className="tabular-nums font-black text-xl md:text-2xl tracking-tight text-white">{selectedSR.srNumber}</p>
                            </div>
                        </div>

                        {/* 💡 Requisition Information Detailed Dashboard */}
                        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                                <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2.5">
                                    <div className="p-2 bg-indigo-100 rounded-lg"><FileText className="w-5 h-5 text-indigo-600" /></div>
                                    รายละเอียดอ้างอิงจากใบเบิกต้นทาง (SR Details)
                                </h2>
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest">
                                    วันที่ขอเบิก: {new Date(selectedSR.createdAt).toLocaleDateString('th-TH')}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* กล่องผู้ขอเบิก */}
                                <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <User className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">ผู้ขอเบิกพัสดุ (Requester)</p>
                                        <p className="text-sm font-black text-slate-900">{selectedSR.user?.firstName} {selectedSR.user?.lastName}</p>
                                    </div>
                                </div>

                                {/* กล่องผู้อนุมัติ */}
                                <div className="flex items-start gap-3 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                    <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">ผู้อนุมัติเบิก (Approved By)</p>
                                        <p className="text-sm font-black text-emerald-950">{selectedSR.approver?.firstName} {selectedSR.approver?.lastName}</p>
                                    </div>
                                </div>

                                {/* กล่องแผนก */}
                                <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <Building2 className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">แผนกที่เบิก (Department)</p>
                                        <p className="text-sm font-black text-slate-900">{selectedSR.department?.name || 'ส่วนกลาง (General)'}</p>
                                    </div>
                                </div>

                                {/* วัตถุประสงค์ (ขยายเต็ม 3 คอลัมน์) */}
                                <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 md:col-span-3">
                                    <Layers className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                                    <div className="w-full">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">วัตถุประสงค์ / โครงการ (Purpose)</p>
                                            {selectedSR.referenceNo && <span className="text-[10px] font-black text-indigo-500 tracking-wider">Ref No: {selectedSR.referenceNo}</span>}
                                        </div>
                                        <p className="text-sm font-black text-slate-900">{selectedSR.purpose || 'ไม่ได้ระบุวัตถุประสงค์'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* หมายเหตุเพิ่มเติม */}
                            {selectedSR.remarks && (
                                <div className="mt-2 bg-amber-50/60 p-5 rounded-2xl border border-amber-100/60">
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> หมายเหตุจากผู้เบิก (SR Note)</p>
                                    <p className="text-xs font-bold text-slate-700 leading-relaxed">{selectedSR.remarks}</p>
                                </div>
                            )}
                        </div>

                        {/* Items Table Card */}
                        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                            <h2 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2.5 border-b border-slate-100 pb-4">
                                <div className="p-2 bg-blue-100 rounded-lg"><ClipboardCheck className="w-5 h-5 text-blue-600" /></div>
                                รายการพัสดุที่ต้องจัดเตรียมและนำจ่าย
                            </h2>
                            <div className="overflow-x-auto rounded-[2rem] border border-slate-100">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead className="bg-slate-50 text-xs font-black text-slate-500 uppercase border-b border-slate-200">
                                        <tr>
                                            <th className="p-5">รายการพัสดุ / SKU</th>
                                            <th className="p-5 text-center">ยอดเบิกรวม</th>
                                            <th className="p-5 w-[35%]">หยิบจากคลัง/โซน (Location) *</th>
                                            <th className="p-5 text-center text-blue-600 w-32">จำนวนที่จ่าย</th>
                                            <th className="p-5 text-center w-24">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 bg-white">
                                        {items.map((item, idx) => {
                                            const locs = getAvailableLocations(item.productId);
                                            const stock = getAvailableStock(item.productId, item.locationId);
                                            const isOverStock = item.quantity > stock;

                                            // 💡 คำนวณยอดรวมของสินค้านี้จากทุกแถว (กรณีมีแบ่งเบิกหลายคลัง)
                                            const currentTotalPicked = items.filter(it => it.originalId === item.originalId).reduce((sum, it) => sum + Number(it.quantity || 0), 0);
                                            const isOverRequired = currentTotalPicked > item.requiredQty;
                                            const isFullyPicked = currentTotalPicked === item.requiredQty;

                                            // 💡 ตรวจสอบว่าเป็นแถวแรกของสินค้าชิ้นนี้หรือไม่
                                            const isFirstOfGroup = items.findIndex(it => it.originalId === item.originalId) === idx;

                                            return (
                                                <tr key={item.id} className={`transition-colors ${isFirstOfGroup ? 'hover:bg-slate-50/50' : 'bg-slate-50/30 hover:bg-slate-50'}`}>
                                                    <td className="p-5">
                                                        {isFirstOfGroup ? (
                                                            <>
                                                                <p className="font-black text-slate-800 text-sm uppercase">[{item.sku}] {item.productName}</p>
                                                                {item.remark && <p className="text-[10px] text-amber-600 font-bold mt-1.5 flex items-center gap-1 italic"><Info className="w-3 h-3" /> หมายเหตุ: {item.remark}</p>}
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center gap-2 pl-4 text-slate-400">
                                                                <div className="w-3 h-3 border-l-2 border-b-2 border-slate-300 rounded-bl-lg mb-1"></div>
                                                                <span className="text-xs font-bold italic">แบ่งเบิกจากคลังอื่น</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        {isFirstOfGroup ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="font-black text-slate-950 text-xl tracking-tighter tabular-nums">{item.requiredQty}</span>
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 border ${isFullyPicked ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : (isOverRequired ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-amber-50 text-amber-600 border-amber-200')}`}>
                                                                    รวม: {currentTotalPicked}/{item.requiredQty}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300 font-bold">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-5">
                                                        <select
                                                            required
                                                            value={item.locationId}
                                                            onChange={e => updateItem(item.id, "locationId", e.target.value)}
                                                            className={`w-full border-2 rounded-xl px-3 py-3 text-xs font-black outline-none transition-colors ${item.locationId ? 'border-emerald-200 bg-emerald-50 text-emerald-800 focus:border-emerald-500' : 'border-slate-200 bg-white text-slate-700 focus:border-blue-500'}`}
                                                        >
                                                            <option value="">-- เลือกตำแหน่งเพื่อหยิบสินค้า --</option>
                                                            {locs.map(l => {
                                                                const whName = l.location.warehouse?.name || l.location.warehouse?.code || "คลังสินค้า";
                                                                const zoneName = l.location.zone?.name || l.location.zone?.code ? ` > ${l.location.zone?.name || l.location.zone?.code}` : "";
                                                                const locName = l.location.name || l.location.code;

                                                                return (
                                                                    <option key={l.locationId} value={l.locationId}>
                                                                        {whName}{zoneName} | จุดเก็บ: {locName} (คงเหลือ: {l.quantity})
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity === 0 ? '' : item.quantity}
                                                            onChange={e => updateItem(item.id, "quantity", e.target.value)}
                                                            className={`w-24 mx-auto block border-2 rounded-xl py-2 text-center tabular-nums font-black text-lg outline-none transition-all ${(isOverStock || isOverRequired) ? 'border-rose-500 bg-rose-50 text-rose-600 ring-4 ring-rose-100' : 'border-blue-600 bg-blue-50 text-blue-900 focus:ring-4 focus:ring-blue-100'}`}
                                                        />
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {isFirstOfGroup && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSplitItem(item)}
                                                                    title="แยกเบิกจากคลังอื่น"
                                                                    className="p-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(item.id)}
                                                                className="p-2 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer Action Card */}
                        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-sky-500" /> หมายเหตุการนำจ่าย (Remarks)
                                    </label>
                                    <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows="3" className="w-full border-2 border-slate-200 bg-white rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all" placeholder="ระบุสภาพสินค้าหรือข้อความฝากถึงผู้รับ..." />
                                </div>

                                <div className="p-8 rounded-[2.5rem] bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-8 border border-slate-200 shadow-sm">
                                    <div className="text-center md:text-left">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">สถานะความพร้อมข้อมูล</p>
                                        <div className="text-lg font-black tracking-tight flex items-center gap-2">
                                            {canSubmit ? (
                                                <><CheckCircle2 className="w-5 h-5 text-emerald-600" /> <span className="text-emerald-600">พร้อมตัดสต๊อก</span></>
                                            ) : (
                                                <div className="flex items-center gap-2 whitespace-nowrap">
                                                    <Clock className="w-4 h-4 text-amber-500" />
                                                    <span className="text-amber-600 text-sm font-bold uppercase tracking-tight">
                                                        กรุณาระบุข้อมูลให้ครบ
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!canSubmit || isSubmitting}
                                        className="w-full md:w-auto bg-[#1e3b8a] hover:bg-blue-800 text-white px-10 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/20 disabled:opacity-30 disabled:scale-100 active:scale-95 transition-all flex items-center justify-center gap-3"
                                    >
                                        {isSubmitting ? "กำลังประมวลผล..." : "ยืนยันการนำจ่าย"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </AuthGate>
    );
}