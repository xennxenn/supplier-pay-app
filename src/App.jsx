import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Database, 
  PlusCircle, 
  CheckSquare, 
  Printer,
  Calculator,
  History,
  Trash2,
  Save,
  Edit2,
  Eye,
  X,
  Search,
  Upload,
  List,
  Filter,
  LogOut,
  User,
  Lock,
  Loader2,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyC6brJhM9IQzt7ZmrfR7EfWypxulP_U088",
  authDomain: "supplier-pay-app.firebaseapp.com",
  projectId: "supplier-pay-app",
  storageBucket: "supplier-pay-app.firebasestorage.app",
  messagingSenderId: "431577977513",
  appId: "1:431577977513:web:69eaac1dd76ffefdb34fb8",
  measurementId: "G-K7V66T041C"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const firestoreDb = getFirestore(firebaseApp);
const appId = 'supplier-pay-app-v1';

// --- MOCK DATABASE (Initial State / Fallback) ---
const initialDB = {
  rates: {
    highLadder: 750,
    scaffoldCurtain: 1500,
    scaffoldWall: 2500,
    motorInstall: 1500,
    curtainBase: 1500, 
    curtainPerRailExceed: 120
  },
  settings: {
    transferDayRule: "ทุกวันพฤหัสบดี"
  },
  provinces: [
    { name: 'กรุงเทพมหานคร', travelCost: 500 },
    { name: 'นนทบุรี', travelCost: 600 },
    { name: 'ปทุมธานี', travelCost: 700 },
    { name: 'สมุทรปราการ', travelCost: 600 },
  ],
  technicians: [
    { id: 'T01', name: 'นายสรวิชญ์ สมานคำ', bank: 'กสิกรไทย', branch: 'สำนักราษฎร์บูรณะ', accNo: '745-2-34964-1' },
    { id: 'T02', name: 'นายสมเกียรติ ติดตั้งไว', bank: 'ไทยพาณิชย์', branch: 'บางกะปิ', accNo: '987-6-54321-0' },
  ],
  admins: [
    { id: 'A01', name: 'จิตรานุช ทองชมภู' },
    { id: 'A02', name: 'สมหญิง ผู้จัดการ' },
  ],
  approvers: [
    { id: 'AP1', name: 'คุณรติยา จันทรเทียร' },
    { id: 'AP2', name: 'ผู้บริหารระดับสูง' }
  ],
  operations: [
    { id: 'OP1', name: 'Curtain Center', sales: ["ณัฐกฤตา (พู่กัน)", "ฐิติญา (ออย)", "ณาตฎีกา (ณาฏ)", "ธัญญ์ชยา (ตูน)", "จารุพร (อาย)"] },
    { id: 'OP2', name: 'Shop&Outlet', sales: ['เซลล์ A', 'เซลล์ B'] },
    { id: 'OP3', name: 'B2B', sales: ['เซลล์ C'] },
    { id: 'OP4', name: 'Paragon', sales: ['เซลล์ D'] },
  ],
  jobTypes: [
    { id: 'J1', name: 'งานติดตั้งผ้าม่าน', category: 'curtain' },
    { id: 'J2', name: 'งานแก้ไขผ้าม่าน', category: 'curtain' },
    { id: 'J3', name: 'งานติดตั้งวอล', category: 'wallpaper' },
    { id: 'J4', name: 'งานแก้ไขวอล', category: 'wallpaper' },
  ],
  users: [
    { id: 'U1', username: 'Admin', name: 'ผู้ดูแลระบบ', password: '1234' }
  ]
};

// --- HELPER FUNCTIONS ---
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
};

const formatDateThai = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' });
};

const getNextThursdayDate = (baseDateStr) => {
  const d = new Date(baseDateStr);
  const currentDay = d.getDay() === 0 ? 7 : d.getDay(); 
  const daysToNextMon = 8 - currentDay; 
  d.setDate(d.getDate() + daysToNextMon + 3); 
  return d.toLocaleDateString('en-GB');
};

const getThaiBahtText = (amount) => {
  const number = Number(amount).toFixed(2);
  const parts = number.toString().split('.');
  const baht = parts[0];
  const satang = parts[1];
  if (number === '0.00') return { text: 'ศูนย์บาท', satang: 'ถ้วน' };
  
  const numbers = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];
  
  const readNumber = (numStr) => {
    let text = '';
    for (let i = 0; i < numStr.length; i++) {
      const digit = parseInt(numStr.charAt(i));
      const pos = numStr.length - i - 1;
      if (digit !== 0) {
        if (pos === 0 && digit === 1 && numStr.length > 1 && numStr.charAt(i-1) !== '0') text += 'เอ็ด';
        else if (pos === 1 && digit === 1) text += 'สิบ';
        else if (pos === 1 && digit === 2) text += 'ยี่สิบ';
        else text += numbers[digit] + positions[pos];
      }
    }
    return text || 'ศูนย์';
  };

  let bahtText = readNumber(baht) + 'บาท';
  let satangText = satang === '00' ? 'ถ้วน' : readNumber(satang);
  return { baht: bahtText, satang: satangText };
};

// --- UI COMPONENTS ---
const DialogModal = ({ dialog, onClose }) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setInputValue('');
  }, [dialog]);

  if (!dialog) return null;

  const isPrompt = dialog.type === 'prompt';
  const isDisabled = isPrompt && inputValue !== dialog.expectedInput;

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full transform transition-all">
        <div className="flex items-start mb-4">
          <div className={`p-2 rounded-full mr-3 flex-shrink-0 ${dialog.type === 'alert' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
            {dialog.type === 'alert' ? <AlertCircle size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div className="flex-1 pt-1">
            <p className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">{dialog.message}</p>
            {isPrompt && (
              <input 
                type="text" 
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={`พิมพ์ "${dialog.expectedInput}"`}
                className="mt-4 w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-center font-mono"
              />
            )}
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          {(dialog.type === 'confirm' || isPrompt) && (
            <button onClick={onClose} className="px-4 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors">
              ยกเลิก
            </button>
          )}
          <button 
            disabled={isDisabled}
            onClick={() => { if(dialog.onConfirm) dialog.onConfirm(); onClose(); }} 
            className={`px-6 py-2.5 font-semibold rounded-xl transition-all shadow-sm ${
              isDisabled 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                : dialog.type === 'alert' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );
};

// --- FEATURE COMPONENTS ---

