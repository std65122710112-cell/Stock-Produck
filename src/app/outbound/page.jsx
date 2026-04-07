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
    MapPinned, FileText, Plus, Calendar // 💡 นำเข้า Plus icon สำหรับปุ่มแบ่งเบิก
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
                message: "คุณต้องการลบพัสดุนี้ออกจากรายการนำจ่ายใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้",
                type: "danger",
                onConfirm: () => {
                    setItems(items.filter(it => it.id !== id));
                    setModal({ ...modal, isOpen: false });
                    toast.success("ลบรายการสำเร็จ");
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
                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 md:p-10 overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">

                        {/* 💡 เพิ่ม mx-auto เพื่อให้กล่องไอคอนอยู่กึ่งกลาง */}
                        <div className={`mx-auto w-20 h-20 rounded-[1.5rem] flex items-center justify-center mb-6 ${modal.type === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-[#1F3B8B]'}`}>
                            {modal.type === 'danger' ? <AlertTriangle className="w-10 h-10" /> : <ShieldCheck className="w-10 h-10" />}
                        </div>

                        {/* 💡 เพิ่ม text-center เพื่อให้หัวข้อและรายละเอียดอยู่กึ่งกลาง */}
                        <div className="text-center mb-10">
                            <h3 className="text-2xl font-black text-slate-950 mb-3 uppercase tracking-tight">
                                {modal.title}
                            </h3>
                            <p className="text-slate-500 font-medium leading-relaxed px-2">
                                {modal.message}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setModal({ ...modal, isOpen: false })}
                                className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all active:scale-95"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={modal.onConfirm}
                                className={`flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 ${modal.type === 'danger'
                                        ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                                        : 'bg-[#1e3b8a] hover:bg-[#1a3673] shadow-blue-200'
                                    }`}
                            >
                                ยืนยัน
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ปรับแก้ max-w จาก 6xl เป็น 1600px เพื่อให้กว้างขึ้นตามคอนเซปต์ Pro Dashboard */}
            <div className="max-w-[1600px] mx-auto space-y-8 py-8 px-4 md:px-8 animate-in fade-in duration-500">

                {/* HEADER SECTION */}
                <div className="w-full pt-10 mb-6 print:hidden">
                    <div className="w-full px-6 md:px-10 flex flex-col gap-6">

                        {/* 💡 แถวบน: ปุ่มย้อนกลับ (ย้ายมาไว้บนซ้ายตามคอนเซปต์ แสดงเฉพาะโหมด FORM) */}
                        {viewMode === 'FORM' && (
                            <div>
                                <button
                                    onClick={() => setViewMode('LIST')}
                                    className="group flex items-center gap-3 bg-white border-2 border-slate-200 text-slate-600 px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm w-fit"
                                >
                                    <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-[#1F3B8B] transition-colors" />
                                    ย้อนกลับ
                                </button>
                            </div>
                        )}

                        {/* แถวล่าง: ส่วนเนื้อหา Header (Icon & Title) */}
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
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
                        </div>
                    </div>
                </div>

                {/* --- LIST VIEW --- */}
                {viewMode === 'LIST' && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
                        <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-sm font-black text-slate-950 tracking-wide flex items-center gap-3">
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
                    <form onSubmit={handleSubmit} className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">

                            {/* 1. Header Section (White Theme / Black Labels / Green Data) */}
                            <div className="bg-white p-8 md:p-10 relative overflow-hidden border-b border-slate-100">
                                {/* ไอคอนพื้นหลังจางๆ เพื่อความสวยงาม */}
                                <div className="absolute right-0 bottom-0 opacity-40 pointer-events-none">
                                    <Truck className="w-64 h-64 text-slate-50" />
                                </div>

                                <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-12 items-center">
                                    <div>
                                        {/* หัวข้อเป็นสีดำ (Black Label) */}
                                        <p className="text-xs font-black text-black uppercase tracking-widest mb-2">เลขที่ใบนำจ่าย (Delivery Order)</p>
                                        {/* ข้อมูลเป็นสีเขียว (Green Data) */}
                                        <p className="tabular-nums font-black text-3xl md:text-4xl tracking-tight text-emerald-600">{doNo}</p>
                                    </div>

                                    {/* เส้นแบ่งระหว่างข้อมูล */}
                                    <div className="hidden md:block w-px h-12 bg-slate-200"></div>

                                    <div className="flex-1 text-center md:text-left">
                                        {/* หัวข้อเป็นสีดำ (Black Label) */}
                                        <p className="text-xs font-black text-black uppercase tracking-widest mb-2">อ้างอิงใบเบิก (SR Ref.)</p>
                                        {/* ข้อมูลเป็นสีเขียว (Green Data) */}
                                        <p className="tabular-nums font-black text-xl md:text-2xl tracking-tight text-emerald-600">{selectedSR.srNumber}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 md:p-10 space-y-10">

                                {/* 2. SR Details Section - ปรับปรุงหัวข้อให้ใหญ่และเข้มชัดเจน */}
                                <section className="px-8 md:px-10 py-10 bg-slate-50/50 flex flex-col gap-8 border-b-2 border-slate-100">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <h2 className="text-xl md:text-2xl font-black text-black uppercase tracking-tight flex items-center gap-4">
                                            <div className="p-2.5 bg-white rounded-2xl shadow-md border border-slate-200">
                                                <FileText className="w-7 h-7 text-indigo-600" />
                                            </div>
                                            ข้อมูลพื้นฐานจากใบเบิกต้นทาง (Requisition Details)
                                        </h2>
                                        <div className="flex items-center gap-2 bg-white px-5 py-2.5 rounded-2xl border-2 border-slate-200 shadow-sm">
                                            <Calendar className="w-5 h-5 text-orange-500" />
                                            <span className="text-xs font-black text-slate-600 uppercase tracking-widest tabular-nums">
                                                วันที่ขอเบิก: {new Date(selectedSR.createdAt).toLocaleDateString('th-TH')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* แถวบน: ข้อมูลบุคคลและแผนก */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {/* ผู้ขอเบิก */}
                                        <div className="bg-white p-7 rounded-[2rem] border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="p-2.5 bg-blue-50 rounded-xl">
                                                    <User className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <p className="text-xs font-black text-slate-600 uppercase tracking-widest">ผู้ขอเบิกพัสดุ</p>
                                            </div>
                                            <p className="text-lg font-black text-black ml-1">{selectedSR.user?.firstName} {selectedSR.user?.lastName}</p>
                                        </div>

                                        {/* ผู้อนุมัติ */}
                                        <div className="bg-white p-7 rounded-[2rem] border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="p-2.5 bg-emerald-50 rounded-xl">
                                                    <ShieldCheck className="w-6 h-6 text-emerald-600" />
                                                </div>
                                                <p className="text-xs font-black text-slate-600 uppercase tracking-widest">ผู้อนุมัติเบิก</p>
                                            </div>
                                            <p className="text-lg font-black text-emerald-800 ml-1">{selectedSR.approver?.firstName} {selectedSR.approver?.lastName}</p>
                                        </div>

                                        {/* แผนก */}
                                        <div className="bg-white p-7 rounded-[2rem] border-2 border-slate-200 shadow-sm hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="p-2.5 bg-fuchsia-50 rounded-xl">
                                                    <Building2 className="w-6 h-6 text-fuchsia-600" />
                                                </div>
                                                <p className="text-xs font-black text-slate-600 uppercase tracking-widest">แผนกที่เบิก</p>
                                            </div>
                                            <p className="text-lg font-black text-black ml-1">{selectedSR.department?.name || 'ส่วนกลาง (General)'}</p>
                                        </div>
                                    </div>

                                    {/* แถวล่าง: วัตถุประสงค์และหมายเหตุ */}
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        {/* วัตถุประสงค์ */}
                                        <div className="lg:col-span-7 bg-white p-7 rounded-[2rem] border-2 border-slate-200 shadow-sm">
                                            <div className="flex justify-between items-center mb-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 bg-sky-50 rounded-xl">
                                                        <Layers className="w-6 h-6 text-sky-600" />
                                                    </div>
                                                    <p className="text-xs font-black text-slate-600 uppercase tracking-widest">วัตถุประสงค์ / โครงการ</p>
                                                </div>
                                                {selectedSR.referenceNo && (
                                                    <div className="flex items-center gap-2 bg-indigo-50 px-4 py-1.5 rounded-xl border-2 border-indigo-100">
                                                        <Hash className="w-3.5 h-3.5 text-indigo-600" />
                                                        <span className="text-xs font-black text-indigo-700 uppercase">Ref: {selectedSR.referenceNo}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-base font-bold text-slate-800 leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                                {selectedSR.purpose || 'ไม่ได้ระบุวัตถุประสงค์'}
                                            </p>
                                        </div>

                                        {/* หมายเหตุ */}
                                        <div className="lg:col-span-5 flex flex-col h-full">
                                            {selectedSR.remarks ? (
                                                <div className="bg-amber-50 p-7 rounded-[2rem] border-2 border-amber-200 h-full flex flex-col gap-4 shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                                            <MessageSquare className="w-5 h-5 text-amber-500" />
                                                        </div>
                                                        <p className="text-xs font-black text-amber-700 uppercase tracking-widest">หมายเหตุจากผู้เบิก (SR Note)</p>
                                                    </div>
                                                    <p className="text-sm font-bold text-amber-950/90 leading-relaxed italic px-1">
                                                        "{selectedSR.remarks}"
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="bg-white p-7 rounded-[2rem] border-2 border-dashed border-slate-300 h-full flex items-center justify-center">
                                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">ไม่มีหมายเหตุเพิ่มเติม</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                {/* 3. Items Table Section - ปรับปรุงใหม่ให้โมเดิร์นและใช้งานง่าย */}
                                <section className="space-y-6">
                                    <h2 className="text-xl md:text-2xl font-black text-black uppercase tracking-tight flex items-center gap-4 border-b-2 border-slate-100 pb-6">
                                        <div className="p-2.5 bg-white rounded-2xl shadow-md border border-slate-200">
                                            <ClipboardCheck className="w-7 h-7 text-blue-600" />
                                        </div>
                                        รายการพัสดุที่ต้องจัดเตรียมและนำจ่าย
                                    </h2>

                                    <div className="overflow-x-auto rounded-[2.5rem] border-2 border-slate-200 bg-slate-100/30 p-3 md:p-4">
                                        <table className="w-full text-left border-separate border-spacing-y-3 min-w-[900px]">
                                            <thead>
                                                <tr className="text-sm font-black text-black uppercase tracking-widest">
                                                    <th className="px-6 py-2">รายการพัสดุ / SKU</th>
                                                    <th className="px-6 py-2 text-center">ยอดเบิกรวม</th>
                                                    <th className="px-6 py-2 w-[35%]">หยิบจากคลัง/โซน (Location) <span className="text-red-600">*</span></th>
                                                    <th className="px-6 py-2 text-center w-40">จำนวนที่จ่าย <span className="text-red-600">*</span></th>
                                                    <th className="px-6 py-2 text-center w-32">จัดการ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((item, idx) => {
                                                    const locs = getAvailableLocations(item.productId);
                                                    const stock = getAvailableStock(item.productId, item.locationId);
                                                    const isOverStock = item.quantity > stock;
                                                    const currentTotalPicked = items.filter(it => it.originalId === item.originalId).reduce((sum, it) => sum + Number(it.quantity || 0), 0);
                                                    const isOverRequired = currentTotalPicked > item.requiredQty;
                                                    const isFullyPicked = currentTotalPicked === item.requiredQty;
                                                    const isFirstOfGroup = items.findIndex(it => it.originalId === item.originalId) === idx;

                                                    return (
                                                        <tr key={item.id} className="bg-white shadow-sm group hover:shadow-md transition-all">
                                                            <td className="px-6 py-5 rounded-l-[1.5rem] border-y-2 border-l-2 border-transparent group-hover:border-slate-200">
                                                                {isFirstOfGroup ? (
                                                                    <div className="flex flex-col">
                                                                        <p className="font-black text-black text-base uppercase tracking-tight">
                                                                            <span className="text-slate-400 mr-2 tabular-nums">#{item.sku}</span>
                                                                            {item.productName}
                                                                        </p>
                                                                        {item.remark && (
                                                                            <p className="text-[11px] text-amber-600 font-bold mt-2 flex items-center gap-1.5 italic bg-amber-50 w-fit px-2 py-0.5 rounded-md border border-amber-100">
                                                                                <Info className="w-3.5 h-3.5" /> หมายเหตุ: {item.remark}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 pl-6 text-slate-400">
                                                                        <div className="w-4 h-4 border-l-2 border-b-2 border-slate-200 rounded-bl-lg mb-1"></div>
                                                                        <span className="text-xs font-black uppercase italic tracking-wider">แบ่งเบิกเพิ่ม</span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-5 text-center border-y-2 border-transparent group-hover:border-slate-200">
                                                                {isFirstOfGroup ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <span className="font-black text-black text-2xl tracking-tighter tabular-nums leading-none">{item.requiredQty}</span>
                                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full mt-2 border tabular-nums shadow-sm
                                            ${isFullyPicked ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : (isOverRequired ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-amber-50 text-amber-600 border-amber-200')}`}>
                                                                            รวม: {currentTotalPicked}/{item.requiredQty}
                                                                        </span>
                                                                    </div>
                                                                ) : <span className="text-slate-300 font-bold">-</span>}
                                                            </td>
                                                            <td className="px-6 py-5 border-y-2 border-transparent group-hover:border-slate-200">
                                                                <select
                                                                    required
                                                                    value={item.locationId}
                                                                    onChange={e => updateItem(item.id, "locationId", e.target.value)}
                                                                    className={`w-full border-2 rounded-xl px-3 py-3 text-xs font-black outline-none transition-all cursor-pointer shadow-sm
                                        ${item.locationId ? 'border-slate-400 text-black bg-white' : 'border-slate-200 text-slate-400 bg-white hover:border-slate-300'}`}
                                                                >
                                                                    <option value="">-- เลือกตำแหน่งเพื่อหยิบสินค้า --</option>
                                                                    {locs.map(l => (
                                                                        <option key={l.locationId} value={l.locationId}>
                                                                            {l.location.warehouse?.name} | จุดเก็บ: {l.location.name || l.location.code} (สต๊อก: {l.quantity})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="px-6 py-5 border-y-2 border-transparent group-hover:border-slate-200">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.quantity === 0 ? '' : item.quantity}
                                                                    onChange={e => updateItem(item.id, "quantity", e.target.value)}
                                                                    className={`w-28 mx-auto block border-2 rounded-xl py-3 text-center tabular-nums font-black text-xl outline-none transition-all shadow-inner
                                        ${(isOverStock || isOverRequired)
                                                                            ? 'border-rose-500 bg-rose-50 text-rose-600 ring-4 ring-rose-100'
                                                                            : 'border-blue-500 bg-blue-50 text-blue-950 focus:ring-4 focus:ring-blue-100'}`}
                                                                />
                                                            </td>
                                                            <td className="px-6 py-5 rounded-r-[1.5rem] border-y-2 border-r-2 border-transparent group-hover:border-slate-200 text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    {isFirstOfGroup && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSplitItem(item)}
                                                                            title="แยกเบิกจากคลังอื่น"
                                                                            className="p-2.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm active:scale-90"
                                                                        >
                                                                            <Plus className="w-5 h-5" />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeItem(item.id)}
                                                                        title="ลบรายการนี้"
                                                                        className="p-2.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-xl hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-sm active:scale-90"
                                                                    >
                                                                        <Trash2 className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                {/* 4. Footer Section - ปรับขนาดให้กะทัดรัด ไม่ใหญ่จนเกินไป */}
                                <section className="p-6 md:p-8 bg-slate-50/50 rounded-[2rem] border-2 border-slate-200 mt-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

                                        {/* --- ฝั่งซ้าย: หมายเหตุ (Remarks) --- */}
                                        <div className="flex flex-col gap-3">
                                            <label className="text-[13px] font-black text-black uppercase tracking-widest ml-1 flex items-center gap-2.5">
                                                <MessageSquare className="w-4 h-4 text-sky-500" /> หมายเหตุการนำจ่าย (Remarks)
                                            </label>
                                            <textarea
                                                value={remarks}
                                                onChange={(e) => setRemarks(e.target.value)}
                                                rows="3"
                                                className="w-full flex-1 border-2 border-slate-200 bg-white rounded-xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-[#1F3B8B] transition-all resize-none shadow-sm placeholder:text-slate-300"
                                                placeholder="ระบุสภาพสินค้าหรือข้อความฝากถึงผู้รับ..."
                                            />
                                        </div>

                                        {/* --- ฝั่งขวา: สถานะความพร้อมและปุ่มยืนยัน (จัดเรียงแนวนอนตามรูป) --- */}
                                        <div className="p-6 md:p-8 rounded-[2rem] bg-white border-2 border-slate-200 shadow-lg flex flex-col md:flex-row justify-between items-center gap-8">

                                            {/* ส่วนสถานะ (ด้านซ้ายในกล่อง) */}
                                            <div className="text-center md:text-left">
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">สถานะความพร้อมข้อมูล</p>
                                                <div className="text-lg font-black tracking-tight flex items-center justify-center md:justify-start gap-2.5">
                                                    {canSubmit ? (
                                                        <>
                                                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                                            <span className="text-emerald-600 uppercase">พร้อมตัดสต๊อก</span>
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center gap-2.5">
                                                            <Clock className="w-5 h-5 text-amber-500" />
                                                            <span className="text-amber-600 uppercase text-sm">กรุณาระบุข้อมูลให้ครบ</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={!canSubmit || isSubmitting}
                                                className="w-full md:w-auto min-w-[200px] bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-green-900/20 transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                        ยืนยันการนำจ่าย
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </form>
                )}
            </div>
        </AuthGate>
    );
}