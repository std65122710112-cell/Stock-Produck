"use client";

import AuthGate from "@/components/AuthGate";
import { apiFetch } from "@/lib/api";
import { useEffect, useState, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
    Truck,
    ClipboardCheck,
    Database,
    ArrowLeft,
    Package,
    MapPin,
    User,
    Hash,
    CheckCircle2,
    Trash2,
    Layers,
    ShieldCheck,
    UserCheck,
    Clock
} from "lucide-react";

export default function ProfessionalOutboundPage() {
    const [viewMode, setViewMode] = useState('LIST');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [allSRs, setAllSRs] = useState([]); // รวมทุกสถานะ
    const [stockBalances, setStockBalances] = useState([]);

    const [selectedSR, setSelectedSR] = useState(null);
    const [doNo, setDoNo] = useState("");
    const [remarks, setRemarks] = useState("");
    const [items, setItems] = useState([]);

    // 💡 ฟังก์ชันโหลดข้อมูล (ปรับให้ดึงทั้ง APPROVED และ COMPLETED)
    const loadData = async () => {
        setIsLoading(true);
        try {
            const [srRes, balRes] = await Promise.all([
                apiFetch("/outbound/requisitions").catch(() => []), // ดึงทั้งหมด
                apiFetch("/inventory/balances").catch(() => [])
            ]);

            // กรองเอาเฉพาะรายการที่ อนุมัติแล้ว หรือ จ่ายของเสร็จแล้ว เท่านั้น
            const filtered = (Array.isArray(srRes) ? srRes : []).filter(
                r => r.status === 'APPROVED' || r.status === 'COMPLETED'
            );

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
            originalId: it.id,
            productId: it.productId,
            productName: it.product?.name,
            sku: it.product?.sku,
            requiredQty: Number(it.quantity),
            quantity: Number(it.quantity),
            locationId: "",
            remark: it.remark
        }));

        setItems(mappedItems);
        setViewMode('FORM');
    };

    const getAvailableLocations = (productId) => stockBalances.filter(b => b.productId === productId && b.quantity > 0);
    const getAvailableStock = (productId, locationId) => {
        const balance = stockBalances.find(b => b.productId === productId && b.locationId === locationId);
        return balance ? balance.quantity : 0;
    };
    const updateItem = (id, field, value) => setItems(prev => prev.map(it => it.id === id ? { ...it, [field]: value } : it));
    const handleSplitItem = (itemIndex, item) => {
        const newItems = [...items];
        newItems.splice(itemIndex + 1, 0, { ...item, id: Date.now() + Math.random(), quantity: 0, locationId: "" });
        setItems(newItems);
    };
    const removeItem = (id) => items.length > 1 && setItems(items.filter(it => it.id !== id));
    const checkIsOverRequired = (originalId, requiredQty) => {
        const sumInputQty = items.filter(it => it.originalId === originalId).reduce((sum, it) => sum + Number(it.quantity || 0), 0);
        return sumInputQty > requiredQty;
    };

    const canSubmit = useMemo(() => {
        return doNo.trim() !== "" && items.every(it => {
            return it.locationId !== "" && it.quantity > 0 && it.quantity <= getAvailableStock(it.productId, it.locationId) && !checkIsOverRequired(it.originalId, it.requiredQty);
        }) && !isSubmitting;
    }, [doNo, items, isSubmitting, stockBalances]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!confirm("⚠️ ยืนยันการตัดสต๊อกจริง? ยอดคงเหลือจะลดลงทันที")) return;

        setIsSubmitting(true);
        const tid = toast.loading("กำลังบันทึกข้อมูล...");

        try {
            await apiFetch("/outbound/delivery-orders", {
                method: "POST",
                body: JSON.stringify({
                    doNo: doNo.trim(),
                    srId: selectedSR.id, // 💡 ส่ง ID ใบเบิกไปผูกความสัมพันธ์
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
            loadData(); // โหลดใหม่เพื่อให้รายการอัปเดตเป็น 'เบิกจ่ายแล้ว'
        } catch (err) {
            toast.error(err.message, { id: tid });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <AuthGate>
            <Toaster position="top-right" />
            <div className="max-w-6xl mx-auto space-y-8 pb-10 px-4 md:px-0 pt-6">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-6 gap-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500">TJC LOGISTICS TERMINAL</p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                            {viewMode === 'LIST' ? "คิวเบิกและประวัติการนำจ่าย" : "จัดของนำจ่ายพัสดุ"}
                        </h1>
                    </div>
                    {viewMode === 'FORM' && (
                        <button onClick={() => setViewMode('LIST')} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">
                            <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
                        </button>
                    )}
                </div>

                {/* --- LIST VIEW --- */}
                {viewMode === 'LIST' && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-900 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                    <tr>
                                        <th className="p-6">เลขที่ใบเบิก</th>
                                        <th className="p-6">ผู้ขอเบิก / แผนก</th>
                                        <th className="p-6 text-center">ผู้อนุมัติเบิก</th>
                                        <th className="p-6 text-center">สถานะ</th>
                                        <th className="p-6 text-right">ดำเนินการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {isLoading ? (
                                        <tr><td colSpan="5" className="p-24 text-center text-slate-300 font-black uppercase animate-pulse">กำลังโหลดข้อมูล...</td></tr>
                                    ) : allSRs.length === 0 ? (
                                        <tr><td colSpan="5" className="p-32 text-center text-slate-400 font-bold uppercase italic">ไม่มีรายการในระบบ</td></tr>
                                    ) : allSRs.map(sr => (
                                        <tr key={sr.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-6 font-mono font-black text-lg tracking-tighter">
                                                <span className={sr.status === 'COMPLETED' ? 'text-slate-300' : 'text-indigo-600'}>{sr.srNumber}</span>
                                            </td>
                                            <td className="p-6 uppercase">
                                                <p className={`font-black text-xs ${sr.status === 'COMPLETED' ? 'text-slate-400' : 'text-slate-800'}`}>{sr.user?.firstName} {sr.user?.lastName}</p>
                                                <p className="text-[10px] font-bold text-slate-400">{sr.department?.name}</p>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                                                    <UserCheck className="w-3 h-3 text-slate-400" />
                                                    <span className="text-[10px] font-black text-slate-600 uppercase">{sr.approver?.firstName || "Verified"}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                {sr.status === 'COMPLETED' ? (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[10px] px-3 py-1 rounded-full font-black border border-emerald-100">
                                                        <CheckCircle2 className="w-3 h-3" /> เบิกจ่ายแล้ว
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 text-[10px] px-3 py-1 rounded-full font-black border border-amber-100">
                                                        <Clock className="w-3 h-3" /> รอการนำจ่าย
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-6 text-right">
                                                {sr.status === 'COMPLETED' ? (
                                                    <span className="text-[10px] font-black text-slate-300 uppercase italic pr-4 underline decoration-emerald-300">Success ✓</span>
                                                ) : (
                                                    <button onClick={() => handleSelectSR(sr)} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-sm">
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
                    <form onSubmit={handleSubmit} className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-xl grid grid-cols-1 md:grid-cols-4 gap-12">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">เลขที่ใบนำจ่าย</p>
                                <p className="font-mono font-black text-2xl text-indigo-400">{doNo}</p>
                            </div>
                            <div className="border-l border-white/10 pl-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">ผู้ขอเบิก</p>
                                <p className="font-black text-sm uppercase">{selectedSR.user?.firstName} {selectedSR.user?.lastName}</p>
                            </div>
                            <div className="border-l border-white/10 pl-10">
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 italic">ผู้อนุมัติเบิก</p>
                                <p className="font-black text-sm uppercase text-emerald-400">{selectedSR.approver?.firstName} {selectedSR.approver?.lastName}</p>
                            </div>
                            <div className="border-l border-white/10 pl-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">จุดส่งมอบ</p>
                                <p className="font-black text-sm uppercase truncate text-slate-300">{selectedSR.deliveryLocation || "คลังสินค้า"}</p>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                                    <tr>
                                        <th className="p-6 w-1/3">รายการสินค้า</th>
                                        <th className="p-6 text-center w-24">เบิก (SR)</th>
                                        <th className="p-6">หยิบจากตำแหน่ง *</th>
                                        <th className="p-6 text-center w-40 text-indigo-600">จำนวนที่จ่ายจริง *</th>
                                        <th className="p-6 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.map((item, idx) => {
                                        const locs = getAvailableLocations(item.productId);
                                        const stock = getAvailableStock(item.productId, item.locationId);
                                        const isOverStock = item.quantity > stock;
                                        const isOverRequired = checkIsOverRequired(item.originalId, item.requiredQty);
                                        return (
                                            <tr key={item.id}>
                                                <td className="p-6">
                                                    <p className="font-black text-slate-800 uppercase text-xs">[{item.sku}] {item.productName}</p>
                                                    {item.remark && <p className="text-[9px] text-amber-600 font-bold mt-1 italic">Note: {item.remark}</p>}
                                                </td>
                                                <td className="p-6 text-center font-mono font-black text-slate-300 text-lg">{item.requiredQty}</td>
                                                <td className="p-6">
                                                    <select required value={item.locationId} onChange={e => updateItem(item.id, "locationId", e.target.value)} className="w-full border-2 border-slate-100 rounded-xl p-3 text-[11px] font-black uppercase outline-none focus:border-indigo-400">
                                                        <option value="">-- เลือกตำแหน่ง --</option>
                                                        {locs.map(l => (
                                                            <option key={l.locationId} value={l.locationId}>🏢 {l.location.warehouse.code} | {l.location.code} (คงเหลือ: {l.quantity})</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-6">
                                                    <input type="number" min="1" value={item.quantity === 0 ? '' : item.quantity} onChange={e => updateItem(item.id, "quantity", e.target.value)} className={`w-full border-2 rounded-2xl py-3 text-center font-mono font-black text-xl outline-none ${(isOverStock || isOverRequired) ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-indigo-600 bg-slate-900 text-white'}`} />
                                                </td>
                                                <td className="p-6 text-center">
                                                    <button type="button" onClick={() => removeItem(item.id)} className="p-2 text-slate-200 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl flex justify-between items-center sticky bottom-6 border border-white/5">
                            <div className="px-6 border-l-4 border-indigo-500 text-white">
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Authorization Status</p>
                                <p className="text-xl font-black tracking-tight">{canSubmit ? "✓ ข้อมูลพร้อมตัดสต๊อก" : "กรุณาระบุจำนวนและตำแหน่ง"}</p>
                            </div>
                            <button type="submit" disabled={!canSubmit || isSubmitting} className="bg-indigo-600 hover:bg-emerald-600 text-white px-12 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/50 disabled:opacity-30 transition-all flex items-center gap-3">
                                {isSubmitting ? "กำลังประมวลผล..." : "ยืนยันการจ่ายพัสดุ ✓"}
                            </button>
                        </div>
                    </form>
                )}

                {/* FOOTER */}
                <div className="text-center opacity-30 italic">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">TJC GROUP LOGISTICS • SECURE TERMINAL</p>
                </div>
            </div>
        </AuthGate>
    );
}