// 1. Data Entry Form
const DataEntry = ({ db, records, onSave, onUpdate, editingRecord, onCancelEdit, showAlert, showConfirm }) => {
  const defaultEmptyForm = {
    date: new Date().toISOString().split('T')[0],
    technicianId: db.technicians[0]?.id || '',
    jobTypeId: db.jobTypes[0]?.id || '',
    orderNo: '',
    customerName: '',
    province: db.provinces[0]?.name || '',
    operationId: db.operations[0]?.id || '',
    salesperson: db.operations[0]?.sales[0] || '',
    quantity: 0,
    manualPricePerSqM: 0,
    ladderQty: 0,
    scaffoldQty: 0,
    motorQty: 0,
    otherExpense: 0 
  };

  const [formData, setFormData] = useState(defaultEmptyForm);

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        ...editingRecord,
        otherExpense: editingRecord.otherExpense || (editingRecord.calculated?.otherCost || 0)
      });
    } else {
      setFormData(defaultEmptyForm);
    }
  }, [editingRecord, db]);

  const handleOpChange = (e) => {
    const opId = e.target.value;
    const op = db.operations.find(o => o.id === opId);
    setFormData({ ...formData, operationId: opId, salesperson: op.sales[0] || '' });
  };

  const handleJobChange = (e) => {
    setFormData({ ...formData, jobTypeId: e.target.value, quantity: 0, manualPricePerSqM: 0, motorQty: 0, scaffoldQty: 0, ladderQty: 0 });
  };

  const currentJobType = db.jobTypes.find(j => j.id === formData.jobTypeId);
  const isCurtain = currentJobType?.category === 'curtain';

  const travelCost = db.provinces.find(p => p.name === formData.province)?.travelCost || 0;
  const ladderCost = formData.ladderQty * db.rates.highLadder;
  const scaffoldCost = formData.scaffoldQty * (isCurtain ? db.rates.scaffoldCurtain : db.rates.scaffoldWall);
  const motorCost = formData.motorQty * db.rates.motorInstall;
  const otherCost = Number(formData.otherExpense) || 0;
  
  let installCost = 0;
  if (isCurtain) {
    const activeRails = formData.quantity; // คิดจากจำนวนรางเต็มๆ ไม่นำ motorQty มาหักลบแล้ว
    if (activeRails <= 10 && activeRails > 0) {
      installCost = db.rates.curtainBase;
    } else if (activeRails > 10) {
      installCost = db.rates.curtainBase + ((activeRails - 10) * db.rates.curtainPerRailExceed);
    }
  } else {
    installCost = formData.quantity * formData.manualPricePerSqM;
  }

  const grandTotal = travelCost + ladderCost + scaffoldCost + motorCost + installCost + otherCost;

  const executeSave = () => {
    const recordToSave = {
      ...formData,
      id: editingRecord ? editingRecord.id : 'REC' + Date.now(),
      jobTypeName: currentJobType?.name || '',
      operationName: db.operations.find(o => o.id === formData.operationId)?.name || '',
      technicianName: db.technicians.find(t => t.id === formData.technicianId)?.name || '',
      isCurtain,
      calculated: { travelCost, ladderCost, scaffoldCost, motorCost, installCost, otherCost, grandTotal },
      isClaimed: editingRecord ? editingRecord.isClaimed : false
    };

    if (editingRecord) {
      onUpdate(recordToSave);
      showAlert('อัปเดตข้อมูลสำเร็จ!');
    } else {
      onSave(recordToSave);
      showAlert('บันทึกข้อมูลสำเร็จ!');
      setFormData(defaultEmptyForm);
    }
  };

  const submitForm = (e) => {
    e.preventDefault();
    try {
      if (!formData.date) throw new Error("กรุณาระบุวันที่ทำงาน");
      if (!formData.technicianId) throw new Error("กรุณาเลือกทีมช่าง");
      if (!formData.orderNo || !formData.orderNo.trim()) throw new Error("กรุณากรอกเลขที่ Order");
      if (!formData.customerName || !formData.customerName.trim()) throw new Error("กรุณากรอกชื่อลูกค้า");

      if (formData.orderNo.trim() !== '' && !editingRecord) {
        const isDuplicate = records.some(r => r.orderNo === formData.orderNo && r.jobTypeId === formData.jobTypeId);
        if (isDuplicate) {
          showConfirm(`พบเลขที่ Order: ${formData.orderNo} ประเภทงานนี้ในระบบแล้ว!\nคุณต้องการบันทึกข้อมูลนี้ซ้ำหรือไม่?`, () => {
            executeSave();
          });
          return;
        }
      }
      executeSave();
    } catch (error) {
      showAlert(`ไม่สามารถบันทึกข้อมูลได้:\n${error.message}`);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 text-blue-600">
            {editingRecord ? <Edit2 size={24} /> : <PlusCircle size={24} />}
          </div>
          {editingRecord ? 'แก้ไขข้อมูลงานช่าง' : 'ฟอร์มบันทึกงานช่าง (Supplier)'}
        </h2>
      </div>
      
      <form onSubmit={submitForm} className="space-y-8">
        <div className="bg-slate-50 p-6 rounded-xl space-y-5">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">ข้อมูลพื้นฐาน</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">วันที่ทำงาน</label>
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full rounded-lg border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">ทีมช่างติดตั้ง</label>
              <select value={formData.technicianId} onChange={e => setFormData({...formData, technicianId: e.target.value})} className="w-full rounded-lg border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border transition-all bg-white">
                {db.technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">ประเภทงาน</label>
              <select value={formData.jobTypeId} onChange={handleJobChange} className="w-full rounded-lg border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border transition-all bg-white">
                {db.jobTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-xl space-y-5">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">รายละเอียดออเดอร์</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">เลขที่ Order <span className="text-red-500">*</span></label>
              <input type="text" value={formData.orderNo} onChange={e => setFormData({...formData, orderNo: e.target.value})} className="w-full rounded-lg border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border transition-all" placeholder="เช่น MTO2500819/1" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">ชื่อลูกค้า <span className="text-red-500">*</span></label>
              <input type="text" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full rounded-lg border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border transition-all" placeholder="เช่น คุณอนันญา" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">จังหวัดที่ติดตั้ง (ค่าเดินทาง)</label>
              <select value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} className="w-full rounded-lg border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border transition-all bg-white">
                <option value="">-- ไม่คิดค่าเดินทาง --</option>
                {db.provinces.map(p => <option key={p.name} value={p.name}>{p.name} (฿{p.travelCost})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Operation</label>
              <select value={formData.operationId} onChange={handleOpChange} className="w-full rounded-lg border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border transition-all bg-white">
                {db.operations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">พนักงานเซลล์</label>
              <select value={formData.salesperson} onChange={e => setFormData({...formData, salesperson: e.target.value})} className="w-full rounded-lg border-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border transition-all bg-white">
                {db.operations.find(o => o.id === formData.operationId)?.sales.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100 shadow-sm">
          <h3 className="text-lg font-bold text-blue-900 mb-5 flex items-center">
            <Calculator className="mr-2 w-5 h-5"/> ข้อมูลการคำนวณค่าใช้จ่าย
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">จำนวน ({isCurtain ? 'ราง' : 'ตร.ม'})</label>
              <input type="number" min="0" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} className="w-full rounded-lg border-slate-200 p-2.5 border focus:ring-blue-500" />
            </div>
            {!isCurtain && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">ราคาต่อ ตร.ม (บาท)</label>
                <input type="number" min="0" value={formData.manualPricePerSqM} onChange={e => setFormData({...formData, manualPricePerSqM: Number(e.target.value)})} className="w-full rounded-lg border-slate-200 p-2.5 border focus:ring-blue-500" />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">บันไดสูง ({db.rates.highLadder}/จุด)</label>
              <input type="number" min="0" value={formData.ladderQty} onChange={e => setFormData({...formData, ladderQty: Number(e.target.value)})} className="w-full rounded-lg border-slate-200 p-2.5 border focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">นั่งร้าน ({isCurtain ? db.rates.scaffoldCurtain : db.rates.scaffoldWall}/จุด)</label>
              <input type="number" min="0" value={formData.scaffoldQty} onChange={e => setFormData({...formData, scaffoldQty: Number(e.target.value)})} className="w-full rounded-lg border-slate-200 p-2.5 border focus:ring-blue-500" />
            </div>
            {isCurtain && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">มอเตอร์ ({db.rates.motorInstall}/จุด)</label>
                <input type="number" min="0" value={formData.motorQty} onChange={e => setFormData({...formData, motorQty: Number(e.target.value)})} className="w-full rounded-lg border-slate-200 p-2.5 border focus:ring-blue-500" />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">ค่าใช้จ่ายอื่นๆ (บวก/ลบ)</label>
              <input type="number" value={formData.otherExpense} onChange={e => setFormData({...formData, otherExpense: Number(e.target.value)})} className="w-full rounded-lg border-slate-200 p-2.5 border focus:ring-blue-500" placeholder="เช่น -500 หรือ 1000" />
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm space-y-2">
            <div className="flex justify-between text-slate-600"><span>ค่าเดินทาง:</span> <span>{formatCurrency(travelCost)}</span></div>
            <div className="flex justify-between text-slate-600"><span>ค่าแรงติดตั้ง:</span> <span>{formatCurrency(installCost)}</span></div>
            {ladderCost > 0 && <div className="flex justify-between text-slate-500 text-sm"><span>ค่าบันไดสูง ({formData.ladderQty} จุด):</span> <span>{formatCurrency(ladderCost)}</span></div>}
            {scaffoldCost > 0 && <div className="flex justify-between text-slate-500 text-sm"><span>ค่านั่งร้าน ({formData.scaffoldQty} จุด):</span> <span>{formatCurrency(scaffoldCost)}</span></div>}
            {motorCost > 0 && <div className="flex justify-between text-slate-500 text-sm"><span>ค่าติดตั้งมอเตอร์ ({formData.motorQty} จุด):</span> <span>{formatCurrency(motorCost)}</span></div>}
            {otherCost !== 0 && <div className="flex justify-between text-slate-500 text-sm"><span>ค่าใช้จ่ายอื่นๆ:</span> <span>{formatCurrency(otherCost)}</span></div>}
            <div className="flex justify-between font-bold text-xl pt-3 border-t border-slate-100 mt-2 text-blue-700">
              <span>ยอดรวมสุทธิ:</span> <span>฿{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 space-x-4">
          {editingRecord && (
            <button type="button" onClick={onCancelEdit} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 px-8 rounded-xl shadow-sm transition-all duration-200">
              ยกเลิกการแก้ไข
            </button>
          )}
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all duration-200 hover:-translate-y-0.5 flex items-center">
            <Save className="mr-2" size={20} /> {editingRecord ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูลงาน'}
          </button>
        </div>
      </form>
    </div>
  );
};

// 1.5 Record List View
const RecordListView = ({ db, records, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTech, setFilterTech] = useState('all');

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' ? true : 
                          filterStatus === 'claimed' ? r.isClaimed : !r.isClaimed;
    const matchesTech = filterTech === 'all' ? true : r.technicianId === filterTech;

    return matchesSearch && matchesStatus && matchesTech;
  });

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-7xl mx-auto min-h-[80vh]">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3 text-indigo-600">
            <List size={24} />
          </div>
          รายการงานที่บันทึก
        </h2>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-semibold text-sm">
          ทั้งหมด {records.length} รายการ
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded-xl">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="ค้นหาจาก เลข Order หรือ ชื่อลูกค้า..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <select 
              value={filterTech} 
              onChange={(e) => setFilterTech(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-indigo-500 shadow-sm bg-white"
            >
              <option value="all">ทุกทีมช่าง</option>
              {db.technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-lg border border-slate-200 focus:ring-indigo-500 shadow-sm bg-white"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="unclaimed">ยังไม่เบิกจ่าย</option>
            <option value="claimed">ทำเบิกจ่ายแล้ว</option>
          </select>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[600px]">
          <table className="min-w-full bg-white text-sm relative">
            <thead className="bg-slate-800 text-white sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 text-left font-semibold">วันที่</th>
                <th className="py-3 px-4 text-left font-semibold">ทีมช่าง</th>
                <th className="py-3 px-4 text-left font-semibold">ลูกค้า / Order</th>
                <th className="py-3 px-4 text-left font-semibold">ประเภทงาน (Operation)</th>
                <th className="py-3 px-4 text-right font-semibold">ยอดรวม (บาท)</th>
                <th className="py-3 px-4 text-center font-semibold">สถานะ</th>
                <th className="py-3 px-4 text-center font-semibold w-24">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-12 text-slate-500">ไม่พบข้อมูลที่ค้นหา</td></tr>
              ) : (
                filteredRecords.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">{formatDateThai(r.date)}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{r.technicianName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-indigo-700">{r.orderNo}</div>
                      <div className="text-slate-600 text-xs">{r.customerName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{r.jobTypeName}</div>
                      <div className="text-xs text-slate-500">{r.operationName}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700">{formatCurrency(r.calculated.grandTotal)}</td>
                    <td className="py-3 px-4 text-center">
                      {r.isClaimed 
                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">เบิกแล้ว</span> 
                        : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">พร้อมเบิก</span>}
                    </td>
                    <td className="py-3 px-4 text-center space-x-1.5 flex justify-center">
                      {!r.isClaimed && (
                        <button onClick={() => onEdit(r)} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1.5 rounded transition-colors" title="แก้ไข">
                          <Edit2 size={16}/>
                        </button>
                      )}
                      <button onClick={() => onDelete(r.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded transition-colors" title="ลบข้อมูล">
                        <Trash2 size={16}/>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 2. Report Document Generator
const ReportView = ({ db, records, onClaimRecords, historyData, onCloseHistory }) => {
  const isHistoryView = !!historyData;
  
  const [filter, setFilter] = useState({
    technicianId: db.technicians[0]?.id || '',
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  
  const [selectedRecords, setSelectedRecords] = useState({});
  const [printMode, setPrintMode] = useState(isHistoryView);
  const [reportConfig, setReportConfig] = useState({
    adminId: db.admins[0]?.id || '',
    approverId: db.approvers[0]?.id || '',
    reportDate: new Date().toISOString().split('T')[0],
    transferDate: '',
  });

  const handleToggleRecord = (id) => {
    setSelectedRecords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const dataToRender = isHistoryView ? historyData.selectedData : records.filter(r => r.technicianId === filter.technicianId && r.date >= filter.startDate && r.date <= filter.endDate);
  const selectedData = isHistoryView ? historyData.selectedData : dataToRender.filter(r => selectedRecords[r.id]);
  const hasSelected = selectedData.length > 0;

  if (printMode) {
    const rConfig = isHistoryView ? historyData.reportConfig : reportConfig;
    const rFilter = isHistoryView ? historyData.filter : filter;
    
    const admin = db.admins.find(a => a.id === rConfig.adminId) || {name: ''};
    const approver = db.approvers.find(a => a.id === rConfig.approverId) || {name: ''};
    const tech = db.technicians.find(t => t.id === rFilter.technicianId) || (isHistoryView ? historyData.tech : {name: ''});
    
    const groupedByOp = selectedData.reduce((acc, curr) => {
      if (!acc[curr.operationName]) acc[curr.operationName] = [];
      acc[curr.operationName].push(curr);
      return acc;
    }, {});

    const totalGrand = selectedData.reduce((sum, r) => sum + r.calculated.grandTotal, 0);
    const taxWHT = totalGrand * 0.03;
    const netTotal = totalGrand - taxWHT;

    const hasCurtain = selectedData.some(r => r.isCurtain);
    const hasWall = selectedData.some(r => !r.isCurtain);
    let jobDescText = "ค่าแรงติดตั้งอุปกรณ์รางม่าน";
    if (hasWall && !hasCurtain) jobDescText = "ค่าแรงติดตั้งและอุปกรณ์วอล";
    if (hasWall && hasCurtain) jobDescText = "ค่าแรงติดตั้งผ้าม่านและวอลเปเปอร์";

    const dates = selectedData.map(r => new Date(r.date));
    const formatThaiDateShort = (d) => `${d.getDate()}/${d.getMonth() + 1}/${(d.getFullYear() + 543).toString().slice(-2)}`;
    let calculatedDateRangeText = "";
    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      if (minDate.getTime() === maxDate.getTime()) {
        calculatedDateRangeText = formatThaiDateShort(minDate);
      } else if (minDate.getMonth() === maxDate.getMonth() && minDate.getFullYear() === maxDate.getFullYear()) {
        calculatedDateRangeText = `${minDate.getDate()}-${formatThaiDateShort(maxDate)}`;
      } else {
        calculatedDateRangeText = `${formatThaiDateShort(minDate)} - ${formatThaiDateShort(maxDate)}`;
      }
    }

    const dateRangeText = isHistoryView ? historyData.dateRangeText : calculatedDateRangeText;
    const transferDateStr = rConfig.transferDate ? formatDateThai(rConfig.transferDate) : "........................";
    const bahtTexts = getThaiBahtText(netTotal);

    const handleConfirmClaim = () => {
      const claimInfo = {
        id: 'CLAIM' + Date.now(),
        date: rConfig.reportDate,
        technician: tech.name,
        amount: netTotal,
        recordCount: selectedData.length,
        recordIds: selectedData.map(r => r.id),
        status: 'active',
        savedState: {
          reportConfig: rConfig,
          filter: rFilter,
          selectedData,
          tech,
          dateRangeText
        }
      };
      onClaimRecords(Object.keys(selectedRecords).filter(k => selectedRecords[k]), claimInfo);
      setPrintMode(false);
    };

    return (
      <div className="bg-slate-200 min-h-screen p-8 print:p-0 print:bg-white font-sans text-black flex flex-col items-center relative">
        {isHistoryView && historyData.status === 'cancelled' && (
          <div className="absolute top-1/3 opacity-20 pointer-events-none rotate-[-30deg] z-50 select-none">
            <h1 className="text-9xl font-black text-red-600 border-8 border-red-600 p-8 rounded-3xl uppercase">ยกเลิกแล้ว</h1>
          </div>
        )}
        
        <div className="w-full max-w-4xl flex justify-between mb-4 print:hidden bg-white p-4 rounded-xl shadow-sm border border-slate-200 z-10">
           <button onClick={() => isHistoryView ? onCloseHistory() : setPrintMode(false)} className="bg-slate-100 text-slate-700 px-5 py-2 rounded-lg font-semibold flex items-center hover:bg-slate-200 transition-colors">
             <X className="mr-2" size={18}/> {isHistoryView ? 'ปิดพรีวิว' : 'กลับไปแก้ไข'}
           </button>
           <div className="space-x-3 flex">
             <button onClick={() => window.print()} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-semibold flex items-center hover:bg-indigo-700 shadow-sm transition-colors">
               <Printer className="mr-2" size={18}/> พิมพ์เอกสาร
             </button>
             {!isHistoryView && (
               <button onClick={handleConfirmClaim} className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-semibold flex items-center hover:bg-emerald-700 shadow-sm transition-colors">
                 <CheckSquare className="mr-2" size={18}/> ยืนยันการทำเบิก
               </button>
             )}
           </div>
        </div>

        <div className="w-full max-w-4xl bg-white p-10 shadow-lg print:shadow-none print:w-full print:p-4 text-[13px] print:text-[11px] leading-relaxed relative z-10">
          
          <div className="text-center mb-6">
            <h1 className="text-xl print:text-lg font-bold">ใบขออนุมัติเบิกจ่ายเช็ค</h1>
            <h2 className="text-lg print:text-base mt-1 font-bold">บริษัท เท็กซ์ไทล์ แกลลอรี่ จำกัด</h2>
          </div>

          <div className="flex justify-between mb-2">
            <div><span className="font-semibold">ชื่อผู้เบิก :</span> {admin.name}</div>
            <div><span className="font-semibold">ว.ด.ป. :</span> {new Date(rConfig.reportDate).toLocaleDateString('en-GB')}</div>
          </div>
          <div className="flex justify-between mb-2">
            <div><span className="font-semibold">เช็คสั่งจ่าย :</span> {tech.name}</div>
            <div><span className="font-semibold">ฝ่าย :</span> {Object.keys(groupedByOp).join(', ')}</div>
          </div>
          <div className="mb-4 pb-2 border-b border-gray-300">
            {tech.bank} สาขา{tech.branch} {tech.accNo}
          </div>

          <table className="w-full border-collapse border border-black mb-4 relative bg-white">
            <thead>
              <tr className="bg-gray-50 print:bg-transparent">
                <th className="border border-black p-2 w-12 text-center font-semibold">ลำดับที่</th>
                <th className="border border-black p-2 text-center font-semibold">รายการ</th>
                <th className="border border-black p-2 w-40 text-center font-semibold">อ้างถึงใบสั่งซื้อหรืออื่น ๆ</th>
                <th className="border border-black p-2 w-28 text-center font-semibold">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-l border-r border-black p-1"></td>
                <td className="border-l border-r border-black p-1 px-2 font-semibold bg-gray-50 print:bg-transparent">ขออนุมัติเบิกจ่ายเช็คตามรายละเอียดดังนี้</td>
                <td className="border-l border-r border-black p-1"></td>
                <td className="border-l border-r border-black p-1"></td>
              </tr>
              <tr>
                <td className="border-l border-r border-b border-black p-2 text-center align-middle">1</td>
                <td className="border-l border-r border-b border-black p-2 align-middle">
                  ทำจ่าย{jobDescText}วันที่ {dateRangeText}<br/>
                  จำนวนเงินที่ทำจ่ายหักภาษี ณ ที่จ่าย 3% แล้วคงเหลือจ่ายจริง ให้{tech.name}
                </td>
                <td className="border-l border-r border-b border-black p-2"></td>
                <td className="border-l border-r border-b border-black p-2 text-right align-middle font-semibold">
                  {formatCurrency(netTotal)}
                </td>
              </tr>
              
              {Object.entries(groupedByOp).map(([opName, jobs], opIndex) => (
                <React.Fragment key={opName}>
                  <tr>
                    <td className="border-l border-r border-black p-1"></td>
                    <td className="border-l border-r border-black p-1 px-2 font-semibold bg-gray-50 print:bg-transparent">งาน {opName}</td>
                    <td className="border-l border-r border-black p-1"></td>
                    <td className="border-l border-r border-black p-1"></td>
                  </tr>
                  {jobs.map((job, jIdx) => {
                    const extraItems = [];
                    if (job.calculated.scaffoldCost > 0) extraItems.push(`ค่าตั้งนั่งร้าน ${job.calculated.scaffoldCost.toLocaleString('en-US')}`);
                    if (job.calculated.ladderCost > 0) extraItems.push(`ค่าบันไดสูง ${job.calculated.ladderCost.toLocaleString('en-US')}`);
                    if (job.calculated.motorCost > 0) extraItems.push(`ค่าติดตั้งมอเตอร์ ${job.calculated.motorCost.toLocaleString('en-US')}`);
                    if (job.calculated.travelCost > 0) extraItems.push(`ค่าเดินทาง ${job.calculated.travelCost.toLocaleString('en-US')}`);

                    return (
                      <React.Fragment key={job.id}>
                        <tr>
                          <td className="border-l border-r border-black p-1"></td>
                          <td className="border-l border-r border-black p-1 px-4">
                            งานติดตั้ง{job.customerName} {job.orderNo} เซลล์ {job.salesperson} - {job.calculated.installCost.toLocaleString('en-US', { minimumFractionDigits: 0 })} บาท
                          </td>
                          <td className="border-l border-r border-black p-1"></td>
                          <td className="border-l border-r border-black p-1"></td>
                        </tr>
                        {extraItems.length > 0 && (
                          <tr>
                            <td className="border-l border-r border-black p-1"></td>
                            <td className="border-l border-r border-black p-1 px-6 text-gray-700">
                              {extraItems.join(', ')}
                            </td>
                            <td className="border-l border-r border-black p-1"></td>
                            <td className="border-l border-r border-black p-1"></td>
                          </tr>
                        )}
                        <tr>
                          <td className="border-l border-r border-b border-black p-2"></td>
                          <td className="border-l border-r border-b border-black p-2"></td>
                          <td className="border-l border-r border-b border-black p-2"></td>
                          <td className="border-l border-r border-b border-black p-2"></td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}

              <tr>
                <td className="border-l border-r border-black p-1"></td>
                <td className="border-l border-r border-black p-1 px-2 font-semibold">
                  ** ขอโอนเงินเข้าบัญชี ภายในวันที่ : {transferDateStr}
                </td>
                <td className="border-l border-r border-black p-1"></td>
                <td className="border-l border-r border-black p-1"></td>
              </tr>

              <tr>
                <td className="border-l border-r border-black p-3"></td>
                <td className="border-l border-r border-black p-3"></td>
                <td className="border-l border-r border-black p-3"></td>
                <td className="border-l border-r border-black p-3"></td>
              </tr>

              <tr className="bg-gray-50 print:bg-transparent border-t border-black">
                <td className="border border-black p-2 text-center font-bold align-middle">รวม:</td>
                <td className="border border-black p-2 text-center font-semibold align-middle">
                  {bahtTexts.baht}{bahtTexts.satang === 'ถ้วน' ? 'ถ้วน' : `สตางค์ ${bahtTexts.satang}`}
                </td>
                <td className="border border-black p-2 text-center font-semibold align-middle"></td>
                <td className="border border-black p-2 text-right font-bold align-middle">
                   {formatCurrency(netTotal)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-6 flex justify-between items-start">
            <div className="w-1/2">
              <div className="mb-2">ผู้อนุมัติ: <span className="inline-block w-48 border-b border-dotted border-black"></span></div>
              <div className="ml-12 mb-4">({approver.name})</div>
              <div>ว.ด.ป.: <span className="inline-block w-48 border-b border-dotted border-black"></span></div>
            </div>
            
            <div className="w-1/2 flex justify-end">
              <div className="mb-2">หมายเหตุ(ฝ่ายบัญชี) : <span className="inline-block w-40 border-b border-dotted border-black"></span></div>
            </div>
          </div>
          
          <div className="mt-12 text-center font-normal">
             (กำหนดเงื่อนไขการทำเช็คจ่ายตั้งแต่ 2,000.00 บาทขึ้นไป)
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-5xl mx-auto min-h-[80vh]">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3 text-emerald-600">
            <FileText size={24} />
          </div>
          เตรียมเอกสารขออนุมัติเบิกจ่าย
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">เลือกทีมช่าง</label>
          <select value={filter.technicianId} onChange={e => setFilter({...filter, technicianId: e.target.value})} className="w-full rounded-lg border-slate-200 p-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 bg-white">
            {db.technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">ตั้งแต่วันที่</label>
          <input type="date" value={filter.startDate} onChange={e => setFilter({...filter, startDate: e.target.value})} className="w-full rounded-lg border-slate-200 p-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">ถึงวันที่</label>
          <input type="date" value={filter.endDate} onChange={e => setFilter({...filter, endDate: e.target.value})} className="w-full rounded-lg border-slate-200 p-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">ผู้ทำเบิก</label>
          <select value={reportConfig.adminId} onChange={e => setReportConfig({...reportConfig, adminId: e.target.value})} className="w-full rounded-lg border-slate-200 p-2 shadow-sm bg-white">
            {db.admins.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-indigo-700 mb-1">ผู้อนุมัติ (ใน PDF)</label>
          <select value={reportConfig.approverId} onChange={e => setReportConfig({...reportConfig, approverId: e.target.value})} className="w-full rounded-lg border-indigo-200 bg-indigo-50 p-2 shadow-sm">
            {db.approvers.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-amber-700 mb-1">วันโอนเงิน (ใน PDF)</label>
          <input type="date" value={reportConfig.transferDate} onChange={e => setReportConfig({...reportConfig, transferDate: e.target.value})} className="w-full rounded-lg border-amber-200 bg-amber-50 p-2 shadow-sm" />
        </div>
      </div>

      <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[400px]">
          <table className="min-w-full bg-white text-sm relative">
            <thead className="bg-slate-800 text-white sticky top-0 z-10">
              <tr>
                <th className="py-3 px-4 text-center w-16 font-semibold">เลือก</th>
                <th className="py-3 px-4 text-left font-semibold">วันที่</th>
                <th className="py-3 px-4 text-left font-semibold">Operation</th>
                <th className="py-3 px-4 text-left font-semibold">Order / ลูกค้า</th>
                <th className="py-3 px-4 text-left font-semibold">ประเภทงาน</th>
                <th className="py-3 px-4 text-right font-semibold">ยอดรวม</th>
                <th className="py-3 px-4 text-center font-semibold">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dataToRender.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-12 text-slate-500">ไม่พบข้อมูลในช่วงเวลาที่เลือก หรือช่างทีมนี้</td></tr>
              ) : (
                dataToRender.map(r => (
                  <tr key={r.id} className={`${r.isClaimed ? 'bg-slate-50 text-slate-400' : 'hover:bg-emerald-50'} transition-colors`}>
                    <td className="py-3 px-4 text-center">
                      <input type="checkbox" className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-50" checked={!!selectedRecords[r.id]} onChange={() => handleToggleRecord(r.id)} disabled={r.isClaimed} />
                    </td>
                    <td className="py-3 px-4">{formatDateThai(r.date)}</td>
                    <td className="py-3 px-4">{r.operationName}</td>
                    <td className="py-3 px-4"><div className="font-semibold text-slate-800">{r.orderNo}</div><div className="text-xs">{r.customerName}</div></td>
                    <td className="py-3 px-4">{r.jobTypeName}</td>
                    <td className="py-3 px-4 text-right font-bold">{formatCurrency(r.calculated.grandTotal)}</td>
                    <td className="py-3 px-4 text-center">
                      {r.isClaimed ? <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-200 text-slate-600">เบิกแล้ว</span> : <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">พร้อมเบิก</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50 p-5 rounded-xl border border-emerald-100 shadow-sm">
        <div>
          <span className="text-sm font-semibold text-slate-600">เลือกแล้ว: </span>
          <span className="font-bold text-emerald-700 text-xl">{selectedData.length} รายการ</span>
        </div>
        <button disabled={!hasSelected} onClick={() => setPrintMode(true)} className={`px-8 py-3 rounded-xl shadow-md font-bold flex items-center transition-all ${hasSelected ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:-translate-y-0.5' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
          <FileText className="mr-2" /> พรีวิวใบขออนุมัติเบิกจ่าย
        </button>
      </div>
    </div>
  );
};

// 3. History View
const HistoryView = ({ history, onViewDocument, onDeleteHistory }) => {
  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-5xl mx-auto min-h-[80vh]">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3 text-amber-600">
            <History size={24} />
          </div>
          ประวัติการทำเบิกจ่าย
        </h2>
      </div>
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="py-4 px-4 text-left font-semibold">รหัสเอกสาร</th>
                <th className="py-4 px-4 text-left font-semibold">วันที่ทำเอกสาร</th>
                <th className="py-4 px-4 text-left font-semibold">สั่งจ่ายให้</th>
                <th className="py-4 px-4 text-center font-semibold">จำนวนรายการ</th>
                <th className="py-4 px-4 text-right font-semibold">ยอดจ่ายสุทธิ</th>
                <th className="py-4 px-4 text-center font-semibold">สถานะ</th>
                <th className="py-4 px-4 text-center font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr><td colSpan="7" className="p-12 text-center text-slate-500">ยังไม่มีประวัติการทำเบิก</td></tr>
              ) : (
                history.map(h => (
                  <tr key={h.id} className={`hover:bg-amber-50 transition-colors ${h.status === 'cancelled' ? 'bg-red-50/50' : ''}`}>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">{h.id}</td>
                    <td className="py-3 px-4">{new Date(h.date).toLocaleDateString('en-GB')}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{h.technician}</td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-600">{h.recordCount}</td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={h.status === 'cancelled' ? 'line-through text-slate-400' : 'text-amber-700'}>
                        {formatCurrency(h.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {h.status === 'cancelled' 
                        ? <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700">ยกเลิกแล้ว</span>
                        : <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-700">ปกติ</span>
                      }
                    </td>
                    <td className="py-3 px-4 text-center flex justify-center space-x-2">
                      <button onClick={() => onViewDocument({...h.savedState, status: h.status})} className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors font-semibold" title="ดูเอกสาร">
                        <Eye size={16} className="mr-1"/> ดู
                      </button>
                      <button onClick={() => onDeleteHistory(h.id)} className="inline-flex items-center justify-center text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors font-semibold" title="ลบประวัติ">
                        <Trash2 size={16} className="mr-1"/> ลบ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 4. Summary Dashboard
const Dashboard = ({ records }) => {
  const summary = useMemo(() => {
    let totalExps = 0;
    const byOp = {};
    const byTech = {};
    const byMonth = {};

    records.forEach(r => {
      totalExps += r.calculated.grandTotal;
      
      const monthKey = r.date.substring(0, 7);
      byMonth[monthKey] = (byMonth[monthKey] || { total: 0, count: 0 });
      byMonth[monthKey].total += r.calculated.grandTotal;
      byMonth[monthKey].count += 1;

      byOp[r.operationName] = (byOp[r.operationName] || { total: 0, count: 0 });
      byOp[r.operationName].total += r.calculated.grandTotal;
      byOp[r.operationName].count += 1;
      
      byTech[r.technicianName] = (byTech[r.technicianName] || { total: 0, count: 0 });
      byTech[r.technicianName].total += r.calculated.grandTotal;
      byTech[r.technicianName].count += 1;
    });

    const opData = Object.keys(byOp).map(k => ({ name: k, value: byOp[k].total, count: byOp[k].count }));
    const techData = Object.keys(byTech).map(k => ({ name: k, value: byTech[k].total, count: byTech[k].count }));
    const monthData = Object.keys(byMonth).sort().map(k => ({ name: k, value: byMonth[k].total, count: byMonth[k].count }));

    return { totalExps, totalJobs: records.length, opData, techData, monthData };
  }, [records]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

  return (
    <div className="p-6 min-h-[80vh] max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mr-3 text-white">
            <LayoutDashboard size={24} />
          </div>
          ภาพรวมค่าใช้จ่าย (Dashboard)
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
          <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">ยอดค่าใช้จ่ายรวมทั้งหมด</h3>
          <p className="text-4xl font-black text-slate-800 mt-2">฿{formatCurrency(summary.totalExps)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
          <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">จำนวนงานทั้งหมด</h3>
          <p className="text-4xl font-black text-slate-800 mt-2">{summary.totalJobs} <span className="text-xl font-semibold text-slate-400">งาน</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
          <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider">จำนวนเดือนที่บันทึก</h3>
          <p className="text-4xl font-black text-slate-800 mt-2">{summary.monthData.length} <span className="text-xl font-semibold text-slate-400">เดือน</span></p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <h3 className="font-bold text-lg text-slate-800 mb-6">สรุปยอดรวมแต่ละเดือน</h3>
        <div className="h-64 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.monthData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis fontSize={12} tickFormatter={(value) => value/1000 + 'k'} axisLine={false} tickLine={false} />
              <RechartsTooltip formatter={(value) => '฿' + formatCurrency(value)} cursor={{fill: '#F1F5F9'}} />
              <Bar dataKey="value" fill="#10B981" radius={[6, 6, 0, 0]} barSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-100">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3 text-left font-semibold">เดือน</th><th className="p-3 text-center font-semibold">จำนวนงาน</th><th className="p-3 text-right font-semibold">ยอดรวม</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {summary.monthData.map(m => (
                <tr key={m.name}>
                  <td className="p-3 font-medium text-slate-800">{m.name}</td>
                  <td className="p-3 text-center font-semibold">{m.count}</td>
                  <td className="p-3 text-right font-bold text-slate-700">{formatCurrency(m.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-lg text-slate-800 mb-6">สรุปแยกตามทีมช่าง (Supplier)</h3>
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary.techData} cx="50%" cy="50%" labelLine={false} label={({name, percent}) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`} outerRadius={80} innerRadius={40} dataKey="value">
                  {summary.techData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip formatter={(value) => '฿' + formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3 text-left font-semibold">ทีมช่าง</th><th className="p-3 text-center font-semibold">งาน</th><th className="p-3 text-right font-semibold">ยอดรวม</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {summary.techData.map((t, idx) => (
                  <tr key={t.name}>
                    <td className="p-3 flex items-center"><span className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: COLORS[idx % COLORS.length]}}></span>{t.name}</td>
                    <td className="p-3 text-center font-semibold">{t.count}</td>
                    <td className="p-3 text-right font-bold text-slate-700">{formatCurrency(t.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-lg text-slate-800 mb-6">สรุปแยกตาม Operation</h3>
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.opData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} />
                <YAxis fontSize={12} tickFormatter={(value) => value/1000 + 'k'} axisLine={false} tickLine={false} />
                <RechartsTooltip formatter={(value) => '฿' + formatCurrency(value)} cursor={{fill: '#F1F5F9'}} />
                <Bar dataKey="value" fill="#8B5CF6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3 text-left font-semibold">Operation</th><th className="p-3 text-center font-semibold">งาน</th><th className="p-3 text-right font-semibold">ยอดรวม</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {summary.opData.map(op => (
                  <tr key={op.name}>
                    <td className="p-3 font-medium text-slate-800">{op.name}</td>
                    <td className="p-3 text-center font-semibold">{op.count}</td>
                    <td className="p-3 text-right font-bold text-slate-700">{formatCurrency(op.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// 5. Database View (With Import)
const DatabaseView = ({ db, setDb, showAlert, showConfirm }) => {
  const [newTech, setNewTech] = useState({ name: '', bank: '', branch: '', accNo: '' });
  const [newProv, setNewProv] = useState({ name: '', travelCost: '' });
  const [newAppr, setNewAppr] = useState({ name: '' });
  const [newAdmin, setNewAdmin] = useState({ name: '' });
  const [newUser, setNewUser] = useState({ username: '', name: '', password: '' });
  const [newOp, setNewOp] = useState({ name: '' });
  const [newSales, setNewSales] = useState({});

  const [editingTech, setEditingTech] = useState(null);
  const [editingProv, setEditingProv] = useState(null);
  const [editingAppr, setEditingAppr] = useState(null);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  const [importType, setImportType] = useState('technicians');
  const [importHasHeader, setImportHasHeader] = useState(true);

  const handleAddTech = () => { if (newTech.name) { setDb({ ...db, technicians: [...db.technicians, { ...newTech, id: 'T' + Date.now() }] }); setNewTech({ name: '', bank: '', branch: '', accNo: '' }); } };
  const handleAddProv = () => { if (newProv.name) { setDb({ ...db, provinces: [...db.provinces, { name: newProv.name, travelCost: Number(newProv.travelCost) }] }); setNewProv({ name: '', travelCost: '' }); } };
  const handleAddAppr = () => { if (newAppr.name) { setDb({ ...db, approvers: [...db.approvers, { id: 'AP' + Date.now(), name: newAppr.name }] }); setNewAppr({ name: '' }); } };
  const handleAddAdmin = () => { if (newAdmin.name) { setDb({ ...db, admins: [...(db.admins || []), { id: 'A' + Date.now(), name: newAdmin.name }] }); setNewAdmin({ name: '' }); } };
  const handleAddUser = () => { if (newUser.username && newUser.password) { setDb({ ...db, users: [...(db.users || []), { ...newUser, id: 'U' + Date.now() }] }); setNewUser({ username: '', name: '', password: '' }); } };
  const handleAddOp = () => { if (newOp.name) { setDb({ ...db, operations: [...(db.operations || []), { id: 'OP' + Date.now(), name: newOp.name, sales: [] }] }); setNewOp({ name: '' }); } };

  const handleDeleteTech = (id) => { showConfirm('ยืนยันการลบช่าง?', () => { setDb({ ...db, technicians: db.technicians.filter(t => t.id !== id) }); }); };
  const handleDeleteProv = (name) => { showConfirm('ยืนยันการลบจังหวัด?', () => { setDb({ ...db, provinces: db.provinces.filter(p => p.name !== name) }); }); };
  const handleDeleteAppr = (id) => { showConfirm('ยืนยันการลบผู้อนุมัติ?', () => { setDb({ ...db, approvers: db.approvers.filter(a => a.id !== id) }); }); };
  const handleDeleteAdmin = (id) => { showConfirm('ยืนยันการลบผู้ทำเบิก?', () => { setDb({ ...db, admins: db.admins.filter(a => a.id !== id) }); }); };
  const handleDeleteUser = (id) => { showConfirm('ยืนยันการลบผู้ใช้งาน?', () => { setDb({ ...db, users: db.users.filter(u => u.id !== id) }); }); };
  const handleDeleteOp = (id) => { showConfirm('ยืนยันการลบ Operation?', () => { setDb({ ...db, operations: db.operations.filter(o => o.id !== id) }); }); };

  const handleAddSales = (opId) => { 
    const sName = newSales[opId];
    if (sName && sName.trim()) {
      setDb({ ...db, operations: db.operations.map(o => o.id === opId ? { ...o, sales: [...(o.sales || []), sName.trim()] } : o) });
      setNewSales({ ...newSales, [opId]: '' });
    }
  };
  const handleDeleteSales = (opId, sName) => { showConfirm(`ยืนยันการลบพนักงานเซลล์: ${sName}?`, () => { setDb({ ...db, operations: db.operations.map(o => o.id === opId ? { ...o, sales: o.sales.filter(s => s !== sName) } : o) }); }); };

  const handleSaveTech = () => { setDb({ ...db, technicians: db.technicians.map(t => t.id === editingTech.id ? editingTech : t) }); setEditingTech(null); };
  const handleSaveProv = () => { setDb({ ...db, provinces: db.provinces.map(p => p.name === editingProv.oldName ? { name: editingProv.name, travelCost: Number(editingProv.travelCost) } : p) }); setEditingProv(null); };
  const handleSaveAppr = () => { setDb({ ...db, approvers: db.approvers.map(a => a.id === editingAppr.id ? editingAppr : a) }); setEditingAppr(null); };
  const handleSaveAdmin = () => { setDb({ ...db, admins: db.admins.map(a => a.id === editingAdmin.id ? editingAdmin : a) }); setEditingAdmin(null); };
  const handleSaveUser = () => { setDb({ ...db, users: db.users.map(u => u.id === editingUser.id ? editingUser : u) }); setEditingUser(null); };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const rows = text.split('\n').filter(row => row.trim().length > 0);
      let dataRows = importHasHeader ? rows.slice(1) : rows;
      
      let newDb = { ...db };
      let addedCount = 0;

      dataRows.forEach((row, index) => {
        const cols = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length === 0 || !cols[0]) return;

        if (importType === 'technicians' && cols.length >= 1) {
          newDb.technicians.push({ id: 'T_IMP' + Date.now() + index, name: cols[0], bank: cols[1] || '', branch: cols[2] || '', accNo: cols[3] || '' });
          addedCount++;
        } 
        else if (importType === 'provinces' && cols.length >= 1) {
          if (!newDb.provinces.find(p => p.name === cols[0])) {
            newDb.provinces.push({ name: cols[0], travelCost: Number(cols[1]) || 0 });
            addedCount++;
          }
        }
        else if (importType === 'approvers' && cols.length >= 1) {
          newDb.approvers.push({ id: 'AP_IMP' + Date.now() + index, name: cols[0] });
          addedCount++;
        }
        else if (importType === 'admins' && cols.length >= 1) {
          newDb.admins.push({ id: 'A_IMP' + Date.now() + index, name: cols[0] });
          addedCount++;
        }
      });

      setDb(newDb);
      showAlert(`นำเข้าข้อมูลสำเร็จ: เพิ่มข้อมูลใหม่ ${addedCount} รายการ`);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-5xl mx-auto space-y-8 min-h-[80vh]">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mr-3 text-slate-700">
            <Database size={24} />
          </div>
          จัดการฐานข้อมูลอ้างอิง
        </h2>
      </div>

      <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm flex flex-col md:flex-row items-center gap-6 justify-between">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-blue-900 flex items-center mb-2"><Upload className="mr-2" size={20}/> นำเข้าข้อมูล (Import CSV/TXT)</h3>
          <p className="text-sm text-slate-600 mb-4">รองรับไฟล์ .csv หรือ .txt ที่คั่นด้วยลูกน้ำ (,) <br/>รูปแบบคอลัมน์ ทีมช่าง: ชื่อ,ธนาคาร,สาขา,เลขบัญชี | จังหวัด: ชื่อ,ราคา</p>
          <div className="flex gap-4 items-center flex-wrap">
            <select value={importType} onChange={e => setImportType(e.target.value)} className="p-2.5 rounded-lg border border-slate-200 shadow-sm bg-white focus:ring-blue-500 font-semibold text-sm">
              <option value="technicians">นำเข้า 'ทีมช่าง'</option>
              <option value="provinces">นำเข้า 'จังหวัดและค่าเดินทาง'</option>
              <option value="approvers">นำเข้า 'ผู้อนุมัติ'</option>
              <option value="admins">นำเข้า 'ผู้ทำเบิก'</option>
            </select>
            <label className="flex items-center text-sm font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={importHasHeader} onChange={e => setImportHasHeader(e.target.checked)} className="mr-2 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"/>
              ไฟล์มี Header แถวแรก
            </label>
          </div>
        </div>
        <div>
          <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-md cursor-pointer font-bold flex items-center transition-all hover:-translate-y-0.5">
            <Upload className="mr-2" size={18}/> เลือกไฟล์และนำเข้า
            <input type="file" accept=".csv, .txt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>
      
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="bg-slate-50 p-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">รายชื่อทีมช่าง (Supplier)</h3>
        </div>
        <div className="p-4 bg-white">
          <div className="flex gap-3 mb-4 items-center">
            <input type="text" placeholder="ชื่อช่าง/ทีม" value={newTech.name} onChange={e=>setNewTech({...newTech, name:e.target.value})} className="border border-slate-200 focus:ring-blue-500 p-2 rounded-lg text-sm flex-1 shadow-sm" />
            <input type="text" placeholder="ธนาคาร" value={newTech.bank} onChange={e=>setNewTech({...newTech, bank:e.target.value})} className="border border-slate-200 focus:ring-blue-500 p-2 rounded-lg text-sm w-32 shadow-sm" />
            <input type="text" placeholder="สาขา" value={newTech.branch} onChange={e=>setNewTech({...newTech, branch:e.target.value})} className="border border-slate-200 focus:ring-blue-500 p-2 rounded-lg text-sm w-32 shadow-sm" />
            <input type="text" placeholder="เลขบัญชี" value={newTech.accNo} onChange={e=>setNewTech({...newTech, accNo:e.target.value})} className="border border-slate-200 focus:ring-blue-500 p-2 rounded-lg text-sm w-36 shadow-sm" />
            <button onClick={handleAddTech} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 shadow-sm transition-colors flex items-center"><PlusCircle size={18} className="mr-1"/> เพิ่ม</button>
          </div>
          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3 text-left font-semibold">ชื่อทีมช่าง</th><th className="p-3 text-left font-semibold">ธนาคาร</th><th className="p-3 text-left font-semibold">สาขา</th><th className="p-3 text-left font-semibold">เลขที่บัญชี</th><th className="p-3 text-center w-24 font-semibold">จัดการ</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {db.technicians.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    {editingTech?.id === t.id ? (
                      <>
                        <td className="p-2"><input className="border border-slate-300 rounded w-full p-1.5 text-sm focus:ring-blue-500" value={editingTech.name} onChange={e=>setEditingTech({...editingTech, name:e.target.value})} /></td>
                        <td className="p-2"><input className="border border-slate-300 rounded w-full p-1.5 text-sm focus:ring-blue-500" value={editingTech.bank} onChange={e=>setEditingTech({...editingTech, bank:e.target.value})} /></td>
                        <td className="p-2"><input className="border border-slate-300 rounded w-full p-1.5 text-sm focus:ring-blue-500" value={editingTech.branch} onChange={e=>setEditingTech({...editingTech, branch:e.target.value})} /></td>
                        <td className="p-2"><input className="border border-slate-300 rounded w-full p-1.5 text-sm focus:ring-blue-500" value={editingTech.accNo} onChange={e=>setEditingTech({...editingTech, accNo:e.target.value})} /></td>
                        <td className="p-2 text-center space-x-2">
                          <button onClick={handleSaveTech} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 p-1.5 rounded"><Save size={16}/></button>
                          <button onClick={()=>setEditingTech(null)} className="text-slate-500 hover:text-slate-700 bg-slate-100 p-1.5 rounded"><X size={16}/></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 font-medium text-slate-800">{t.name}</td><td className="p-3">{t.bank}</td><td className="p-3">{t.branch}</td><td className="p-3">{t.accNo}</td>
                        <td className="p-3 text-center space-x-2">
                          <button onClick={()=>setEditingTech(t)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-1.5 rounded transition-colors"><Edit2 size={16}/></button>
                          <button onClick={()=>handleDeleteTech(t.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded transition-colors"><Trash2 size={16}/></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col bg-white">
          <div className="bg-slate-50 p-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">รายชื่อผู้อนุมัติ (โชว์ใน PDF)</h3>
          </div>
          <div className="p-4 flex flex-col gap-4">
            <div className="flex gap-2">
              <input type="text" placeholder="เพิ่มชื่อผู้อนุมัติใหม่" value={newAppr.name} onChange={e=>setNewAppr({name:e.target.value})} className="border border-slate-200 p-2 rounded-lg text-sm flex-1 shadow-sm focus:ring-blue-500" />
              <button onClick={handleAddAppr} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 shadow-sm flex items-center"><PlusCircle size={18} className="mr-1"/>เพิ่ม</button>
            </div>
            <div className="border border-slate-100 rounded-lg overflow-hidden max-h-[250px] overflow-y-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {db.approvers.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      {editingAppr?.id === a.id ? (
                         <>
                          <td className="p-2"><input className="border border-slate-300 w-full p-1.5 rounded focus:ring-blue-500" value={editingAppr.name} onChange={e=>setEditingAppr({...editingAppr, name:e.target.value})} /></td>
                          <td className="p-2 text-right space-x-2 w-24">
                            <button onClick={handleSaveAppr} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 p-1.5 rounded"><Save size={16}/></button>
                            <button onClick={()=>setEditingAppr(null)} className="text-slate-500 hover:text-slate-700 bg-slate-100 p-1.5 rounded"><X size={16}/></button>
                          </td>
                         </>
                      ) : (
                        <>
                          <td className="p-3 font-medium text-slate-800">{a.name}</td>
                          <td className="p-3 text-right space-x-2">
                            <button onClick={()=>setEditingAppr(a)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-1.5 rounded transition-colors"><Edit2 size={16}/></button>
                            <button onClick={()=>handleDeleteAppr(a.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded transition-colors"><Trash2 size={16}/></button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col bg-white">
          <div className="bg-slate-50 p-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">รายชื่อผู้ทำเบิก (โชว์ใน PDF)</h3>
          </div>
          <div className="p-4 flex flex-col gap-4">
            <div className="flex gap-2">
              <input type="text" placeholder="เพิ่มชื่อผู้ทำเบิกใหม่" value={newAdmin.name} onChange={e=>setNewAdmin({name:e.target.value})} className="border border-slate-200 p-2 rounded-lg text-sm flex-1 shadow-sm focus:ring-blue-500" />
              <button onClick={handleAddAdmin} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 shadow-sm flex items-center"><PlusCircle size={18} className="mr-1"/>เพิ่ม</button>
            </div>
            <div className="border border-slate-100 rounded-lg overflow-hidden max-h-[250px] overflow-y-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {(db.admins || []).map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      {editingAdmin?.id === a.id ? (
                         <>
                          <td className="p-2"><input className="border border-slate-300 w-full p-1.5 rounded focus:ring-blue-500" value={editingAdmin.name} onChange={e=>setEditingAdmin({...editingAdmin, name:e.target.value})} /></td>
                          <td className="p-2 text-right space-x-2 w-24">
                            <button onClick={handleSaveAdmin} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 p-1.5 rounded"><Save size={16}/></button>
                            <button onClick={()=>setEditingAdmin(null)} className="text-slate-500 hover:text-slate-700 bg-slate-100 p-1.5 rounded"><X size={16}/></button>
                          </td>
                         </>
                      ) : (
                        <>
                          <td className="p-3 font-medium text-slate-800">{a.name}</td>
                          <td className="p-3 text-right space-x-2">
                            <button onClick={()=>setEditingAdmin(a)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-1.5 rounded transition-colors"><Edit2 size={16}/></button>
                            <button onClick={()=>handleDeleteAdmin(a.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded transition-colors"><Trash2 size={16}/></button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col bg-white">
          <div className="bg-slate-50 p-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">จัดการผู้ใช้งานระบบ (Login Admin)</h3>
          </div>
          <div className="p-4 flex flex-col gap-4">
            <div className="flex gap-2 flex-wrap">
              <input type="text" placeholder="Username" value={newUser.username} onChange={e=>setNewUser({...newUser, username:e.target.value})} className="border border-slate-200 p-2 rounded-lg text-sm flex-1 shadow-sm focus:ring-blue-500 min-w-[100px]" />
              <input type="text" placeholder="ชื่อ-นามสกุล" value={newUser.name} onChange={e=>setNewUser({...newUser, name:e.target.value})} className="border border-slate-200 p-2 rounded-lg text-sm flex-1 shadow-sm focus:ring-blue-500 min-w-[120px]" />
              <input type="text" placeholder="รหัสผ่าน" value={newUser.password} onChange={e=>setNewUser({...newUser, password:e.target.value})} className="border border-slate-200 p-2 rounded-lg text-sm flex-1 shadow-sm focus:ring-blue-500 min-w-[100px]" />
              <button onClick={handleAddUser} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 shadow-sm flex items-center"><PlusCircle size={18} className="mr-1"/> เพิ่มผู้ใช้งาน</button>
            </div>
            <div className="border border-slate-100 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 sticky top-0"><tr><th className="p-3 text-left font-semibold">Username</th><th className="p-3 text-left font-semibold">ชื่อ-นามสกุล</th><th className="p-3 text-left font-semibold">รหัสผ่าน</th><th className="p-3 text-center font-semibold w-24">จัดการ</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {(db.users || []).map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      {editingUser?.id === u.id ? (
                        <>
                          <td className="p-2"><input className="border border-slate-300 w-full p-1.5 rounded focus:ring-blue-500" value={editingUser.username} onChange={e=>setEditingUser({...editingUser, username:e.target.value})} /></td>
                          <td className="p-2"><input className="border border-slate-300 w-full p-1.5 rounded focus:ring-blue-500" value={editingUser.name} onChange={e=>setEditingUser({...editingUser, name:e.target.value})} /></td>
                          <td className="p-2"><input className="border border-slate-300 w-full p-1.5 rounded focus:ring-blue-500" value={editingUser.password} onChange={e=>setEditingUser({...editingUser, password:e.target.value})} /></td>
                          <td className="p-2 text-center space-x-2">
                            <button onClick={handleSaveUser} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 p-1.5 rounded"><Save size={16}/></button>
                            <button onClick={()=>setEditingUser(null)} className="text-slate-500 hover:text-slate-700 bg-slate-100 p-1.5 rounded"><X size={16}/></button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 font-medium text-slate-800">{u.username}</td>
                          <td className="p-3">{u.name}</td>
                          <td className="p-3 text-slate-500 font-mono">{u.password}</td>
                          <td className="p-3 text-center space-x-2">
                            <button onClick={()=>setEditingUser(u)} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-1.5 rounded transition-colors"><Edit2 size={16}/></button>
                            <button onClick={()=>handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded transition-colors"><Trash2 size={16}/></button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col bg-white md:col-span-2">
          <div className="bg-slate-50 p-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">ค่าเดินทางแต่ละจังหวัด</h3>
          </div>
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex gap-2 mb-4">
              <input type="text" placeholder="ชื่อจังหวัด" value={newProv.name} onChange={e=>setNewProv({...newProv, name:e.target.value})} className="border border-slate-200 p-2 rounded-lg text-sm flex-1 shadow-sm focus:ring-blue-500" />
              <input type="number" placeholder="ค่าเดินทาง" value={newProv.travelCost} onChange={e=>setNewProv({...newProv, travelCost:e.target.value})} className="border border-slate-200 p-2 rounded-lg text-sm w-28 shadow-sm focus:ring-blue-500" />
              <button onClick={handleAddProv} className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 shadow-sm flex items-center"><PlusCircle size={18} className="mr-1"/>เพิ่ม</button>
            </div>
            <div className="overflow-y-auto border border-slate-100 rounded-lg flex-1 max-h-[300px]">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 sticky top-0"><tr><th className="p-3 text-left font-semibold">จังหวัด</th><th className="p-3 text-right font-semibold">ค่าเดินทาง</th><th className="p-3 text-center w-24 font-semibold">จัดการ</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {db.provinces.map(p => (
                    <tr key={p.name} className="hover:bg-slate-50 transition-colors">
                      {editingProv?.oldName === p.name ? (
                        <>
                          <td className="p-2"><input className="border border-slate-300 w-full p-1.5 rounded focus:ring-blue-500 text-sm" value={editingProv.name} onChange={e=>setEditingProv({...editingProv, name:e.target.value})} /></td>
                          <td className="p-2"><input type="number" className="border border-slate-300 w-full p-1.5 rounded focus:ring-blue-500 text-sm text-right" value={editingProv.travelCost} onChange={e=>setEditingProv({...editingProv, travelCost:e.target.value})} /></td>
                          <td className="p-2 text-center space-x-1">
                            <button onClick={handleSaveProv} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 p-1.5 rounded"><Save size={16}/></button>
                            <button onClick={()=>setEditingProv(null)} className="text-slate-500 hover:text-slate-700 bg-slate-100 p-1.5 rounded"><X size={16}/></button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 font-medium text-slate-800">{p.name}</td>
                          <td className="p-3 text-right text-slate-600 font-semibold">{p.travelCost}</td>
                          <td className="p-3 text-center space-x-2">
                            <button onClick={()=>setEditingProv({...p, oldName: p.name})} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-1.5 rounded transition-colors"><Edit2 size={16}/></button>
                            <button onClick={()=>handleDeleteProv(p.name)} className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded transition-colors"><Trash2 size={16}/></button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col bg-white md:col-span-2">
          <div className="bg-slate-50 p-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">จัดการ Operation และ พนักงานเซลล์</h3>
          </div>
          <div className="p-5 flex flex-col gap-5">
            <div className="flex gap-2">
              <input type="text" placeholder="เพิ่มชื่อ Operation ใหม่ (เช่น โครงการพิเศษ)" value={newOp.name} onChange={e=>setNewOp({name:e.target.value})} className="border border-slate-200 p-2.5 rounded-lg text-sm flex-1 shadow-sm focus:ring-blue-500" />
              <button onClick={handleAddOp} className="bg-slate-800 text-white px-5 py-2.5 rounded-lg hover:bg-slate-900 shadow-sm flex items-center font-semibold"><PlusCircle size={18} className="mr-2"/>เพิ่ม Operation</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(db.operations || []).map(op => (
                <div key={op.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50 relative hover:shadow-md transition-shadow">
                  <button onClick={() => handleDeleteOp(op.id)} className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg transition-colors"><Trash2 size={18}/></button>
                  <h4 className="font-bold text-indigo-700 mb-4 pr-10 text-lg flex items-center"><LayoutDashboard className="mr-2 w-5 h-5" />{op.name}</h4>
                  
                  <div className="flex gap-2 mb-4">
                    <input type="text" placeholder="พิมพ์ชื่อเซลล์แล้วกดเพิ่ม" value={newSales[op.id] || ''} onChange={e=>setNewSales({...newSales, [op.id]: e.target.value})} className="border border-slate-200 p-2 rounded-lg flex-1 text-sm shadow-sm focus:ring-indigo-500" />
                    <button onClick={() => handleAddSales(op.id)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 shadow-sm font-semibold">เพิ่ม</button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(op.sales || []).length === 0 ? <span className="text-xs text-slate-400 italic">ยังไม่มีรายชื่อพนักงานเซลล์</span> : null}
                    {(op.sales || []).map((s, idx) => (
                      <span key={idx} className="bg-white border border-slate-200 pl-3 pr-1.5 py-1 rounded-full text-xs font-semibold text-slate-700 flex items-center shadow-sm hover:border-slate-300">
                        {s}
                        <button onClick={() => handleDeleteSales(op.id, s)} className="ml-1.5 p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><X size={14}/></button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
const LoginScreen = ({ db, onLogin, showAlert }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const users = db.users || initialDB.users;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      onLogin(user);
    } else {
      showAlert('Username หรือ รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-blue-500/30 shadow-lg">
            <Lock className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">เข้าสู่ระบบ</h1>
          <p className="text-slate-500 mt-2">Supplier Payment System</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-slate-400" size={20} />
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="กรอกชื่อผู้ใช้งาน" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">รหัสผ่าน</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-slate-400" size={20} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="กรอกรหัสผ่าน" />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all hover:-translate-y-0.5 mt-2">
            เข้าสู่ระบบ
          </button>
        </form>
      </div>
    </div>
  );
};

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('entry');
  const [db, setDb] = useState(initialDB);
  const [records, setRecords] = useState([]); 
  const [claimHistory, setClaimHistory] = useState([]);
  const [loggedInUser, setLoggedInUser] = useState(null);
  
  const [viewingHistoryRecord, setViewingHistoryRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null); // สำหรับเก็บ record ที่ต้องการแก้ไข

  const [dialog, setDialog] = useState(null);

  const showAlert = (message) => setDialog({ message, type: 'alert' });
  const showConfirm = (message, onConfirm) => setDialog({ message, type: 'confirm', onConfirm });
  const showPrompt = (message, expectedInput, onConfirm) => setDialog({ message, type: 'prompt', expectedInput, onConfirm });

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenErr) {
            console.warn("Custom token mismatch, falling back to anonymous auth...");
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      if(!u) setIsFirebaseLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    const unsubDb = onSnapshot(doc(firestoreDb, 'artifacts', appId, 'public', 'data', 'appState', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        const cloudDb = docSnap.data();
        if (!cloudDb.users) cloudDb.users = initialDB.users;
        setDb(cloudDb);
      } else {
        setDoc(doc(firestoreDb, 'artifacts', appId, 'public', 'data', 'appState', 'main'), initialDB).catch(console.error);
        setDb(initialDB);
      }
      setIsFirebaseLoading(false);
    }, (error) => {
      console.error(error);
      setIsFirebaseLoading(false);
    });

    const unsubRecords = onSnapshot(collection(firestoreDb, 'artifacts', appId, 'public', 'data', 'records'), (snap) => {
      const recs = [];
      snap.forEach(d => recs.push({ ...d.data(), id: d.id }));
      recs.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(recs);
    }, console.error);

    const unsubHistory = onSnapshot(collection(firestoreDb, 'artifacts', appId, 'public', 'data', 'claimHistory'), (snap) => {
      const hist = [];
      snap.forEach(d => hist.push({ ...d.data(), id: d.id }));
      hist.sort((a, b) => new Date(b.date) - new Date(a.date));
      setClaimHistory(hist);
    }, console.error);

    return () => { unsubDb(); unsubRecords(); unsubHistory(); };
  }, [firebaseUser]);

  const handleSaveRecord = (newRecord) => {
    if (!firebaseUser) return;
    setDoc(doc(firestoreDb, 'artifacts', appId, 'public', 'data', 'records', newRecord.id), newRecord).catch(console.error);
  };

  const handleUpdateRecord = (updatedRecord) => {
    if (!firebaseUser) return;
    setDoc(doc(firestoreDb, 'artifacts', appId, 'public', 'data', 'records', updatedRecord.id), updatedRecord).catch(console.error);
    setEditingRecord(null); // เคลียร์โหมดแก้ไข
  };

  const handleDeleteRecord = (id) => {
    const recToDelete = records.find(r => r.id === id);
    if (!recToDelete) return;

    if (firebaseUser) {
      deleteDoc(doc(firestoreDb, 'artifacts', appId, 'public', 'data', 'records', id)).catch(console.error);
    }

    // ถ้ารายการนี้ถูกเบิกไปแล้ว ให้ยกเลิกใบเบิกนั้นด้วย
    if (recToDelete.isClaimed) {
      // รองรับทั้งโครงสร้างข้อมูลใหม่และเก่าที่บันทึกไปก่อนหน้านี้
      const historiesToCancel = claimHistory.filter(h => {
        if (h.recordIds && h.recordIds.includes(id)) return true;
        if (h.savedState && h.savedState.selectedData && h.savedState.selectedData.some(r => r.id === id)) return true;
        return false;
      });

      historiesToCancel.forEach(h => {
        // ปลดล็อครายการงานอื่นๆ ที่อยู่ในบิลเดียวกันให้กลับมาพร้อมเบิก
        const relatedIds = h.recordIds || (h.savedState?.selectedData?.map(r => r.id)) || [];
        relatedIds.forEach(rId => {
          if (rId !== id) {
            const rec = records.find(r => r.id === rId);
            if (rec) {
              if (firebaseUser) {
                setDoc(doc(firestoreDb, 'artifacts', appId, 'public', 'data', 'records', rId), { ...rec, isClaimed: false }).catch(console.error);
              }
            }
          }
        });
        
        // อัปเดตสถานะบิลเป็น cancelled
        const updatedH = { ...h, status: 'cancelled' };
        if (firebaseUser) {
          setDoc(doc(firestoreDb, 'artifacts', appId, 'public', 'data', 'claimHistory', h.id), updatedH).catch(console.error);
        }
      });
    }
  };

  const handleClaimRecords = (recordIds, claimInfo) => {
    if (!firebaseUser) return;
    recordIds.forEach(id => {
      const rec = records.find(r => r.id === id);
      if (rec) {
        setDoc(doc(firestoreDb, 'artifacts', appId, 'public', 'data', 'records', id), { ...rec, isClaimed: true }).catch(console.error);
      }
    });
    setDoc(doc(firestoreDb, 'artifacts', appId, 'public', 'data', 'claimHistory', claimInfo.id), claimInfo).then(() => {
      showAlert('บันทึกประวัติการเบิกเรียบร้อยแล้ว');
    }).catch(console.error);
  };

  const updateDb = (newDb) => {
    if (!firebaseUser) return;
    setDoc(doc(firestoreDb, 'artifacts', appId, 'public', 'data', 'appState', 'main'), newDb).catch(console.error);
  };

  const openHistoryReport = (savedState) => setViewingHistoryRecord(savedState);
  const closeHistoryReport = () => setViewingHistoryRecord(null);

  const startEditingRecord = (record) => {
    setEditingRecord(record);
    setActiveTab('entry'); // เด้งไปหน้าฟอร์มกรอกข้อมูล
  };

  const cancelEditingRecord = () => {
    setEditingRecord(null);
  };

  const triggerDelete = (id) => {
    showPrompt('ยืนยันการลบรายการนี้?\n(หากเป็นรายการที่เบิกไปแล้ว ใบเบิกจะถูกยกเลิกด้วย)\n\nกรุณาพิมพ์ "confirm" เพื่อยืนยัน:', 'confirm', () => {
      handleDeleteRecord(id);
    });
  };

  const triggerDeleteHistory = (id) => {
    showPrompt('ยืนยันการลบประวัติการเบิกจ่ายนี้?\n(รายการงานในบิลนี้จะกลับไปสถานะ "พร้อมเบิก")\n\nพิมพ์ "confirm" เพื่อยืนยัน:', 'confirm', () => {
      handleDeleteHistory(id);
    });
  };

  const handleDeleteHistory = (id) => {
    const histToDelete = claimHistory.find(h => h.id === id);
    if (!histToDelete) return;

    if (firebaseUser) {
      deleteDoc(doc(firestoreDb, 'artifacts', appId, 'public', 'data', 'claimHistory', id)).catch(console.error);
    }

    // คืนสถานะรายการงานที่ผูกกับบิลนี้ให้เป็น isClaimed: false (เพื่อให้เบิกใหม่ได้)
    const relatedIds = histToDelete.recordIds || (histToDelete.savedState?.selectedData?.map(r => r.id)) || [];
    relatedIds.forEach(rId => {
      const rec = records.find(r => r.id === rId);
      if (rec && rec.isClaimed) {
        if (firebaseUser) {
          setDoc(doc(firestoreDb, 'artifacts', appId, 'public', 'data', 'records', rId), { ...rec, isClaimed: false }).catch(console.error);
        }
      }
    });
  };

  const menuItems = [
    { id: 'entry', label: 'ฟอร์มบันทึกงาน', icon: <PlusCircle size={20} /> },
    { id: 'record-list', label: 'รายการงานที่บันทึก', icon: <List size={20} /> },
    { id: 'report', label: 'สร้างใบขออนุมัติเบิกจ่าย', icon: <FileText size={20} /> },
    { id: 'history', label: 'ประวัติการทำเบิก', icon: <History size={20} /> },
    { id: 'dashboard', label: 'Summary Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'database', label: 'จัดการฐานข้อมูล', icon: <Database size={20} /> },
  ];

  if (isFirebaseLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-700">กำลังเชื่อมต่อระบบคลาวด์...</h2>
        <p className="text-slate-500 mt-2">โปรดรอสักครู่ ระบบกำลังดึงข้อมูลล่าสุดของคุณ</p>
      </div>
    );
  }

  if (!loggedInUser) {
    return (
      <>
        <LoginScreen db={db} onLogin={setLoggedInUser} showAlert={showAlert} />
        <DialogModal dialog={dialog} onClose={() => setDialog(null)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col print:bg-white text-slate-800">
      <nav className="bg-slate-900 text-white shadow-md print:hidden z-20">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-500 p-2 rounded-lg"><Calculator className="w-5 h-5 text-white" /></div>
              <span className="font-bold text-xl tracking-wide">Supplier Pay</span>
              <span className="ml-4 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-full flex items-center shadow-sm">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse"></div> Cloud Sync
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center text-slate-300 text-sm">
                <User size={16} className="mr-1.5" />
                <span>{loggedInUser.name}</span>
              </div>
              <button onClick={() => setLoggedInUser(null)} className="flex items-center text-slate-300 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-sm font-semibold">
                <LogOut size={16} className="mr-1.5" />
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden print:overflow-visible max-w-screen-2xl w-full mx-auto">
        <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 hidden md:block print:hidden overflow-y-auto z-10 shadow-sm relative">
          <div className="p-5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">เมนูหลัก</div>
            <ul className="space-y-1.5">
              {menuItems.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => { setActiveTab(item.id); setViewingHistoryRecord(null); if (item.id !== 'entry') setEditingRecord(null); }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      activeTab === item.id && !viewingHistoryRecord 
                        ? 'bg-blue-600 text-white shadow-md font-semibold transform translate-x-1' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className={`flex-shrink-0 ${activeTab === item.id && !viewingHistoryRecord ? 'text-blue-100' : 'text-slate-400'}`}>{item.icon}</span>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="md:hidden bg-white border-b border-slate-200 flex overflow-x-auto print:hidden z-10 shadow-sm scrollbar-hide">
           {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setViewingHistoryRecord(null); if (item.id !== 'entry') setEditingRecord(null); }}
              className={`flex flex-col items-center flex-shrink-0 px-5 py-3 text-xs gap-1 border-b-2 transition-all ${
                activeTab === item.id && !viewingHistoryRecord 
                  ? 'border-blue-600 text-blue-700 font-bold bg-blue-50' 
                  : 'border-transparent text-slate-500 hover:bg-slate-50'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0 relative">
          {viewingHistoryRecord ? (
            <ReportView db={db} records={records} historyData={viewingHistoryRecord} onCloseHistory={closeHistoryReport} onClaimRecords={handleClaimRecords} />
          ) : (
            <div className="animate-in fade-in duration-300">
              {activeTab === 'entry' && <DataEntry db={db} records={records} onSave={handleSaveRecord} onUpdate={handleUpdateRecord} editingRecord={editingRecord} onCancelEdit={cancelEditingRecord} showAlert={showAlert} showConfirm={showConfirm} />}
              {activeTab === 'record-list' && <RecordListView db={db} records={records} onEdit={startEditingRecord} onDelete={triggerDelete} />}
              {activeTab === 'report' && <ReportView db={db} records={records} onClaimRecords={handleClaimRecords} />}
              {activeTab === 'history' && <HistoryView history={claimHistory} onViewDocument={openHistoryReport} onDeleteHistory={triggerDeleteHistory} />}
              {activeTab === 'dashboard' && <Dashboard records={records} />}
              {activeTab === 'database' && <DatabaseView db={db} setDb={updateDb} showAlert={showAlert} showConfirm={showConfirm} />}
            </div>
          )}
        </main>
      </div>

      {/* Global Custom Dialog Modal */}
      <DialogModal dialog={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}