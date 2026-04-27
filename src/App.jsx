import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Camera, Search, CheckCircle, Truck, Package, History, LogOut, 
  Users, Plus, ArrowRight, Smartphone, Wrench, X, ChevronRight,
  CheckSquare, ClipboardCheck, AlertCircle, Settings as SettingsIcon, Trash2,
  Clock, ChevronDown, ChevronUp, Info, WifiOff, Shield, Key, Edit, Undo2, Save, RefreshCw, Download, ImagePlus, Upload, Battery, Lock, Globe, MessageCircle, Send, DollarSign
} from 'lucide-react';

// --- SUNUCU (API) AYARLARI ---
const isProductionDomain = window.location.hostname.includes('.devoteam.net.tr');
const API_URL = isProductionDomain ? `https://api.devoteam.net.tr` : `${window.location.protocol}//${window.location.hostname}:4001`;
const API_KEY = 'devoteam_secure_api_key_2026';
const STATUS_LABELS = {
  RECEIVED: 'Müşteriden Alındı',
  SENT: 'Servis İşlemleri Başlatıldı',
  RETURNED: 'Servis İşlemi Tamamlandı (Teslim Edilecek)',
  DELIVERED: 'Müşteriye Teslim Edildi'
};

const apiFetch = (url, options = {}) => {
  const headers = {
    ...options.headers,
    'x-api-key': API_KEY,
  };
  return fetch(url, { ...options, headers });
};

// --- YARDIMCI FONKSİYONLAR ---
const calculateRemainingDays = (endDate) => {
  if (!endDate) return 0;
  const end = new Date(endDate);
  const now = new Date();
  // Saati sıfırlayarak sadece gün farkını alalım
  end.setHours(0,0,0,0);
  now.setHours(0,0,0,0);
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

function formatDuration(startDate, endDate) {
  if (!startDate || !endDate) return '-';
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end - start;
  
  if (diffMs < 0) return 'Yeni Eklendi';

  const diffMins = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(diffMins / (60 * 24));
  const hours = Math.floor((diffMins % (60 * 24)) / 60);
  const mins = diffMins % 60;

  let res = [];
  if (days > 0) res.push(`${days}g`);
  if (hours > 0) res.push(`${hours}s`);
  if (mins > 0 || res.length === 0) res.push(`${mins}dk`);
  
  return res.join(' ');
}

function calculateDaysDiff(startDate) {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now - start;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('tr-TR', { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
}

function getEffectiveLastUpdate(ticket) {
  if (ticket.lastUpdate) return ticket.lastUpdate;
  
  const dates = [
    ticket.dateReceived,
    ticket.dateSent,
    ticket.dateReturned,
    ticket.dateDelivered
  ].filter(Boolean).map(d => new Date(d));
  
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates)).toISOString();
}

function getWarrantyUrl(brand, sn) {
  if (!sn) return null;
  const b = (brand || '').toLowerCase();
  const s = sn.trim().toUpperCase();
  
  if (b.includes('lenovo')) return `https://pcsupport.lenovo.com/tr/tr/search?query=${s}`;
  if (b.includes('dell')) return `https://www.dell.com/support/home/tr-tr/product-support/servicetag/${s}/overview`;
  if (b.includes('apple')) return `https://checkcoverage.apple.com/?sn=${s}`;
  if (b.includes('hp')) return `https://support.hp.com/tr-tr/checkwarranty`;
  
  return null;
}

// Görsel Sıkıştırma ve Base64 Dönüştürücü
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
    };
  });
};

function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000); 
    return () => clearInterval(interval);
  }, []);
  return now;
}

const LOGO_URL = "https://upload.wikimedia.org/wikipedia/commons/7/79/Dev_logo_rgb.png";

export default function App() {
  const currentTime = useCurrentTime();

  // 1. Mobilde Zoom Engelleme, Zorunlu Dark Mode ve Native Scroll Beyazlığı Giderme
  useEffect(() => {
    let metaViewport = document.querySelector("meta[name=viewport]");
    if (!metaViewport) {
      metaViewport = document.createElement("meta");
      metaViewport.name = "viewport";
      document.head.appendChild(metaViewport);
    }
    metaViewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0";
    
    document.documentElement.classList.add('dark');
  }, []);

  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const handleHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const isStatusSubdomain = window.location.hostname.startsWith('status.');
  if (hash.startsWith('#/durum') || isStatusSubdomain) {
    return <CustomerStatusView />;
  }

  // Oturum Yönetimi
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('tech_servis_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Sistem Stateleri
  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [brandsModels, setBrandsModels] = useState({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const [serverError, setServerError] = useState(false); 
  const [rootBackdoorEnabled, setRootBackdoorEnabled] = useState(true);

  const [currentView, setCurrentView] = useState(() => sessionStorage.getItem('tech_servis_view') || 'dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState(() => sessionStorage.getItem('tech_servis_ticket') || null);
  const [listFilters, setListFilters] = useState({});

  useEffect(() => {
    sessionStorage.setItem('tech_servis_view', currentView);
    if (selectedTicketId) sessionStorage.setItem('tech_servis_ticket', selectedTicketId);
    else sessionStorage.removeItem('tech_servis_ticket');
  }, [currentView, selectedTicketId]);
  
  const [selectedForBulk, setSelectedForBulk] = useState([]);
  const [isBulkMode, setIsBulkMode] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000); 
  };

  const [actionModal, setActionModal] = useState({ isOpen: false, targetStatus: null, itemIds: [] });
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

  // --- Pull to Refresh Mantığı ---
  const mainRef = useRef(null);
  const startY = useRef(-1);
  const [pullY, setPullY] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullThreshold = 75; // Tetiklenme sınırı

  const fetchTickets = async () => {
    try {
      const res = await apiFetch(`${API_URL}/tickets`);
      if (res.ok) {
        const data = await res.json();
        data.sort((a, b) => new Date(b.dateReceived) - new Date(a.dateReceived));
        setTickets(data);
        setServerError(false);
      }
    } catch (e) {
      setServerError(true);
      console.error("Biletler çekilemedi:", e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await apiFetch(`${API_URL}/settings/global`);
      if (res.ok) {
        const data = await res.json();
        if(data.customers) setCustomers(data.customers);
        if(data.brandsModels) setBrandsModels(data.brandsModels);
        if(data.rootBackdoorEnabled !== undefined) setRootBackdoorEnabled(data.rootBackdoorEnabled);
      }
    } catch (e) { console.error("Ayarlar çekilemedi:", e); }
  };

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchTickets(), fetchSettings()]).then(() => setDataLoaded(true));
    const interval = setInterval(() => {
      if (!isRefreshing && pullY === 0) {
        fetchTickets();
        fetchSettings();
      }
    }, 3000); 
    return () => clearInterval(interval);
  }, [user, isRefreshing, pullY]);

  const handleTouchStart = (e) => {
    if (mainRef.current && mainRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    } else {
      startY.current = -1;
    }
  };

  const handleTouchMove = (e) => {
    if (startY.current > 0 && mainRef.current && mainRef.current.scrollTop <= 0) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      if (diff > 0) {
        const resistance = diff * 0.4;
        
        // Eşiği geçtiğinde titreşim ver (yalnızca 1 kez o an)
        if (pullY < pullThreshold && resistance >= pullThreshold) {
           if (navigator.vibrate) navigator.vibrate(30);
        }
        
        if (resistance < 120) setPullY(resistance);
      }
    }
  };

  const handleTouchEnd = async () => {
    setIsPulling(false);
    if (pullY >= pullThreshold) {
      if (navigator.vibrate) navigator.vibrate(50);
      setIsRefreshing(true);
      setPullY(60); // Yenileme sırasında sabit kalsın
      await Promise.all([fetchTickets(), fetchSettings()]);
      setIsRefreshing(false);
      showToast('Sayfa yenilendi!', 'success');
    }
    setPullY(0);
    startY.current = -1;
  };

  // --- REST API İşlemleri Devamı ---
  const saveLogToDb = async (logData) => {
    try { await apiFetch(`${API_URL}/logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logData) }); } catch (e) {}
  };

  const savePhotoToDb = async (photoData) => {
    try { await apiFetch(`${API_URL}/photos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(photoData) }); } catch (e) {}
  };

  const saveTicketToDb = async (ticket) => {
    const ticketWithTimestamp = { ...ticket, lastUpdate: new Date().toISOString() };
    try { await apiFetch(`${API_URL}/tickets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ticketWithTimestamp) }); fetchTickets(); } catch (e) { showToast('Kayıt sırasında bir hata oluştu!', 'error'); }
  };

  const updateTicketInDb = async (id, updates) => {
    const updatesWithTimestamp = { ...updates, lastUpdate: new Date().toISOString() };
    try { await apiFetch(`${API_URL}/tickets/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatesWithTimestamp) }); fetchTickets(); } catch (e) { showToast('Güncelleme sırasında bir hata oluştu!', 'error'); }
  };

  const handleUpdateTicket = async (id, updates) => {
    await updateTicketInDb(id, updates);
    showToast('Cihaz başarıyla güncellendi!');
  };

  const handleCloseUnfinishedTicket = async (ticketId, closureData) => {
    const deliveryDate = closureData.deliveryDate ? new Date(closureData.deliveryDate).toISOString() : new Date().toISOString();
    const targetTicket = tickets.find(t => String(t.id) === String(ticketId));
    if (!targetTicket) return;

    const updated = {
      ...targetTicket,
      status: 'Müşteriye Teslim Edildi',
      repairType: closureData.repairType,
      serviceNote: closureData.serviceNote,
      dateDelivered: deliveryDate,
      personnelDelivered: user.displayName,
      lastPersonnel: user.displayName,
    };

    if (!updated.dateReturned) {
      updated.dateReturned = deliveryDate;
      updated.personnelReturned = user.displayName;
    }

    await updateTicketInDb(ticketId, updated);
    await saveLogToDb({ ticketId: ticketId, status: 'Müşteriye Teslim Edildi', personnel: user.displayName, timestamp: deliveryDate, repairType: closureData.repairType, serviceNote: closureData.serviceNote });
    showToast('Eski kayıt başarıyla kapatıldı!', 'success');
  };

  const handleDeleteTicketComplete = async (id) => {
    if (window.confirm("Bu cihazı ve tüm geçmiş kayıtlarını/fotoğraflarını tamamen SİLMEK istediğinize emin misiniz? BU İŞLEM GERİ ALINAMAZ!")) {
       try {
           setTickets(prev => prev.filter(t => t.id !== id));
           await apiFetch(`${API_URL}/tickets/${id}`, { method: 'DELETE' });
           const logsRes = await apiFetch(`${API_URL}/logs?ticketId=${id}`);
           if(logsRes.ok) {
               const logs = await logsRes.json();
               logs.forEach(async (l) => apiFetch(`${API_URL}/logs/${l.id}`, { method: 'DELETE' }));
           }
           const photosRes = await apiFetch(`${API_URL}/photos?ticketId=${id}`);
           if(photosRes.ok) {
               const photos = await photosRes.json();
               photos.forEach(async (p) => apiFetch(`${API_URL}/photos/${p.id}`, { method: 'DELETE' }));
           }
           showToast('Cihaz kaydı tamamen silindi.', 'success');
           handleNavigate('list');
       } catch(e) { showToast('Silme işlemi başarısız oldu.', 'error'); }
    }
  };

  const saveSettingsToDb = async (newCustomers, newBrandsModels) => {
    try { await apiFetch(`${API_URL}/settings/global`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'global', customers: newCustomers, brandsModels: newBrandsModels }) }); } catch (e) { showToast('Ayarlar kaydedilirken hata oluştu!', 'error'); }
  };

  const handleUpdateCustomers = (newC) => { setCustomers(newC); saveSettingsToDb(newC, brandsModels); showToast('Müşteri listesi başarıyla güncellendi!'); };
  const handleUpdateBrands = (newB) => { setBrandsModels(newB); saveSettingsToDb(customers, newB); showToast('Marka/Model listesi başarıyla güncellendi!'); };
  const handleLogout = () => { localStorage.removeItem('tech_servis_user'); sessionStorage.removeItem('tech_servis_view'); sessionStorage.removeItem('tech_servis_ticket'); setUser(null); };

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await apiFetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginForm.username, password: loginForm.password })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setUser(data.user);
        localStorage.setItem('tech_servis_user', JSON.stringify(data.user));
      } else {
        setLoginError(data.error || 'Kullanıcı adı veya şifre hatalı!');
      }
    } catch (error) {
      setLoginError('Sunucuya ulaşılamıyor.');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 text-slate-100">
        <div className="bg-slate-900 p-8 rounded-3xl shadow-xl w-full max-w-sm text-center border border-slate-800">
          <img src={LOGO_URL} alt="Logo" className="h-20 md:h-24 mx-auto mb-6 object-contain" />
          <h1 className="text-xl md:text-2xl font-black text-slate-100 mb-2 tracking-[0.1em] uppercase opacity-90">Servis Takip Portalı</h1>
          <p className="text-slate-400 mb-6 font-medium text-sm">Devam etmek için giriş yapın</p>
          {loginError && <div className="bg-red-900/30 text-red-400 text-sm font-bold p-3 rounded-xl mb-4 flex items-center gap-2 border border-red-900/50"><AlertCircle size={18}/> {loginError}</div>}
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Kullanıcı Adı</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input required type="text" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold" placeholder="Kullanıcı Adı" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Şifre</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input required type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold" placeholder="••••••" />
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl transition-all mt-4 flex items-center justify-center gap-2">Giriş Yap <ArrowRight size={18}/></button>
          </form>
        </div>
      </div>
    );
  }

  if (!dataLoaded) {
    return <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-slate-950 font-bold text-slate-400"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>Veriler Sunucudan Yükleniyor...</div>;
  }

  const handleNavigate = (view, ticketId = null, extraParams = {}) => {
    setCurrentView(view);
    setSelectedTicketId(ticketId);
    setListFilters(view === 'list' ? extraParams : {});
    setIsBulkMode(false);
    setSelectedForBulk([]);
  };

  const addTickets = (newTicketsArray, isDirectToService = false) => {
    const now = new Date().toISOString();
    const targetStatus = isDirectToService ? STATUS_LABELS.SENT : STATUS_LABELS.RECEIVED;

    
    newTicketsArray.forEach(async (ticket) => {
      const ticketId = `TKT-${Math.floor(10000 + Math.random() * 90000)}`;
      if (ticket.photos && ticket.photos.length > 0) {
        for (const p of ticket.photos) { await savePhotoToDb({ ticketId: ticketId, url: p.url }); }
      }
      await saveLogToDb({ ticketId: ticketId, status: 'Müşteriden Alındı', personnel: user.displayName, timestamp: now, repairType: null, serviceNote: null });
      if (isDirectToService) {
        await saveLogToDb({ ticketId: ticketId, status: 'Servis İşlemleri Başlatıldı', personnel: user.displayName, timestamp: now, repairType: null, serviceNote: null });
      }

      const ticketData = {
        id: ticketId, serialNumber: ticket.serialNumber, customer: ticket.customer, brand: ticket.brand, model: ticket.model, complaint: ticket.complaint,
        status: targetStatus, dateReceived: now, dateSent: isDirectToService ? now : null, personnel: user.displayName, personnelSent: isDirectToService ? user.displayName : null, lastPersonnel: user.displayName, lastUpdate: now
      };
      saveTicketToDb(ticketData);
    });
    showToast(`${newTicketsArray.length} adet cihaz başarıyla kaydedildi!`);
    handleNavigate('list');
  };

  const processFastReturns = (returnsArray, targetStatus) => {
    const now = new Date().toISOString();
    setTickets(prev => prev.map(t => {
      const match = returnsArray.find(r => String(r.id) === String(t.id));
      if (match) {
        const updated = { ...t, status: targetStatus, repairType: match.repairType, serviceNote: match.serviceNote, lastPersonnel: user.displayName };
        if (targetStatus === STATUS_LABELS.RETURNED) { updated.dateReturned = now; updated.personnelReturned = user.displayName; } 
        else if (targetStatus === 'Müşteriye Teslim Edildi') {
          if (!updated.dateReturned) { updated.dateReturned = now; updated.personnelReturned = user.displayName; }
          updated.dateDelivered = now; updated.personnelDelivered = user.displayName;
        }
        updateTicketInDb(t.id, updated);
        saveLogToDb({ ticketId: match.id, status: targetStatus, personnel: user.displayName, timestamp: now, repairType: match.repairType, serviceNote: match.serviceNote });
        return updated;
      }
      return t;
    }));
    showToast(`${returnsArray.length} adet cihaz başarıyla teslim alındı/edildi!`);
    handleNavigate('list');
  };

  const handleStatusChangeRequest = (targetStatus, itemIds) => {
    if (targetStatus === STATUS_LABELS.RETURNED) {
      setActionModal({ isOpen: true, targetStatus, itemIds });
    } else if (targetStatus === STATUS_LABELS.DELIVERED) {
      setConfirmDialog({
        isOpen: true,
        message: `${itemIds.length} adet cihaz '${targetStatus}' durumuna alınacak. Teslimatı onaylıyor musunuz?`,
        onConfirm: () => { applyStatusUpdate(itemIds, targetStatus, {}); setConfirmDialog({ isOpen: false, message: '', onConfirm: null }); }
      });
    } else {
      setConfirmDialog({
        isOpen: true,
        message: `${itemIds.length} adet cihaz '${targetStatus}' durumuna alınacak. Onaylıyor musunuz?`,
        onConfirm: () => { applyStatusUpdate(itemIds, targetStatus, {}); setConfirmDialog({ isOpen: false, message: '', onConfirm: null }); }
      });
    }
  };

  const applyStatusUpdate = (itemIds, newStatus, extraDataPerId = {}) => {
    const now = new Date().toISOString();
    setTickets(prev => prev.map(t => {
      if (itemIds.includes(String(t.id))) {
        const extra = extraDataPerId[t.id] || {};
        const updated = { ...t, status: newStatus, ...extra, lastPersonnel: user.displayName };
        if (newStatus === STATUS_LABELS.SENT && !t.dateSent) { updated.dateSent = now; updated.personnelSent = user.displayName; }
        if (newStatus === STATUS_LABELS.RETURNED && !t.dateReturned) { updated.dateReturned = now; updated.personnelReturned = user.displayName; }
        if (newStatus === STATUS_LABELS.DELIVERED && !t.dateDelivered) { updated.dateDelivered = now; updated.personnelDelivered = user.displayName; }
        updateTicketInDb(t.id, updated);
        saveLogToDb({ ticketId: t.id, status: newStatus, personnel: user.displayName, timestamp: now, repairType: extra.repairType || null, serviceNote: extra.serviceNote || null });
        return updated;
      }
      return t;
    }));
    setSelectedForBulk([]); setIsBulkMode(false); setActionModal({ isOpen: false, targetStatus: null, itemIds: [] });
    showToast(`${itemIds.length} adet cihazın durumu güncellendi!`);
  };

  const selectedTicket = tickets.find(t => String(t.id) === String(selectedTicketId));

  return (
    <>
      <style>{`
        /* Native pull-to-refresh beyazlığını engellemek için CSS */
        body, html { overscroll-behavior-y: none; background-color: #020617; }
      `}</style>

      {/* Pull To Refresh Overlay */}
      <div 
        className={`fixed top-0 left-0 right-0 flex justify-center z-[150] pointer-events-none transition-transform ${isPulling ? 'duration-0' : 'duration-300'} ease-out`}
        style={{ transform: `translateY(${pullY > 0 ? pullY - 60 : isRefreshing ? 20 : -100}px)` }}
      >
         <div className="bg-slate-800 border border-slate-700 shadow-2xl rounded-full p-2.5 flex items-center justify-center text-slate-200">
           <RefreshCw size={24} className={`${isRefreshing ? 'animate-spin text-blue-400' : 'text-slate-400'} transition-transform duration-300`} style={{ transform: isRefreshing ? 'none' : `rotate(${pullY * 3}deg)` }} />
         </div>
      </div>

      <div className={`min-h-screen flex flex-col md:flex-row pb-16 md:pb-0 relative bg-slate-950 text-slate-100`}>
        
        {serverError && (
          <div className="fixed top-0 left-0 right-0 z-[120] bg-red-600 text-white text-xs md:text-sm font-bold p-2 flex justify-center items-center gap-2 shadow-md">
            <WifiOff size={16} /> Sunucuyla bağlantı koptu veya ulaşılamıyor. Yeniden bağlanılıyor...
          </div>
        )}

        {/* Topbar (Mobile) */}
        <div className="md:hidden bg-slate-900 text-white p-3 flex justify-between items-center shadow-sm z-40 sticky top-0 border-b border-slate-800">
          <div className="flex items-center gap-2 overflow-hidden">
            <img src={LOGO_URL} alt="Logo" className="h-9 max-w-[120px] bg-slate-800 p-1 rounded object-contain flex-shrink-0" />
            <span className="font-sans uppercase tracking-widest text-slate-300 font-bold text-[10px] sm:text-xs">SERVİS TAKİP</span>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0 ml-2">
            <button onClick={() => handleNavigate('settings')} className={`${currentView === 'settings' ? 'text-blue-400' : 'text-slate-400'}`}>
              <SettingsIcon size={20} />
            </button>
            <button onClick={handleLogout} className="text-slate-400"><LogOut size={20} /></button>
          </div>
        </div>

        {/* Sidebar (Desktop) */}
        <div className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-white p-4 h-screen sticky top-0 flex-shrink-0 shadow-sm z-10">
          <div className="flex flex-col items-center justify-center gap-3 mb-8 mt-4 px-2 text-center">
             <div className="bg-slate-800 p-2.5 rounded-xl shadow-inner border border-slate-700 w-full flex items-center justify-center">
               <img src={LOGO_URL} alt="Logo" className="h-14 w-auto object-contain mix-blend-normal" />
             </div>
             <span className="font-sans uppercase tracking-[0.2em] text-slate-400 font-bold text-[11px] mt-1 opacity-80">Servis Takip Portalı</span>
          </div>
          
          <nav className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden pr-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style>{`nav::-webkit-scrollbar { display: none; }`}</style>
            <NavItem icon={<Package size={20} />} label="Panel" active={currentView === 'dashboard'} onClick={() => handleNavigate('dashboard')} />
            <NavItem icon={<Smartphone size={20} />} label="Tüm Cihazlar" active={currentView === 'list'} onClick={() => handleNavigate('list')} />
            <NavItem icon={<Plus size={20} />} label="Hızlı Kabul" active={currentView === 'new'} onClick={() => handleNavigate('new')} />
            <NavItem icon={<ClipboardCheck size={20} />} label="Hızlı Teslim" active={currentView === 'fastReturn'} onClick={() => handleNavigate('fastReturn')} />
            <div className="pt-4 mt-4 border-t border-slate-800">
              <NavItem icon={<SettingsIcon size={20} />} label="Ayarlar" active={currentView === 'settings'} onClick={() => handleNavigate('settings')} />
            </div>
          </nav>
          
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold uppercase text-white shadow-md">{user?.displayName ? user.displayName.charAt(0) : 'U'}</div>
              <div className="text-sm overflow-hidden flex-1">
                <div className="truncate font-bold text-slate-200">{user?.displayName}</div>
                <div className="text-slate-400 text-xs capitalize flex items-center gap-1">
                  {user?.role === 'admin' ? <Shield size={10}/> : <Wrench size={10}/>} {user?.role === 'admin' ? 'Yönetici' : 'Teknisyen'}
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center gap-2 text-slate-400 hover:text-red-400 px-2 py-2 font-bold">
              <LogOut size={18} /> Çıkış Yap
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div 
          ref={mainRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 overflow-y-auto relative"
        >
          {user?.isBackdoor && <RootSetupWizard currentUser={user} onAdminCreated={() => { fetchUsers(); showToast('Root erişimini kapatmak için ayarları kullanabilirsiniz.'); }} onDisableBackdoor={async () => {
             const res = await apiFetch(`${API_URL}/settings/global`);
             const current = await res.json();
             await apiFetch(`${API_URL}/settings/global`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...current, rootBackdoorEnabled: false }) });
             setRootBackdoorEnabled(false);
             handleLogout();
          }} />}
          
          <main className={`p-4 md:p-8 max-w-6xl mx-auto ${serverError ? 'pt-10' : ''}`}>
            {currentView === 'dashboard' && <DashboardView tickets={tickets} onNavigate={handleNavigate} />}
            {currentView === 'settings' && <SettingsView customers={customers} setCustomers={handleUpdateCustomers} brandsModels={brandsModels} setBrandsModels={handleUpdateBrands} currentUser={user} showToast={showToast} tickets={tickets} onUpdateTicket={handleUpdateTicket} rootBackdoorEnabled={rootBackdoorEnabled} onToggleRootBackdoor={async (val) => {
               const res = await apiFetch(`${API_URL}/settings/global`);
               const current = await res.json();
               await apiFetch(`${API_URL}/settings/global`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...current, rootBackdoorEnabled: val }) });
               setRootBackdoorEnabled(val);
               showToast(`Root erişimi ${val ? 'aktif edildi' : 'kapatıldı'}.`);
            }} />}
            {currentView === 'list' && <TicketListView tickets={tickets} onNavigate={handleNavigate} isBulkMode={isBulkMode} setIsBulkMode={setIsBulkMode} selectedForBulk={selectedForBulk} setSelectedForBulk={setSelectedForBulk} onStatusChangeRequest={handleStatusChangeRequest} customers={customers} brandsModels={brandsModels} listFilters={listFilters} currentTime={currentTime} showToast={showToast} />}
            {currentView === 'new' && <NewTicketView allTickets={tickets} onSave={addTickets} user={user} onCancel={() => handleNavigate('list')} customers={customers} brandsModels={brandsModels} currentTime={currentTime} showToast={showToast} onCloseUnfinishedTicket={handleCloseUnfinishedTicket} />}
            {currentView === 'fastReturn' && <FastReturnView availableTickets={tickets.filter(t => t.status === 'Servis İşlemleri Başlatıldı' || t.status === 'Müşteriden Alındı')} onSave={processFastReturns} onCancel={() => handleNavigate('list')} customers={customers} showToast={showToast} />}
            {currentView === 'detail' && selectedTicket && <TicketDetailView ticket={selectedTicket} allTickets={tickets} onStatusChangeRequest={handleStatusChangeRequest} onBack={() => handleNavigate('list')} currentTime={currentTime} user={user} customers={customers} brandsModels={brandsModels} onUpdateTicket={handleUpdateTicket} onDeleteTicket={handleDeleteTicketComplete} showToast={showToast} />}
          </main>
        </div>

        {/* Bottom Nav (Mobile) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-4 py-3 flex justify-between items-center z-40 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
          <MobileNavItem icon={<Package size={22} />} label="Panel" active={currentView === 'dashboard'} onClick={() => handleNavigate('dashboard')} />
          <MobileNavItem icon={<Smartphone size={22} />} label="Cihazlar" active={currentView === 'list'} onClick={() => handleNavigate('list')} />
          <MobileNavItem icon={<ClipboardCheck size={22} />} label="Teslim" active={currentView === 'fastReturn'} onClick={() => handleNavigate('fastReturn')} />
          <button 
            onClick={() => handleNavigate('new')}
            className="bg-blue-600 text-white p-3 rounded-full -mt-10 shadow-lg border-4 border-slate-950 hover:bg-blue-700"
          >
            <Plus size={24} />
          </button>
        </div>

        {actionModal.isOpen && <ActionModal targetStatus={actionModal.targetStatus} itemIds={actionModal.itemIds} tickets={tickets} onClose={() => setActionModal({ isOpen: false, targetStatus: null, itemIds: [] })} onSubmit={applyStatusUpdate} />}
        {confirmDialog.isOpen && <ConfirmModal message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })} />}
        
        {/* Toast Notification (Z-index 200, sağ üstte) */}
        {toast.show && (
          <div className={`fixed top-4 right-4 md:top-6 md:right-6 z-[200] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white font-bold animate-in slide-in-from-top-5 fade-in duration-300 max-w-sm ${toast.type === 'success' ? 'bg-green-700' : 'bg-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
            <span className="text-sm leading-tight">{toast.message}</span>
          </div>
        )}

      </div>
    </>
  );
}

// --- SUB-COMPONENTS ---
function SettingsView({ customers, setCustomers, brandsModels, setBrandsModels, currentUser, showToast, tickets, onUpdateTicket, rootBackdoorEnabled, onToggleRootBackdoor }) {
  const [newCustomer, setNewCustomer] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [selectedBrand, setSelectedBrand] = useState(Object.keys(brandsModels)[0] || '');

  const [isBulkWarrantyChecking, setIsBulkWarrantyChecking] = useState(false);
  const [bulkWarrantyStatus, setBulkWarrantyStatus] = useState({ total: 0, checked: 0, found: 0 });
  const [notFoundSerials, setNotFoundSerials] = useState([]);

  const handleBulkWarrantyCheck = async (forceAll = false) => {
    let lenovoTickets = (tickets || []).filter(t => t.brand && t.brand.toLowerCase() === 'lenovo');
    if (!forceAll) {
      lenovoTickets = lenovoTickets.filter(t => !t.warrantyInfo || !t.warrantyInfo.checkedAt);
    }

    if(lenovoTickets.length === 0) {
      showToast(forceAll ? 'Sistemde hiç Lenovo cihaz bulunamadı!' : 'Kontrol edilecek (garantisi çekilmemiş) Lenovo cihaz bulunamadı!', 'info');
      return;
    }
    
    if(!window.confirm(`${lenovoTickets.length} adet Lenovo cihaz için garanti durumu sorgulanacak. Devam edilsin mi?`)) return;
    
    setIsBulkWarrantyChecking(true);
    setBulkWarrantyStatus({ total: lenovoTickets.length, checked: 0, found: 0 });
    setNotFoundSerials([]);
    
    let checkedCount = 0;
    let foundCount = 0;
    const missing = [];
    
    for (const ticket of lenovoTickets) {
      try {
          const res = await apiFetch(`${API_URL}/warranty/lenovo/${ticket.serialNumber}`);
          if (res.ok) {
              const data = await res.json();
              if (data.success && data.warranty?.isInWarranty !== undefined) {
                  foundCount++;
                  if(onUpdateTicket) onUpdateTicket(ticket.id, { warrantyInfo: data.warranty });
              } else {
                  missing.push(ticket.serialNumber);
              }
          } else {
            missing.push(ticket.serialNumber);
          }
      } catch(e) {
          missing.push(ticket.serialNumber);
      }
      checkedCount++;
      setBulkWarrantyStatus({ total: lenovoTickets.length, checked: checkedCount, found: foundCount });
    }
    
    setNotFoundSerials(missing);
    setIsBulkWarrantyChecking(false);
    showToast(`Sorgulama tamamlandı. ${foundCount} cihaz bulundu.`);
  };

  const isAdmin = currentUser?.role === 'admin';
  const canManageCustomers = isAdmin || currentUser?.permissions?.canManageCustomers;
  const canManageBrands = isAdmin || currentUser?.permissions?.canManageBrands;

  const [dbUsers, setDbUsers] = useState([]);
  const [userModalInfo, setUserModalInfo] = useState({ isOpen: false, mode: 'add', data: null });

  useEffect(() => {
    if (currentUser?.role === 'admin') fetchUsers();
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const res = await apiFetch(`${API_URL}/users`);
      if (res.ok) setDbUsers(await res.json());
    } catch (e) {}
  };

  const handleSaveUser = async (formData, mode) => {
    try {
      if (mode === 'add') {
        const res = await apiFetch(`${API_URL}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
        if (!res.ok) {
            const err = await res.json();
            showToast(err.error || 'Kullanıcı eklenemedi!', 'error');
            return;
        }
        showToast('Yeni kullanıcı başarıyla eklendi!');
      } else {
        await apiFetch(`${API_URL}/users/${formData.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
        showToast('Kullanıcı başarıyla güncellendi!');
      }
      fetchUsers();
      setUserModalInfo({ isOpen: false, mode: 'add', data: null });
    } catch (e) { showToast('İşlem sırasında hata oluştu!', 'error'); }
  };

  const handleDownloadBackup = async () => {
    try {
      showToast('Yedek hazırlanıyor...', 'info');
      const res = await apiFetch(`${API_URL}/system/backup`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devoteam-db-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('Yedek başarıyla indirildi!');
      } else {
        showToast('Yedek indirme başarısız oldu!', 'error');
      }
    } catch(e) { showToast('Bağlantı hatası.', 'error'); }
  };

  const handleRestoreBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if(!window.confirm('Veritabanını bu yedek dosyası ile güncellemek istediğinize emin misiniz? Var olan veriler ezilebilir!')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const res = await apiFetch(`${API_URL}/system/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json)
        });
        if (res.ok) {
          showToast('Yedek başarıyla yüklendi! Lütfen sayfayı yenileyin.', 'success');
        } else {
          showToast('Yedeği yüklerken hata oluştu!', 'error');
        }
      } catch (err) {
        showToast('Geçersiz JSON dosyası!', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteUser = async (id, username) => {
    if (window.confirm(`'${username}' adlı kullanıcıyı silmek istediğinize emin misiniz?`)) {
      try {
        await apiFetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
        fetchUsers();
        showToast('Kullanıcı başarıyla silindi!');
      } catch (e) { showToast('Kullanıcı silinirken hata oluştu!', 'error'); }
    }
  };

  const handleAddCustomer = (e) => {
    e.preventDefault();
    if (!newCustomer.trim()) return;
    if (!customers.includes(newCustomer.trim())) {
      const newC = [...customers, newCustomer.trim()];
      setCustomers(newC);
      saveSettingsToDb(newC, brandsModels);
      showToast('Müşteri listesi güncellendi!');
    }
    setNewCustomer('');
  };
  
  const handleRemoveCustomer = (c) => {
    if(window.confirm(`'${c}' müşterisini silmek istediğinize emin misiniz?`)) {
      const newC = customers.filter(item => item !== c);
      setCustomers(newC);
      saveSettingsToDb(newC, brandsModels);
      showToast('Müşteri silindi!');
    }
  };

  const handleAddBrand = (e) => {
    e.preventDefault();
    if (!newBrand.trim()) return;
    if (!brandsModels[newBrand.trim()]) {
      const updated = { ...brandsModels, [newBrand.trim()]: [] };
      setBrandsModels(updated);
      setSelectedBrand(newBrand.trim());
      saveSettingsToDb(customers, updated);
      showToast('Marka eklendi!');
    }
    setNewBrand('');
  };

  const handleRemoveBrand = (b) => {
    if(window.confirm(`'${b}' markasını ve tüm modellerini silmek istediğinize emin misiniz?`)) {
      const updated = { ...brandsModels };
      delete updated[b];
      setBrandsModels(updated);
      if (selectedBrand === b) setSelectedBrand(Object.keys(updated)[0] || '');
      saveSettingsToDb(customers, updated);
      showToast('Marka silindi!');
    }
  };

  const handleAddModel = (e) => {
    e.preventDefault();
    if (!newModel.trim() || !selectedBrand) return;
    if (!brandsModels[selectedBrand].includes(newModel.trim())) {
      const updated = { ...brandsModels, [selectedBrand]: [...brandsModels[selectedBrand], newModel.trim()] };
      setBrandsModels(updated);
      saveSettingsToDb(customers, updated);
      showToast('Model eklendi!');
    }
    setNewModel('');
  };

  const handleRemoveModel = (m) => {
    const updated = { ...brandsModels, [selectedBrand]: brandsModels[selectedBrand].filter(item => item !== m) };
    setBrandsModels(updated);
    saveSettingsToDb(customers, updated);
    showToast('Model silindi!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <h2 className="text-2xl font-black text-white mb-6">Sistem Ayarları</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-5 md:p-6 relative">
          {!canManageCustomers && <div className="absolute top-4 right-4 text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-1 rounded-md">Sadece Görüntüleme</div>}
          <h3 className="font-bold text-white border-b border-slate-800 pb-3 mb-4 flex items-center gap-2"><Users size={18}/> Müşteri Listesi</h3>
          {canManageCustomers && (
            <form onSubmit={handleAddCustomer} className="flex gap-2 mb-4">
              <input type="text" value={newCustomer} onChange={(e) => setNewCustomer(e.target.value)} placeholder="Yeni Müşteri Adı" className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-white" />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-sm">Ekle</button>
            </form>
          )}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {customers.map((c, idx) => (
              <div key={idx} className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                <span className="text-sm font-medium text-slate-200">{c}</span>
                {canManageCustomers && <button onClick={() => handleRemoveCustomer(c)} className="text-red-400 hover:text-red-600 bg-slate-800 shadow-sm border border-slate-700 rounded-lg p-1.5"><Trash2 size={16} /></button>}
              </div>
            ))}
            {customers.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Kayıtlı müşteri yok.</p>}
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-5 md:p-6 relative">
          {!canManageBrands && <div className="absolute top-4 right-4 text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-1 rounded-md">Sadece Görüntüleme</div>}
          <h3 className="font-bold text-white border-b border-slate-800 pb-3 mb-4 flex items-center gap-2"><Smartphone size={18}/> Marka ve Modeller</h3>
          {canManageBrands && (
            <form onSubmit={handleAddBrand} className="flex gap-2 mb-4">
              <input type="text" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="Yeni Marka Adı" className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-white" />
              <button type="submit" className="bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-600 shadow-sm">Marka Ekle</button>
            </form>
          )}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-end mb-4 gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 mb-1">Marka Seçin</label>
                <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-white">{Object.keys(brandsModels).map(b => <option key={b} value={b}>{b}</option>)}</select>
              </div>
              {selectedBrand && canManageBrands && <button onClick={() => handleRemoveBrand(selectedBrand)} className="text-red-500 hover:text-red-700 bg-slate-800 border border-red-900/50 p-2 rounded-xl mb-0.5 shadow-sm"><Trash2 size={18} /></button>}
            </div>
            {selectedBrand && (
              <>
                {canManageBrands && (
                  <form onSubmit={handleAddModel} className="flex gap-2 mb-4 pt-4 border-t border-slate-700">
                    <input type="text" value={newModel} onChange={(e) => setNewModel(e.target.value)} placeholder={`${selectedBrand} İçin Yeni Model`} className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-white" />
                    <button type="submit" className="bg-blue-900/30 text-blue-400 border border-blue-800 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-600 hover:text-white">Ekle</button>
                  </form>
                )}
                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1 mt-3 border-t border-slate-700 pt-3">
                  {brandsModels[selectedBrand]?.map((m, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-900 p-2.5 rounded-lg border border-slate-800 shadow-sm">
                      <span className="text-sm font-medium text-slate-200">{m}</span>
                      {canManageBrands && <button onClick={() => handleRemoveModel(m)} className="text-slate-500 hover:text-red-500 bg-slate-800 border border-slate-700 rounded-md p-1"><X size={16} /></button>}
                    </div>
                  ))}
                  {(!brandsModels[selectedBrand] || brandsModels[selectedBrand].length === 0) && <p className="text-xs text-slate-400 center py-2 font-medium">Bu markaya ait model bulunmuyor.</p>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {currentUser?.role === 'admin' && (
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-5 md:p-6 mt-6">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
            <h3 className="font-bold text-white flex items-center gap-2"><Shield size={18} className="text-blue-400"/> Sistem Kullanıcıları</h3>
            <button onClick={() => setUserModalInfo({ isOpen: true, mode: 'add', data: null })} className="bg-blue-900/30 hover:bg-blue-600 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"><Plus size={14}/> Yeni Ekle</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider rounded-lg">
                <tr><th className="px-4 py-3 rounded-tl-lg">Kullanıcı Adı</th><th className="px-4 py-3">Görünür İsim</th><th className="px-4 py-3">Yetki</th><th className="px-4 py-3 text-right rounded-tr-lg">İşlemler</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {dbUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-mono text-slate-300">{u.username}</td>
                    <td className="px-4 py-3 font-bold text-white">{u.displayName}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-md text-[10px] font-bold ${u.role === 'admin' ? 'bg-purple-900/30 text-purple-400' : 'bg-slate-700 text-slate-300'}`}>{u.role === 'admin' ? 'YÖNETİCİ' : 'TEKNİSYEN'}</span></td>
                    <td className="px-4 py-3 text-right">
                      {u.username !== 'root' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setUserModalInfo({ isOpen: true, mode: 'edit', data: u })} className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-900/30"><Edit size={16} /></button>
                          <button onClick={() => handleDeleteUser(u.id, u.username)} className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-900/30"><Trash2 size={16} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentUser?.role === 'admin' && (
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-5 md:p-6 mt-6">
          <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest border-b border-slate-800 pb-3 flex items-center gap-2"><SettingsIcon size={18}/> Sistem Veri Yönetimi</h3>
          
          <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 mb-4 flex flex-col md:flex-row justify-between gap-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500 transition-all group-hover:w-2"></div>
            <div className="flex-1">
               <div className="font-bold text-white mb-1 flex items-center gap-2">Toplu Garanti Sorgulama <span className="text-[10px] bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full">Lenovo</span></div>
               <div className="text-xs text-slate-400 mb-3">Sistemdeki cihazların garantisini otomatik sorgular ve eksik olanları kaydeder.</div>
               
               {isBulkWarrantyChecking && (
                 <div className="space-y-2 mt-2 mr-4">
                   <div className="flex justify-between text-xs font-bold text-slate-400">
                     <span>İşleniyor: {bulkWarrantyStatus.checked} / {bulkWarrantyStatus.total}</span>
                     <span className="text-green-400">Bulunan: {bulkWarrantyStatus.found}</span>
                   </div>
                   <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                     <div className="bg-green-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${(bulkWarrantyStatus.checked / (bulkWarrantyStatus.total || 1)) * 100}%` }}></div>
                   </div>
                 </div>
               )}

               {!isBulkWarrantyChecking && notFoundSerials.length > 0 && (
                 <div className="mt-3 p-3 bg-red-900/10 border border-red-900/30 rounded-lg mr-4">
                   <p className="text-[10px] text-red-400 font-bold mb-1 uppercase tracking-wider">Bulunamayan Seri Numaraları:</p>
                   <p className="text-[11px] font-mono text-slate-400 break-all">{notFoundSerials.join(', ')}</p>
                 </div>
               )}
            </div>
            <div className="flex flex-col sm:flex-row items-center md:items-start gap-2">
              <button onClick={() => handleBulkWarrantyCheck(false)} disabled={isBulkWarrantyChecking} title="Sadece garantisi henüz sorgulanmamış olan cihazları kontrol eder" className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 whitespace-nowrap"><RefreshCw size={14} className={isBulkWarrantyChecking ? "animate-spin" : ""} /> Yenileri Kontrol Et</button>
              <button onClick={() => handleBulkWarrantyCheck(true)} disabled={isBulkWarrantyChecking} title="Sistemdeki tüm Lenovo cihazların garantisini en baştan çekerek günceller" className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 whitespace-nowrap"><RefreshCw size={14} className={isBulkWarrantyChecking ? "animate-spin" : ""} /> Tümünü Tekrar Kontrol Et</button>
            </div>
          </div>

          <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 transition-all group-hover:w-2"></div>
            <div>
               <div className="font-bold text-white mb-1">Veritabanı Yedeğini İndir</div>
               <div className="text-xs text-slate-400">Sunucudaki tüm kayıtları, ayarları ve logları tek bir JSON dosyası olarak indirir.</div>
            </div>
            <button onClick={handleDownloadBackup} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all"><Download size={16}/> Yedek İndir</button>
          </div>

          <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-600 transition-all group-hover:w-2"></div>
            <div>
               <div className="font-bold text-orange-400 mb-1">Veritabanını Yedekten Dön</div>
               <div className="text-xs text-slate-400">İndirilen JSON yedeğini yükleyerek sunucudaki kayıtları günceller/üzerine yazar.</div>
            </div>
            <label className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all">
               <Upload size={16}/> JSON Yükle
               <input type="file" accept=".json" className="hidden" onChange={handleRestoreBackup} />
            </label>
          </div>

          {isAdmin && !currentUser.isBackdoor && (
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden group">
              <div className={`absolute top-0 left-0 w-1.5 h-full transition-all group-hover:w-2 ${rootBackdoorEnabled ? 'bg-red-600' : 'bg-slate-600'}`}></div>
              <div>
                <div className="font-bold text-white mb-1 flex items-center gap-2">Root Arka Kapısı (Backdoor) {rootBackdoorEnabled ? <span className="text-[10px] bg-red-900/50 text-red-400 px-2 py-0.5 rounded-full">RİSKLİ</span> : <span className="text-[10px] bg-green-900/50 text-green-400 px-2 py-0.5 rounded-full">GÜVENLİ</span>}</div>
                <div className="text-xs text-slate-400">root/1234 girişiyle sisteme her zaman erişilmesini sağlar. Güvenliğiniz için kapalı tutmanız önerilir.</div>
              </div>
              <button 
                onClick={() => onToggleRootBackdoor(!rootBackdoorEnabled)} 
                className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all ${rootBackdoorEnabled ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
              >
                {rootBackdoorEnabled ? 'Erişimi Kapat' : 'Erişimi Etkinleştir'}
              </button>
            </div>
          )}
        </div>
      )}

      {userModalInfo.isOpen && <UserModal mode={userModalInfo.mode} initialData={userModalInfo.data} onClose={() => setUserModalInfo({ isOpen: false, mode: 'add', data: null })} onSubmit={handleSaveUser} />}
    </div>
  );
}

function UserModal({ mode, initialData, onClose, onSubmit }) {
  const [formData, setFormData] = useState(initialData || { username: '', password: '', displayName: '', role: 'tech', permissions: { canManageCustomers: false, canManageBrands: false, canDeleteTickets: false } });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('perm_')) {
      setFormData({ ...formData, permissions: { ...formData.permissions, [name.replace('perm_', '')]: checked } });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 overflow-hidden border border-slate-800">
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
          <div>
            <h3 className="font-black text-xl text-white">{mode === 'add' ? 'Yeni Kullanıcı Ekle' : 'Kullanıcıyı Düzenle'}</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">Sisteme erişimi olacak teknisyen/yönetici ayarları.</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-500 hover:bg-slate-700 border border-slate-700"><X size={20} /></button>
        </div>

        <form onSubmit={e => { e.preventDefault(); onSubmit(formData, mode); }} className="p-6 space-y-4">
          <div><label className="block text-xs font-bold text-slate-400 mb-1">Kullanıcı Adı</label><input required type="text" name="username" value={formData.username} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-medium" /></div>
          <div><label className="block text-xs font-bold text-slate-400 mb-1">Şifre</label><input required type="text" name="password" value={formData.password} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-medium" /></div>
          <div><label className="block text-xs font-bold text-slate-400 mb-1">Görünür İsim</label><input required type="text" name="displayName" value={formData.displayName} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-medium" /></div>
          <div><label className="block text-xs font-bold text-slate-400 mb-1">Sistem Yetkisi</label><select name="role" value={formData.role} onChange={handleChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none font-bold bg-slate-950 text-slate-100"><option value="tech">Teknisyen</option><option value="admin">Sistem Yöneticisi</option></select></div>
          {formData.role === 'tech' && (
            <div className="mt-4 p-4 bg-blue-900/20 rounded-xl border border-blue-900/50 space-y-3">
              <span className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Özel İzinler (Teknisyen)</span>
              <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" name="perm_canManageCustomers" checked={formData.permissions.canManageCustomers || false} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded cursor-pointer" /><span className="text-sm font-bold text-slate-300">Müşteri Ekleyebilir / Silebilir</span></label>
              <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" name="perm_canManageBrands" checked={formData.permissions.canManageBrands || false} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded cursor-pointer" /><span className="text-sm font-bold text-slate-300">Marka ve Model Ekleyebilir / Silebilir</span></label>
              <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" name="perm_canDeleteTickets" checked={formData.permissions.canDeleteTickets || false} onChange={handleChange} className="w-4 h-4 text-red-600 rounded cursor-pointer" /><span className="text-sm font-bold text-red-400">Kayıt Silebilir (Tamamen)</span></label>
            </div>
          )}
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold">İptal</button>
            <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-black shadow-md">Kaydet</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 border border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400"><AlertCircle size={28} /></div>
          <h3 className="font-black text-xl text-white">İşlem Onayı</h3>
        </div>
        <p className="text-slate-300 mb-6 font-medium leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-5 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold">İptal Et</button>
          <button onClick={onConfirm} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-black shadow-md">Onayla</button>
        </div>
      </div>
    </div>
  );
}

function FirmMismatchModal({ sn, oldFirm, newFirm, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
       <div className="bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-slate-800">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-12 h-12 rounded-full bg-orange-900/30 flex items-center justify-center text-orange-400"><AlertCircle size={28} /></div>
             <h3 className="font-black text-xl text-white">Firma Değişikliği Uyarı</h3>
          </div>
          <p className="text-slate-300 mb-2 font-medium leading-relaxed">
             <strong className="text-white font-mono">{sn}</strong> seri numaralı cihaz daha önce <strong className="text-white">'{oldFirm}'</strong> firmasına kaydedilmiş.
          </p>
          <p className="text-slate-400 text-sm mb-6">
             Şu anda bu cihazı <strong className="text-white">'{newFirm}'</strong> firmasına kaydetmek üzeresiniz. İşleme devam etmek istiyor musunuz?
          </p>
          <div className="flex justify-end gap-3">
             <button onClick={onCancel} className="px-5 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition-colors">İptal Et</button>
             <button onClick={onConfirm} className="px-6 py-3 bg-orange-600 hover:bg-orange-700 rounded-xl text-white font-black shadow-md transition-colors flex items-center gap-2"><CheckCircle size={18}/> Yine de Kaydet</button>
          </div>
       </div>
    </div>
  );
}

function ActionModal({ targetStatus, itemIds, tickets, onClose, onSubmit }) {
  const items = tickets.filter(t => itemIds.includes(String(t.id)));
  const [formData, setFormData] = useState(() => {
    const initial = {};
    items.forEach(item => { initial[item.id] = { repairType: 'Garantili', serviceNote: '' }; });
    return initial;
  });

  const handleChange = (id, field, value) => setFormData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[150] flex items-end md:items-center justify-center">
      <div className="bg-slate-900 w-full max-w-2xl md:rounded-3xl rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-0 md:zoom-in-95 border border-transparent border-slate-800">
        <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-950 md:rounded-t-3xl rounded-t-3xl">
          <div><h3 className="font-black text-xl text-white">{targetStatus === STATUS_LABELS.RETURNED ? 'Servisten Teslim Alma' : 'Durum Güncelleme'}</h3><p className="text-xs text-slate-400 font-medium mt-1">{items.length} adet cihaz işaretlenecek.</p></div>
          <button onClick={onClose} className="p-2 bg-slate-900 rounded-full text-slate-500 hover:bg-slate-800 border border-slate-700 shadow-sm"><X size={20} /></button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-4 bg-slate-950/50">
          {items.map((item, index) => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <div className="flex justify-between items-start mb-4 border-b border-slate-800 pb-3">
                <div><div className="font-bold text-white text-sm">{index + 1}. {item.brand} {item.model}</div><div className="text-xs font-mono text-slate-400 mt-1">SN: {item.serialNumber} | Müşteri: <span className="font-semibold text-slate-300">{item.customer}</span></div></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-400 mb-1">Onarım Tipi</label><select value={formData[item.id].repairType} onChange={(e) => handleChange(item.id, 'repairType', e.target.value)} className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium"><option value="Garantili">Garantili</option><option value="Ücretli">Ücretli</option><option value="İşlem Yapılmadı">İşlem Yapılmadı</option></select></div>
                <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-400 mb-1">Servis / Onarım Notu</label><input type="text" value={formData[item.id].serviceNote} onChange={(e) => handleChange(item.id, 'serviceNote', e.target.value)} className="w-full text-sm py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-950 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium" placeholder="Yapılan işlem..." /></div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3 pb-8 md:pb-4 md:rounded-b-3xl">
          <button onClick={onClose} className="px-5 py-3 rounded-xl text-slate-300 font-bold bg-slate-800 hover:bg-slate-700">İptal</button>
          <button onClick={() => onSubmit(itemIds, targetStatus, formData)} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-700 shadow-md flex items-center gap-2"><CheckCircle size={20} /> Kaydet</button>
        </div>
      </div>
    </div>
  );
}

function ExportModal({ isOpen, onClose, onExport }) {
  const allStatuses = ['Müşteriden Alındı', 'Servis İşlemleri Başlatıldı', 'Servis İşlemi Tamamlandı (Teslim Edilecek)', 'Müşteriye Teslim Edildi'];
  const [selectedStatuses, setSelectedStatuses] = useState(allStatuses);

  if (!isOpen) return null;

  const handleToggle = (status) => setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
  const handleToggleAll = () => setSelectedStatuses(selectedStatuses.length === allStatuses.length ? [] : allStatuses);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 overflow-hidden border border-slate-800">
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
          <div><h3 className="font-black text-xl text-white">Kayıtları Dışa Aktar</h3></div>
          <button onClick={onClose} className="p-2 bg-slate-900 rounded-full text-slate-500 hover:bg-slate-800 border border-slate-700"><X size={20} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onExport(selectedStatuses); }} className="p-6 space-y-4">
          <div className="space-y-3">
            <button type="button" onClick={handleToggleAll} className="text-xs font-bold text-blue-400 bg-blue-900/30 px-3 py-1.5 rounded-lg hover:bg-blue-900/50 mb-2">
              {selectedStatuses.length === allStatuses.length ? 'Tüm Seçimleri Temizle' : 'Tümünü Seç'}
            </button>
            {allStatuses.map(status => (
              <label key={status} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-800/50 border border-transparent">
                <input type="checkbox" checked={selectedStatuses.includes(status)} onChange={() => handleToggle(status)} className="w-5 h-5 text-blue-600 rounded border-slate-700 focus:ring-blue-500 cursor-pointer" />
                <span className="text-sm font-bold text-slate-300">{status}</span>
              </label>
            ))}
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold">İptal</button>
            <button type="submit" disabled={selectedStatuses.length === 0} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-black shadow-md disabled:opacity-50 flex items-center gap-2"><Download size={18} /> İndir</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-105' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
      {icon}<span>{label}</span>
    </button>
  );
}

function MobileNavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 w-16 transition-all ${active ? 'text-blue-400 scale-110' : 'text-slate-400'}`}>
      {icon}<span className="text-[10px] font-black">{label}</span>
    </button>
  );
}

function DashboardView({ tickets, onNavigate }) {
  const stats = useMemo(() => ({
    received: tickets.filter(t => t.status === 'Müşteriden Alındı').length,
    inService: tickets.filter(t => t.status === 'Servis İşlemleri Başlatıldı').length,
    returned: tickets.filter(t => t.status === 'Servis İşlemi Tamamlandı (Teslim Edilecek)').length,
    delivered: tickets.filter(t => t.status === 'Müşteriye Teslim Edildi').length,
  }), [tickets]);

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h2 className="text-xl md:text-2xl font-black text-white mb-4">Hızlı İşlemler</h2>
        <div className="grid grid-cols-3 gap-3 md:gap-6">
          <button onClick={() => onNavigate('new')} className="bg-blue-600 hover:bg-blue-700 text-white p-4 md:p-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all hover:-translate-y-1"><Plus size={32} /><span className="text-xs md:text-sm font-black text-center uppercase tracking-wide">Hızlı Kabul</span></button>
          <button onClick={() => onNavigate('fastReturn')} className="bg-green-600 hover:bg-green-700 text-white p-4 md:p-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all hover:-translate-y-1"><ClipboardCheck size={32} /><span className="text-xs md:text-sm font-black text-center uppercase tracking-wide">Hızlı Teslim</span></button>
          <button onClick={() => onNavigate('list', null, { filterStatus: 'Aktifler' })} className="bg-slate-800 hover:bg-slate-700 text-white p-4 md:p-6 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all hover:-translate-y-1"><Smartphone size={32} /><span className="text-xs md:text-sm font-black text-center uppercase tracking-wide">Tüm Cihazlar</span></button>
        </div>
      </div>
      <div>
        <h2 className="text-xl md:text-2xl font-black text-white mb-4">Genel Bakış Filtreleri</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Package className="text-orange-500" />} title="Kabul Edilen" count={stats.received} border="border-slate-800" onClick={() => onNavigate('list', null, { filterStatus: 'Müşteriden Alındı' })} />
          <StatCard icon={<Truck className="text-blue-500" />} title="Servisteki" count={stats.inService} border="border-slate-800" onClick={() => onNavigate('list', null, { filterStatus: 'Servis İşlemleri Başlatıldı' })} />
          <StatCard icon={<CheckCircle className="text-green-500" />} title="Teslim Bekleyen" count={stats.returned} border="border-slate-800" onClick={() => onNavigate('list', null, { filterStatus: 'Servis İşlemi Tamamlandı (Teslim Edilecek)' })} />
          <StatCard icon={<Users className="text-slate-400" />} title="Tamamlanan" count={stats.delivered} border="border-slate-800" onClick={() => onNavigate('list', null, { filterStatus: 'Müşteriye Teslim Edildi' })} />
        </div>
      </div>
      <div className="bg-slate-900 p-5 md:p-6 rounded-3xl shadow-sm border border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-white">Son İşlemler</h3>
          <button onClick={() => onNavigate('list')} className="text-blue-400 text-sm font-bold bg-blue-900/30 px-4 py-2 rounded-xl hover:bg-blue-900/50">Tümünü Gör</button>
        </div>
        <div className="space-y-3">
          {tickets.slice(0, 5).map(ticket => (
            <div key={ticket.id} onClick={() => onNavigate('detail', String(ticket.id))} className="flex items-center justify-between p-4 hover:bg-slate-800 rounded-2xl cursor-pointer border border-slate-700">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 hidden sm:flex rounded-full bg-slate-950 items-center justify-center text-slate-400 flex-shrink-0"><Smartphone size={20} /></div>
                <div>
                  <div className="font-bold text-slate-100 text-sm md:text-base">{ticket.brand} {ticket.model}</div>
                  <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{ticket.customer} | SN: <span className="font-mono">{ticket.serialNumber}</span></div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end flex-shrink-0">
                <StatusBadge status={ticket.status} />
                <div className="text-[10px] sm:text-xs text-slate-400 mt-1.5 font-medium">{formatDateTime(ticket.dateReceived)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, count, border, onClick }) {
  return (
    <div onClick={onClick} className={`bg-slate-900 p-5 rounded-3xl border ${border} shadow-sm cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group`}>
      <div className="w-12 h-12 rounded-full bg-slate-950 flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">{icon}</div>
      <div className="text-4xl font-black text-white mb-1">{count}</div>
      <div className="text-xs md:text-sm font-bold text-slate-400 leading-tight">{title}</div>
    </div>
  );
}

function TicketListView({ tickets, onNavigate, isBulkMode, setIsBulkMode, selectedForBulk, setSelectedForBulk, onStatusChangeRequest, customers, brandsModels, listFilters, currentTime, showToast }) {
  const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('list_searchTerm') || '');
  const [filterStatus, setFilterStatus] = useState(() => listFilters.filterStatus || sessionStorage.getItem('list_filterStatus') || 'Aktifler'); 
  const [filterCustomer, setFilterCustomer] = useState(() => sessionStorage.getItem('list_filterCustomer') || 'Tümü');
  const [filterBrand, setFilterBrand] = useState(() => sessionStorage.getItem('list_filterBrand') || 'Tümü');
  const [sortBy, setSortBy] = useState(() => sessionStorage.getItem('list_sortBy') || 'date_desc'); 
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('list_searchTerm', searchTerm);
    sessionStorage.setItem('list_filterStatus', filterStatus);
    sessionStorage.setItem('list_filterCustomer', filterCustomer);
    sessionStorage.setItem('list_filterBrand', filterBrand);
    sessionStorage.setItem('list_sortBy', sortBy);
  }, [searchTerm, filterStatus, filterCustomer, filterBrand, sortBy]);

  useEffect(() => { if (listFilters.filterStatus) setFilterStatus(listFilters.filterStatus); }, [listFilters]);

  const filteredTickets = useMemo(() => {
    let result = tickets.filter(t => {
      const matchSearch = t.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) || t.brand.toLowerCase().includes(searchTerm.toLowerCase()) || t.customer.toLowerCase().includes(searchTerm.toLowerCase()) || t.model.toLowerCase().includes(searchTerm.toLowerCase());
      let matchStatus = filterStatus === 'Aktifler' ? t.status !== 'Müşteriye Teslim Edildi' : filterStatus === 'Tümü' ? true : t.status === filterStatus;
      const matchCustomer = filterCustomer === 'Tümü' || t.customer === filterCustomer;
      const matchBrand = filterBrand === 'Tümü' || t.brand === filterBrand;
      return matchSearch && matchStatus && matchCustomer && matchBrand;
    });

    result.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.dateReceived) - new Date(a.dateReceived);
      if (sortBy === 'date_asc') return new Date(a.dateReceived) - new Date(b.dateReceived);
      
      const getDuration = (t) => {
        const end = t.status === 'Müşteriye Teslim Edildi' && t.dateDelivered ? new Date(t.dateDelivered) : currentTime;
        return end - new Date(t.dateReceived);
      };
      
      if (sortBy === 'duration_desc') return getDuration(b) - getDuration(a);
      if (sortBy === 'duration_asc') return getDuration(a) - getDuration(b);
      
      if (sortBy === 'last_update_desc') {
        const dateA = new Date(getEffectiveLastUpdate(a) || a.dateReceived);
        const dateB = new Date(getEffectiveLastUpdate(b) || b.dateReceived);
        return dateB - dateA;
      }
      
      return 0;
    });

    return result;
  }, [tickets, searchTerm, filterStatus, filterCustomer, filterBrand, sortBy, currentTime]);

  const toggleSelection = (id) => setSelectedForBulk(selectedForBulk.includes(id) ? selectedForBulk.filter(item => item !== id) : [...selectedForBulk, id]);
  const selectAll = () => setSelectedForBulk(selectedForBulk.length === filteredTickets.length ? [] : filteredTickets.map(t => String(t.id)));

  const handleExport = (selectedStatuses) => {
    const itemsToExport = tickets.filter(t => selectedStatuses.includes(t.status));
    if (itemsToExport.length === 0) { showToast('Dışa aktarılacak cihaz bulunamadı.', 'error'); return; }
    const headers = ['Kayıt ID', 'Seri No', 'Müşteri', 'Marka', 'Model', 'Durum', 'Kabul Tarihi', 'Teslim Tarihi', 'Şikayet', 'Onarım Tipi', 'Servis Notu', 'Garanti Bitiş', 'Pil Garanti Bitiş', 'Son İşlem Yapan'];
    const csvRows = [headers.join(',')];
    itemsToExport.forEach(t => {
      let wEnd = '', bEnd = '';
      if(t.warrantyInfo) {
          wEnd = t.warrantyInfo.endDate ? formatDateTime(t.warrantyInfo.endDate).split(' ')[0] : '';
          const allW = [...(t.warrantyInfo.upgradedWarranties || []), ...(t.warrantyInfo.baseWarranties || [])];
          const bW = allW.find(w => w.category === 'Battery' || (w.name && w.name.toLowerCase().includes('battery')));
          if(bW) bEnd = bW.endDate ? formatDateTime(bW.endDate).split(' ')[0] : '';
      }
      csvRows.push([t.id, t.serialNumber, `"${t.customer}"`, `"${t.brand}"`, `"${t.model}"`, `"${t.status}"`, t.dateReceived ? `"${formatDateTime(t.dateReceived)}"` : '', t.dateDelivered ? `"${formatDateTime(t.dateDelivered)}"` : '', `"${(t.complaint || '').replace(/"/g, '""')}"`, `"${t.repairType || ''}"`, `"${(t.serviceNote || '').replace(/"/g, '""')}"`, `"${wEnd}"`, `"${bEnd}"`, `"${t.lastPersonnel || t.personnel || ''}"`].join(','));
    });
    const blob = new Blob(["\uFEFF" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url); link.setAttribute("download", `cihaz_listesi_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    setIsExportModalOpen(false); showToast(`${itemsToExport.length} cihaz dışa aktarıldı!`, 'success');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-black text-white">Cihaz Listesi</h2>
          <div className="text-xs sm:text-sm font-bold text-blue-400 bg-blue-900/30 px-3 py-1.5 rounded-xl inline-block mt-2 shadow-sm">{filteredTickets.length} Cihaz Listeleniyor</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
          <div className="relative w-full sm:flex-1 md:w-96 lg:w-[450px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Ara (Seri No, Müşteri...)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm font-medium bg-slate-900 text-white transition-all" />
          </div>
          <button onClick={() => setIsExportModalOpen(true)} className="py-3 px-4 rounded-2xl text-sm font-bold transition-all shadow-sm bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center gap-2"><Download size={18} /> <span className="hidden sm:inline">Dışa Aktar</span></button>
          <button onClick={() => { setIsBulkMode(!isBulkMode); if(isBulkMode) setSelectedForBulk([]); }} className={`py-3 px-5 rounded-2xl text-sm font-bold transition-all shadow-sm ${isBulkMode ? 'bg-slate-700 text-white shadow-md scale-105' : 'bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800'}`}>{isBulkMode ? 'Seçimi İptal Et' : 'Toplu İşlem'}</button>
        </div>
      </div>

      <div className="w-full bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-800 flex flex-wrap gap-3 items-center mb-6">
        <span className="text-xs font-black text-slate-400 uppercase tracking-wider w-full sm:w-auto">Filtre & Sırala:</span>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-700 outline-none text-sm font-bold bg-slate-950 text-slate-200 focus:ring-2 focus:ring-blue-500 transition-colors">
          <option value="Aktifler">Sadece Aktif Cihazlar</option>
          <option value="Tümü">Tüm Geçmiş</option>
          <option value={STATUS_LABELS.RECEIVED}>Müşteriden Alınanlar</option>
          <option value={STATUS_LABELS.SENT}>Serviste Olanlar</option>
          <option value={STATUS_LABELS.RETURNED}>Teslim Bekleyenler</option>
          <option value={STATUS_LABELS.DELIVERED}>Teslim Edilenler</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-700 outline-none text-sm font-bold bg-slate-950 text-slate-200 focus:ring-2 focus:ring-blue-500 transition-colors">
          <option value="date_desc">Kabul Tarihi (Yeniden Eskiye)</option>
          <option value="date_asc">Kabul Tarihi (Eskiden Yeniye)</option>
          <option value="last_update_desc">Son İşlem Tarihi (Yeniden Eskiye)</option>
          <option value="duration_desc">İşlem Süresi (En Uzun)</option>
          <option value="duration_asc">İşlem Süresi (En Kısa)</option>
        </select>
        {customers && <select value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-700 outline-none text-sm font-bold bg-slate-950 text-slate-200 focus:ring-2 focus:ring-blue-500 transition-colors"><option value="Tümü">Tüm Müşteriler</option>{customers.map(c => <option key={c} value={c}>{c}</option>)}</select>}
        {brandsModels && <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-700 outline-none text-sm font-bold bg-slate-950 text-slate-200 focus:ring-2 focus:ring-blue-500 transition-colors"><option value="Tümü">Tüm Markalar</option>{Object.keys(brandsModels).map(b => <option key={b} value={b}>{b}</option>)}</select>}
      </div>

      {isBulkMode && (
        <div className="bg-blue-900/20 border border-blue-800/50 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 shadow-sm">
          <div className="flex items-center gap-4 w-full sm:w-auto"><button onClick={selectAll} className="text-xs bg-slate-800 border border-blue-700 text-blue-400 px-4 py-2.5 rounded-xl font-bold shadow-sm transition-colors">Tümünü Seç</button><span className="font-black text-blue-400 text-sm">{selectedForBulk.length} Cihaz Seçili</span></div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button disabled={selectedForBulk.length === 0} onClick={() => onStatusChangeRequest(STATUS_LABELS.SENT, selectedForBulk)} className="flex-1 sm:flex-none text-xs bg-orange-500 text-white px-5 py-3 rounded-xl shadow-md font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              <Truck size={16}/> Servise Gönder
            </button>
            <button disabled={selectedForBulk.length === 0} onClick={() => onStatusChangeRequest(STATUS_LABELS.RETURNED, selectedForBulk)} className="flex-1 sm:flex-none text-xs bg-blue-600 text-white px-5 py-3 rounded-xl shadow-md font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              <CheckCircle size={16}/> Servisten Al
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-900 rounded-3xl shadow-sm border border-slate-800 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
              <tr>{isBulkMode && <th className="px-5 py-4 w-10"></th>}<th className="px-5 py-4">Müşteri & Cihaz</th><th className="px-5 py-4">Seri No</th><th className="px-5 py-4">Durum & Süre</th><th className="px-5 py-4">Kabul Tarihi</th><th className="px-5 py-4 text-right"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTickets.map(ticket => {
                const historyCount = tickets.filter(t => t.serialNumber === ticket.serialNumber).length;
                let wStr = null;
                let bStr = null;
                if(ticket.warrantyInfo) {
                   wStr = ticket.warrantyInfo.isInWarranty ? `Garantili (${ticket.warrantyInfo.remainingDays}G)` : 'Gar. Dışı';
                   const allW = [...(ticket.warrantyInfo.upgradedWarranties || []), ...(ticket.warrantyInfo.baseWarranties || [])];
                   const bW = allW.find(w => w.category === 'Battery' || (w.name && w.name.toLowerCase().includes('battery')));
                   if(bW && bW.remainingDays > 0) bStr = `Pil (${bW.remainingDays}G)`;
                }
                return (
                  <tr key={ticket.id} className={`hover:bg-slate-800/50 transition-colors ${selectedForBulk.includes(String(ticket.id)) ? 'bg-blue-900/20' : ''}`}>
                    {isBulkMode && <td className="px-5 py-4"><input type="checkbox" className="w-5 h-5 cursor-pointer" checked={selectedForBulk.includes(String(ticket.id))} onChange={() => toggleSelection(String(ticket.id))} /></td>}
                    <td className="px-5 py-4"><div className="font-bold text-white text-base">{ticket.customer}</div><div className="text-xs text-slate-400 font-medium mt-0.5">{ticket.brand} {ticket.model}</div></td>
                    <td className="px-5 py-4"><div className="flex flex-col items-start gap-1 font-mono text-slate-300 font-medium">
                      <div className="flex items-center gap-2">{ticket.serialNumber}{historyCount > 1 && <span className="bg-red-900/30 text-red-400 border border-red-800 text-[10px] px-1.5 py-0.5 rounded-md font-black" title={`Toplam ${historyCount} kez geldi.`}>{historyCount} Kayıt</span>}</div>
                      {wStr && <div className="flex gap-1 mt-1"><span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${ticket.warrantyInfo.isInWarranty ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{wStr}</span>{bStr && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400">{bStr}</span>}</div>}
                    </div></td>
                    <td className="px-5 py-4"><div className="flex flex-col items-start gap-2"><StatusBadge status={ticket.status} /><div className={`text-[11px] flex items-center gap-1 font-bold px-2 py-1 rounded-lg ${ticket.status === 'Müşteriye Teslim Edildi' ? 'bg-slate-800 text-slate-400' : 'bg-orange-900/30 text-orange-400 border border-orange-800'}`}><Clock size={12} className={ticket.status !== 'Müşteriye Teslim Edildi' ? "animate-pulse" : ""}/> {ticket.status === 'Müşteriye Teslim Edildi' ? 'Biten: ' : 'Devam: '} {ticket.status === 'Müşteriye Teslim Edildi' ? formatDuration(ticket.dateReceived, ticket.dateDelivered) : formatDuration(ticket.dateReceived, currentTime.toISOString())}</div></div></td>
                    <td className="px-5 py-4">
                      <div className="text-slate-300 font-medium mb-1">{formatDateTime(ticket.dateReceived)}</div>
                      <div className="text-[10px] text-slate-500 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 italic"><Clock size={10} /> {formatDateTime(getEffectiveLastUpdate(ticket))}</div>
                        <div>Son İşlem: <span className="font-bold text-slate-300">{ticket.lastPersonnel || ticket.personnel || 'Bilinmiyor'}</span></div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right"><button onClick={() => onNavigate('detail', String(ticket.id))} className="text-blue-400 font-black hover:bg-blue-900/30 px-4 py-2 rounded-xl flex items-center justify-end gap-1 ml-auto transition-colors">Detay <ChevronRight size={18}/></button></td>
                  </tr>
                );
              })}
              {filteredTickets.length === 0 && (<tr><td colSpan="6" className="px-5 py-16 text-center text-slate-500 font-bold text-lg">Cihaz bulunamadı.</td></tr>)}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-slate-800">
          {filteredTickets.map(ticket => {
            const historyCount = tickets.filter(t => t.serialNumber === ticket.serialNumber).length;
            let wStr = null;
            let bStr = null;
            if(ticket.warrantyInfo) {
               wStr = ticket.warrantyInfo.isInWarranty ? `Garantili (${ticket.warrantyInfo.remainingDays}G)` : 'Gar. Dışı';
               const allW = [...(ticket.warrantyInfo.upgradedWarranties || []), ...(ticket.warrantyInfo.baseWarranties || [])];
               const bW = allW.find(w => w.category === 'Battery' || (w.name && w.name.toLowerCase().includes('battery')));
               if(bW && bW.remainingDays > 0) bStr = `Pil (${bW.remainingDays}G)`;
            }
            return (
              <div key={ticket.id} onClick={() => isBulkMode ? toggleSelection(String(ticket.id)) : onNavigate('detail', String(ticket.id))} className={`p-5 flex gap-4 cursor-pointer transition-colors ${selectedForBulk.includes(String(ticket.id)) ? 'bg-blue-900/20' : 'hover:bg-slate-800/50'}`}>
                {isBulkMode && <div className="flex items-center justify-center pt-2"><div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center shadow-sm ${selectedForBulk.includes(String(ticket.id)) ? 'bg-blue-600 border-blue-600' : 'bg-slate-800 border-slate-600'}`}>{selectedForBulk.includes(String(ticket.id)) && <CheckSquare size={18} className="text-white" />}</div></div>}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2"><div className="font-black text-white text-[16px]">{ticket.customer}</div><span className="text-[10px] font-mono bg-slate-800 px-2 py-1 rounded-md text-slate-400 font-bold">{ticket.id}</span></div>
                  <div className="text-[13px] text-slate-300 mb-3 font-medium flex items-center flex-wrap gap-1.5">{ticket.brand} {ticket.model} <span className="text-slate-500 font-mono">({ticket.serialNumber})</span>{historyCount > 1 && <span className="bg-red-900/30 text-red-400 border border-red-800 text-[9px] px-1.5 py-0.5 rounded-md font-black">{historyCount} Kayıt</span>}
                  {wStr && <div className="flex gap-1 ml-1"><span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${ticket.warrantyInfo.isInWarranty ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{wStr}</span>{bStr && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400">{bStr}</span>}</div>}
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <div className="flex flex-col gap-2 items-start">
                      <StatusBadge status={ticket.status} repairType={ticket.repairType} />
                      <div className={`text-[10px] flex items-center gap-1 font-bold px-2 py-1 rounded-lg ${ticket.status === 'Müşteriye Teslim Edildi' ? 'bg-slate-800 text-slate-400' : 'bg-orange-900/30 text-orange-400 border border-orange-800'}`}>
                        <Clock size={12} className={ticket.status !== 'Müşteriye Teslim Edildi' ? "animate-pulse" : ""}/> {ticket.status === 'Müşteriye Teslim Edildi' ? formatDuration(ticket.dateReceived, ticket.dateDelivered) : formatDuration(ticket.dateReceived, currentTime.toISOString())}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 mt-2 sm:mt-0">
                      <span className="text-[11px] text-slate-500 font-bold">{formatDateTime(ticket.dateReceived)}</span>
                      <div className="flex flex-col items-end">
                        <div className="text-[9px] text-blue-400 font-bold flex items-center gap-1"><History size={10}/> {formatDateTime(getEffectiveLastUpdate(ticket))}</div>
                        <span className="text-[9px] text-slate-500">Son: <span className="font-bold text-slate-300">{ticket.lastPersonnel || ticket.personnel || 'Bilinmiyor'}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredTickets.length === 0 && (<div className="p-12 text-center text-slate-500 font-bold">Cihaz bulunamadı.</div>)}
        </div>
      </div>
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} onExport={handleExport} />
    </div>
  );
}

function NewTicketView({ allTickets, onSave, user, onCancel, customers, brandsModels, currentTime, showToast, onCloseUnfinishedTicket }) {
  const [pendingTickets, setPendingTickets] = useState([]);
  const [historyModalInfo, setHistoryModalInfo] = useState(null);
  const [unfinishedTicket, setUnfinishedTicket] = useState(null);
  const [firmMismatch, setFirmMismatch] = useState(null); 

  const defaultCustomer = customers && customers.length > 0 ? customers[0] : '';
  const defaultBrand = brandsModels && Object.keys(brandsModels).length > 0 ? Object.keys(brandsModels)[0] : '';
  const defaultModel = defaultBrand && brandsModels[defaultBrand] && brandsModels[defaultBrand].length > 0 ? brandsModels[defaultBrand][0] : '';
  const [formData, setFormData] = useState({ serialNumber: '', customer: defaultCustomer, brand: defaultBrand, model: defaultModel, complaint: '' });
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    if (!customers.includes(formData.customer)) setFormData(prev => ({ ...prev, customer: customers[0] || '' }));
    if (!Object.keys(brandsModels).includes(formData.brand)) {
      const firstBrand = Object.keys(brandsModels)[0] || '';
      const firstModel = firstBrand ? (brandsModels[firstBrand][0] || '') : '';
      setFormData(prev => ({ ...prev, brand: firstBrand, model: firstModel }));
    }
  }, [customers, brandsModels]);

  const removePendingTicket = (indexToRemove) => {
    setPendingTickets(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'brand') {
      const firstModel = brandsModels[value] && brandsModels[value].length > 0 ? brandsModels[value][0] : '';
      setFormData({ ...formData, brand: value, model: firstModel });
    } else { 
      if (name === 'serialNumber') value = value.toUpperCase(); 
      setFormData({ ...formData, [name]: value }); 
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const compressedPhotos = [];
    for (let i = 0; i < files.length; i++) {
       const base64 = await compressImage(files[i]);
       compressedPhotos.push({ url: base64 });
    }
    setPhotos([...photos, ...compressedPhotos]);
    showToast(`${files.length} fotoğraf eklendi.`, 'success');
  };

  const finalizeAdd = (sn) => {
    const newItem = { ...formData, serialNumber: sn, status: 'Müşteriden Alındı', dateReceived: new Date().toISOString(), dateSent: null, dateReturned: null, dateDelivered: null, personnel: user?.displayName || 'Bilinmeyen', lastPersonnel: user?.displayName || 'Bilinmeyen', repairType: null, serviceNote: null, photos: photos };
    setPendingTickets([newItem, ...pendingTickets]);
    setFormData({ ...formData, serialNumber: '', complaint: '' }); 
    setPhotos([]); 
  };

  const checkFirmAndFinalize = (sn) => {
    const existingTickets = allTickets.filter(t => t.serialNumber === sn);
    if (existingTickets.length > 0) {
        const latest = existingTickets.sort((a,b) => new Date(b.dateReceived) - new Date(a.dateReceived))[0];
        if (latest.customer !== formData.customer) {
            setFirmMismatch({ sn: sn, oldFirm: latest.customer, newFirm: formData.customer });
            return;
        }
    }
    finalizeAdd(sn);
  };

  const handleAddToList = (e) => {
    e.preventDefault();
    const sn = formData.serialNumber.trim().toUpperCase();
    
    if (!sn) { showToast("Lütfen cihazın seri numarasını girin.", "error"); return; }
    if (!formData.customer || !formData.brand || !formData.model) { showToast("Eksik bilgi!", "error"); return; }
    
    const isDuplicate = pendingTickets.some(t => t.serialNumber === sn);
    if (isDuplicate) {
        showToast("Bu cihaz numarası (SN) listeye zaten eklendi!", "error");
        return;
    }

    const existingTickets = allTickets.filter(t => t.serialNumber === sn);
    const activeTicket = existingTickets.find(t => t.status !== 'Müşteriye Teslim Edildi');
    
    if (activeTicket) {
        setUnfinishedTicket(activeTicket);
    } else {
        checkFirmAndFinalize(sn);
    }
  };

  const handleSubmitAll = (isDirectToService) => {
    if (pendingTickets.length === 0) { showToast("Kaydedilecek cihaz yok.", "error"); return; }
    onSave(pendingTickets, isDirectToService);
  };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onCancel} className="p-3 bg-slate-900 shadow-md border border-slate-800 hover:bg-slate-800 rounded-full transition-all"><ArrowRight size={24} className="rotate-180 text-slate-300" /></button>
        <div><h2 className="text-2xl md:text-3xl font-black text-white">Çoklu Cihaz Kabulü</h2><p className="text-sm text-slate-400 font-medium mt-1">Müşteriden alınan cihazları hızlıca sisteme işleyin.</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <form onSubmit={handleAddToList} className="bg-slate-900 rounded-3xl shadow-sm border border-slate-800 p-6 md:p-8 space-y-5 sticky top-20 transition-colors">
            <h3 className="font-black text-xl text-white border-b border-slate-800 pb-4 mb-2">Yeni Cihaz Bilgileri</h3>
            
            <div><label className="block text-sm font-black text-slate-400 mb-2">Müşteri</label><select name="customer" value={formData.customer} onChange={handleChange} className="w-full px-4 py-3.5 rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 outline-none font-bold shadow-sm transition-all">{customers.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-black text-slate-400 mb-2">Marka</label><select name="brand" value={formData.brand} onChange={handleChange} className="w-full px-4 py-3.5 rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 outline-none font-bold shadow-sm">{Object.keys(brandsModels).map(b => <option key={b} value={b}>{b}</option>)}</select></div>
              <div><label className="block text-sm font-black text-slate-400 mb-2">Model</label><select name="model" value={formData.model} onChange={handleChange} className="w-full px-4 py-3.5 rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 outline-none font-bold shadow-sm">{formData.brand && brandsModels[formData.brand] ? brandsModels[formData.brand].map(m => <option key={m} value={m}>{m}</option>) : <option value="" disabled>Model yok</option>}</select></div>
            </div>
            <div><label className="block text-sm font-black text-slate-400 mb-2">Seri Numarası *</label><input required type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} className="w-full px-4 py-3.5 rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 outline-none uppercase font-mono font-black shadow-sm" placeholder="SN-12345" /></div>
            <div><label className="block text-sm font-black text-slate-400 mb-2 flex justify-between"><span>Şikayet / Not</span><span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">Opsiyonel</span></label><textarea name="complaint" value={formData.complaint} onChange={handleChange} rows="2" className="w-full px-4 py-3.5 rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 outline-none font-medium shadow-sm" placeholder="Varsa şikayeti detaylı yazın..."></textarea></div>

            <div>
              <label className="block text-sm font-black text-slate-400 mb-2">Fotoğraflar</label>
              <div className="flex flex-wrap gap-3">
                 {photos.map((photo, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-700 shadow-sm group">
                       <img src={photo.url} className="w-full h-full object-cover" />
                       <button type="button" onClick={() => setPhotos(photos.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"><X size={12}/></button>
                    </div>
                 ))}
                 <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 cursor-pointer bg-slate-950">
                   <ImagePlus size={24} /><span className="text-[10px] font-bold mt-1">Ekle</span><input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                 </label>
              </div>
            </div>

            <button type="submit" className="w-full mt-4 px-4 py-4 rounded-2xl bg-blue-900/30 text-blue-400 border-2 border-blue-800 font-black hover:bg-blue-600 hover:text-white transition-all flex justify-center items-center gap-2 shadow-sm"><Plus size={24} /> Listeye Ekle</button>
          </form>
        </div>

        <div className="flex flex-col h-full">
          <div className="bg-slate-900 rounded-3xl shadow-lg border border-slate-800 flex-1 flex flex-col overflow-hidden transition-colors">
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
              <h3 className="font-black text-lg text-white">Eklenecek Cihazlar</h3>
              <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">{pendingTickets.length} Cihaz</span>
            </div>
            <div className="p-5 flex-1 overflow-y-auto space-y-4 bg-slate-950/50 min-h-[300px]">
              {pendingTickets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10"><Package size={64} className="mb-4 opacity-20" /><p className="text-lg font-black">Liste henüz boş.</p></div>
              ) : (
                pendingTickets.map((ticket, idx) => {
                  const hasHistory = allTickets.some(t => t.serialNumber === ticket.serialNumber);
                  return (
                    <div key={idx} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex gap-4 relative group">
                      <div className="w-12 h-12 rounded-2xl bg-blue-900/30 text-blue-400 flex items-center justify-center shadow-inner"><Smartphone size={24} /></div>
                      <div className="flex-1 pr-14">
                        <div className="font-black text-white text-base flex items-center gap-3">
                          {ticket.customer}
                          {hasHistory && <button type="button" onClick={() => setHistoryModalInfo(ticket.serialNumber)} className="text-red-400 bg-red-900/30 p-1.5 rounded-full shadow-sm animate-bounce"><AlertCircle size={18} strokeWidth={2.5}/></button>}
                        </div>
                        <div className="text-sm font-medium text-slate-300 mt-1">{ticket.brand} {ticket.model} <span className="font-mono text-slate-500 ml-1">({ticket.serialNumber})</span></div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {ticket.complaint && <div className="text-xs text-slate-300 bg-slate-800 p-2.5 rounded-xl border border-slate-700 font-medium">Not: {ticket.complaint}</div>}
                            {ticket.photos && ticket.photos.length > 0 && <div className="text-xs text-blue-400 bg-blue-900/30 p-2.5 rounded-xl font-bold flex items-center gap-1"><Camera size={14}/> {ticket.photos.length} Fot.</div>}
                        </div>
                      </div>
                      <button type="button" onClick={() => removePendingTicket(idx)} className="p-2.5 text-red-400 hover:bg-red-900/30 hover:text-red-600 rounded-xl absolute right-3 top-3 opacity-100 md:opacity-0 group-hover:opacity-100"><X size={20} strokeWidth={3} /></button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900 grid grid-cols-2 gap-3 rounded-b-3xl">
              <button type="button" onClick={() => handleSubmitAll(false)} disabled={pendingTickets.length === 0} className="w-full px-2 sm:px-6 py-4 rounded-xl sm:rounded-2xl bg-slate-600 text-white font-bold hover:bg-slate-500 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 text-sm"><Package size={20} className="sm:hidden" /><span className="hidden sm:inline"><Package size={20} /></span>Müşteriden Al</button>
              <button type="button" onClick={() => handleSubmitAll(true)} disabled={pendingTickets.length === 0} className="w-full px-2 sm:px-6 py-4 rounded-xl sm:rounded-2xl bg-orange-600 text-white font-bold hover:bg-orange-500 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 text-sm"><Truck size={20} className="sm:hidden" /><span className="hidden sm:inline"><Truck size={20} /></span>Direkt Servise</button>
            </div>
          </div>
        </div>
      </div>
      
      {unfinishedTicket && (
        <UnfinishedTicketModal 
          ticket={unfinishedTicket} 
          onClose={() => setUnfinishedTicket(null)} 
          onSubmit={async (ticketId, closureData) => {
            await onCloseUnfinishedTicket(ticketId, closureData);
            setUnfinishedTicket(null);
            checkFirmAndFinalize(formData.serialNumber.trim().toUpperCase());
          }} 
        />
      )}

      {firmMismatch && (
        <FirmMismatchModal 
           sn={firmMismatch.sn} 
           oldFirm={firmMismatch.oldFirm} 
           newFirm={firmMismatch.newFirm} 
           onCancel={() => setFirmMismatch(null)} 
           onConfirm={() => {
              finalizeAdd(firmMismatch.sn);
              setFirmMismatch(null);
           }} 
        />
      )}

      {historyModalInfo && <DeviceHistoryModal serialNumber={historyModalInfo} allTickets={allTickets} onClose={() => setHistoryModalInfo(null)} currentTime={currentTime} />}
    </div>
  );
}

function FastReturnView({ availableTickets, onSave, onCancel, customers, showToast }) {
  const [pendingReturns, setPendingReturns] = useState([]);
  const [snInput, setSnInput] = useState('');
  const [formData, setFormData] = useState({ repairType: 'Garantili', serviceNote: '' });
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isGlobalSearch, setIsGlobalSearch] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(customers && customers.length > 0 ? customers[0] : '');

  const filteredAvailableTickets = useMemo(() => isGlobalSearch ? availableTickets : availableTickets.filter(t => t.customer === selectedCustomer), [availableTickets, isGlobalSearch, selectedCustomer]);

  useEffect(() => {
    function handleClickOutside(event) { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsDropdownOpen(false); }
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedTicket = useMemo(() => {
    if (!snInput.trim()) return null;
    return filteredAvailableTickets.find(t => t.serialNumber.toLowerCase() === snInput.toLowerCase() && !pendingReturns.some(pr => String(pr.id) === String(t.id)));
  }, [snInput, filteredAvailableTickets, pendingReturns]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!selectedTicket) { 
      showToast('Geçerli bir Seri No girmediniz veya cihaz zaten listede.', 'error'); 
      return; 
    }
    setPendingReturns([{ ...selectedTicket, repairType: formData.repairType, serviceNote: formData.serviceNote }, ...pendingReturns]);
    setSnInput(''); setFormData({ repairType: 'Garantili', serviceNote: '' }); setIsDropdownOpen(false);
  };

  const handleSubmit = (targetStatus) => { if (pendingReturns.length === 0) return; onSave(pendingReturns, targetStatus); };

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onCancel} className="p-3 bg-slate-900 shadow-md border border-slate-800 hover:bg-slate-800 rounded-full transition-all"><ArrowRight size={24} className="rotate-180 text-slate-300" /></button>
        <div><h2 className="text-2xl md:text-3xl font-black text-white">Hızlı Teslim</h2><p className="text-sm text-slate-400 font-medium mt-1">Servisten dönen cihazları alın veya direkt müşteriye teslim edin.</p></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 rounded-3xl shadow-lg border border-slate-800 p-6 md:p-8 sticky top-20 h-max transition-colors">
          <h3 className="font-black text-xl text-white border-b border-slate-800 pb-4 mb-4">Seri Numarası İle Bul</h3>

          <form onSubmit={handleAdd} className="space-y-5">
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 transition-all">
              <label className="flex items-center gap-3 text-sm font-black text-slate-300 cursor-pointer">
                <input type="checkbox" checked={isGlobalSearch} onChange={(e) => { setIsGlobalSearch(e.target.checked); setSnInput(''); setIsDropdownOpen(false); }} className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" /> Bütün müşterilerde ara
              </label>
              {!isGlobalSearch && (
                <div className="mt-5 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs font-black text-slate-400 mb-2 uppercase">Müşteri Firmayı Seçin</label>
                  <select value={selectedCustomer} onChange={(e) => { setSelectedCustomer(e.target.value); setSnInput(''); }} className="w-full px-4 py-3.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 outline-none font-bold text-sm shadow-sm">{customers.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
              )}
            </div>

            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-black text-slate-400 mb-2">Cihaz Seri Numarası</label>
              <input autoComplete="off" required type="text" value={snInput} onChange={(e) => { setSnInput(e.target.value.toUpperCase()); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} className="w-full px-4 py-4 rounded-2xl border border-blue-700 focus:ring-4 focus:ring-blue-500/20 outline-none uppercase font-mono font-black bg-blue-900/20 text-blue-300 text-lg tracking-wider shadow-inner" placeholder="Örn: APL-998877" />
              {isDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                  {filteredAvailableTickets.filter(t => !pendingReturns.some(pr => String(pr.id) === String(t.id)) && (t.serialNumber.toLowerCase().includes(snInput.toLowerCase()) || t.customer.toLowerCase().includes(snInput.toLowerCase()))).length > 0 ? (
                      <ul className="divide-y divide-slate-700">
                        {filteredAvailableTickets.filter(t => !pendingReturns.some(pr => String(pr.id) === String(t.id)) && (t.serialNumber.toLowerCase().includes(snInput.toLowerCase()) || t.customer.toLowerCase().includes(snInput.toLowerCase()))).map(t => (
                            <li key={t.id} onClick={() => { setSnInput(t.serialNumber); setIsDropdownOpen(false); }} className="px-5 py-4 hover:bg-slate-700 cursor-pointer transition-colors flex flex-col gap-1">
                              <div className="font-mono font-black text-slate-200 text-base">{t.serialNumber}</div>
                              <div className="text-xs font-bold text-slate-400">{t.customer} <span className="font-medium"> - {t.brand} {t.model}</span></div>
                            </li>
                        ))}
                      </ul>
                    ) : <div className="p-5 text-center text-sm font-bold text-slate-400">Eşleşen cihaz bulunamadı.</div>
                  }
                </div>
              )}
            </div>

            {selectedTicket && (
              <div className="bg-green-900/20 border border-green-800/50 p-5 rounded-2xl animate-in fade-in zoom-in-95 shadow-sm mt-4">
                <div className="flex items-start gap-4 mb-5 border-b border-green-800/50 pb-4">
                  <div className="w-12 h-12 rounded-full bg-green-800 text-green-300 flex items-center justify-center shadow-inner"><CheckCircle size={24} /></div>
                  <div>
                    <div className="font-black text-green-100 text-lg">{selectedTicket.customer}</div>
                    <div className="text-sm text-green-300 font-bold mt-0.5">{selectedTicket.brand} {selectedTicket.model}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-green-400 mb-2 uppercase">Onarım Tipi</label>
                    <select value={formData.repairType} onChange={(e) => setFormData({...formData, repairType: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-green-700 bg-slate-900 text-slate-200 outline-none font-bold shadow-sm text-sm">
                      <option value="Garantili">Garantili (Ücretsiz)</option><option value="Ücretli">Ücretli Onarım</option><option value="İşlem Yapılmadı">İşlem Yapılmadı / İade</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-green-400 mb-2 flex justify-between uppercase"><span>Servis Notu</span><span className="text-[10px] bg-green-900/50 px-2 rounded-md py-0.5">Opsiyonel</span></label>
                    <input type="text" value={formData.serviceNote} onChange={(e) => setFormData({...formData, serviceNote: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-green-700 bg-slate-900 text-slate-200 font-medium shadow-sm text-sm" placeholder="Yapılan işlemler..." />
                  </div>
                  <button type="submit" className="w-full mt-4 px-4 py-4 rounded-2xl bg-green-600 text-white font-black hover:bg-green-700 flex justify-center items-center gap-2 shadow-sm text-lg"><Plus size={24} /> Listeye Ekle</button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="flex flex-col h-full">
          <div className="bg-slate-900 rounded-3xl shadow-lg border border-slate-800 flex-1 flex flex-col overflow-hidden transition-colors">
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex justify-between items-center"><h3 className="font-black text-lg text-white">İşlem Yapılacaklar</h3><span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">{pendingReturns.length} Cihaz</span></div>
            <div className="p-5 flex-1 overflow-y-auto space-y-4 bg-slate-950/50 min-h-[300px]">
              {pendingReturns.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10"><ClipboardCheck size={64} className="mb-4 opacity-20" /><p className="text-lg font-black">Liste boş.</p></div>
              ) : (
                pendingReturns.map((item) => (
                  <div key={item.id} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl shadow-sm flex gap-4 relative group">
                    <div className="w-12 h-12 rounded-2xl bg-blue-900/30 text-blue-400 flex items-center justify-center shadow-inner"><Wrench size={24} /></div>
                    <div className="flex-1 pr-10">
                      <div className="font-black text-white text-base">{item.customer}</div>
                      <div className="text-sm font-mono text-slate-400 mb-2 mt-1">{item.serialNumber}</div>
                      <div className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-xl font-medium border border-slate-700"><span className="font-black">[{item.repairType}]</span> {item.serviceNote || '-'}</div>
                    </div>
                    <button onClick={() => setPendingReturns(pendingReturns.filter(pr => String(pr.id) !== String(item.id)))} className="p-2.5 text-red-400 hover:bg-red-900/30 hover:text-red-600 rounded-xl absolute right-3 top-3 opacity-100 md:opacity-0 group-hover:opacity-100"><X size={20} strokeWidth={3} /></button>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900 grid grid-cols-2 gap-3 rounded-b-3xl">
              <button type="button" onClick={() => handleSubmit(STATUS_LABELS.RETURNED)} disabled={pendingReturns.length === 0} className="w-full px-2 sm:px-6 py-4 rounded-xl sm:rounded-2xl bg-slate-600 text-white font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm text-center leading-snug"><CheckCircle size={20} className="sm:hidden" /><span className="hidden sm:inline"><CheckCircle size={20} /></span>Servisten Al</button>
              <button type="button" onClick={() => handleSubmit(STATUS_LABELS.DELIVERED)} disabled={pendingReturns.length === 0} className="w-full px-2 sm:px-6 py-4 rounded-xl sm:rounded-2xl bg-green-600 text-white font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm text-center leading-snug"><Users size={20} className="sm:hidden" /><span className="hidden sm:inline"><Users size={20} /></span>Direkt Teslim Et</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- TEKLİF / MALİYET MODALI ---
function QuoteModal({ ticket, onSave, onClose }) {
  const getCurrentDateTimeLocal = () => new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0,16);

  const [form, setForm] = useState({
    techQuoteReceived: ticket.techQuoteReceived || false,
    techQuoteDate: ticket.techQuoteDate ? new Date(new Date(ticket.techQuoteDate).getTime() - new Date(ticket.techQuoteDate).getTimezoneOffset() * 60000).toISOString().slice(0,16) : getCurrentDateTimeLocal(),
    techQuoteAmount: ticket.techQuoteAmount || 0,
    customerQuoteGiven: ticket.customerQuoteGiven || false,
    customerQuoteDate: ticket.customerQuoteDate ? new Date(new Date(ticket.customerQuoteDate).getTime() - new Date(ticket.customerQuoteDate).getTimezoneOffset() * 60000).toISOString().slice(0,16) : getCurrentDateTimeLocal(),
    customerQuoteAmount: ticket.customerQuoteAmount || 0,
    customerQuoteAccepted: ticket.customerQuoteAccepted || 'Bekleniyor',
    marginPercent: ticket.marginPercent || 0,
    techQuoteNote: ticket.techQuoteNote || '',
    customerQuoteNote: ticket.customerQuoteNote || '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : (type === 'number' ? (parseFloat(value) || 0) : value);
    const newForm = { ...form, [name]: val };

    // Otomatik fiyat hesaplama
    if (name === 'techQuoteAmount' || name === 'marginPercent') {
      const margin = name === 'marginPercent' ? val : form.marginPercent;
      const techAmt = name === 'techQuoteAmount' ? val : form.techQuoteAmount;
      if (margin > 0) {
        newForm.customerQuoteAmount = Math.round(techAmt * (1 + margin / 100));
      }
    }
    setForm(newForm);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl w-full max-w-lg p-6 md:p-8 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-white flex items-center gap-2"><Download size={20} className="text-green-400"/> Teklif & Maliyet Yönetimi</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
        </div>

        {/* Teknik Servis Maliyeti */}
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 space-y-3 mb-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" name="techQuoteReceived" checked={form.techQuoteReceived} onChange={handleChange} className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500" />
            <label className="text-sm font-bold text-slate-200">Teknik Servisten Teklif Geldi</label>
          </div>
          {form.techQuoteReceived && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Geliş Tarihi (Saat Dahil)</label>
                <input type="datetime-local" name="techQuoteDate" value={form.techQuoteDate} onChange={handleChange} className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-800 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Maliyet (TL)</label>
                <input type="number" name="techQuoteAmount" value={form.techQuoteAmount} onChange={handleChange} className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-800 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500 font-black" />
              </div>
            </div>
          )}
          {form.techQuoteReceived && (
            <div className="mt-3 animate-in fade-in">
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Teknik Servis Notu (İç Not)</label>
              <textarea name="techQuoteNote" value={form.techQuoteNote} onChange={handleChange} rows="2" className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-800 text-slate-200 text-xs outline-none focus:ring-2 focus:ring-blue-500" placeholder="Sadece personel görebilir..."></textarea>
            </div>
          )}
        </div>

        {/* Müşteri Teklifi */}
        <div className="bg-blue-900/10 p-4 rounded-2xl border border-blue-900/30 space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input type="checkbox" name="customerQuoteGiven" checked={form.customerQuoteGiven} onChange={handleChange} className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500" />
              <label className="text-sm font-bold text-slate-200">Müşteriye Teklif Verildi</label>
            </div>
            {form.customerQuoteGiven && (
              <div className="flex items-center gap-2">
                <select name="customerQuoteAccepted" value={form.customerQuoteAccepted} onChange={handleChange} className={`px-3 py-1.5 rounded-lg border text-xs font-black outline-none focus:ring-2 focus:ring-blue-500 ${form.customerQuoteAccepted === 'Onaylandı' ? 'bg-green-900/30 text-green-400 border-green-700' : form.customerQuoteAccepted === 'Reddedildi' ? 'bg-red-900/30 text-red-400 border-red-700' : 'bg-slate-800 border-slate-600 text-slate-300'}`}>
                  <option value="Bekleniyor">Cevap Bekleniyor</option>
                  <option value="Onaylandı">Müşteri Onayladı</option>
                  <option value="Reddedildi">Müşteri Reddetti</option>
                </select>
              </div>
            )}
          </div>
          {form.customerQuoteGiven && (
            <div className="space-y-3 animate-in fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Teklif Tarihi (Saat Dahil)</label>
                  <input type="datetime-local" name="customerQuoteDate" value={form.customerQuoteDate} onChange={handleChange} className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-800 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Kar Payı (%)</label>
                  <input type="number" name="marginPercent" value={form.marginPercent} onChange={handleChange} className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-800 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500 font-black" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Toplam Müşteri Teklifi (TL)</label>
                <input type="number" name="customerQuoteAmount" value={form.customerQuoteAmount} onChange={handleChange} className="w-full px-3 py-2.5 rounded-xl border border-blue-700 bg-blue-900/30 text-blue-200 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-black" />
              </div>
              <div className="mt-3">
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Müşteriye Verilen Teklif Notu (İç Not)</label>
                <textarea name="customerQuoteNote" value={form.customerQuoteNote} onChange={handleChange} rows="2" className="w-full px-3 py-2 rounded-xl border border-blue-800/50 bg-blue-900/20 text-blue-200 text-xs outline-none focus:ring-2 focus:ring-blue-500" placeholder="Müşteriye iletilen detaylar / Pazarlık durumu (Sadece personel görebilir)..."></textarea>
              </div>
            </div>
          )}
        </div>

        {/* Özet */}
        {form.techQuoteReceived && form.customerQuoteGiven && form.techQuoteAmount > 0 && form.customerQuoteAmount > 0 && (
          <div className="bg-green-900/10 p-4 rounded-2xl border border-green-900/30 mb-6">
            <div className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-2">KAR ÖZETİ</div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-300 font-medium">Net Kar:</span>
              <span className="text-xl font-black text-green-400">{(form.customerQuoteAmount - form.techQuoteAmount).toLocaleString('tr-TR')} TL</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm transition-colors">İptal</button>
          <button onClick={() => onSave(form)} className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl text-sm flex items-center gap-2 shadow-xl transition-all active:scale-95"><Save size={16}/> KAYDET</button>
        </div>
      </div>
    </div>
  );
}

function TicketDetailView({ ticket, allTickets, onStatusChangeRequest, onBack, currentTime, user, customers, brandsModels, onUpdateTicket, onDeleteTicket, showToast }) {
  const [activeTab, setActiveTab] = useState('detay');
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [inlineEditing, setInlineEditing] = useState(null); // 'internalNote' or 'serviceNote'
  const [inlineNoteValue, setInlineNoteValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  const [editForm, setEditForm] = useState({});
  const [photos, setPhotos] = useState([]);
  const [historyPhotos, setHistoryPhotos] = useState({});
  const [viewPhoto, setViewPhoto] = useState(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [warrantyInfo, setWarrantyInfo] = useState(ticket.warrantyInfo || null);
  const [warrantyLoading, setWarrantyLoading] = useState(false);

  // Garanti bilgisini otomatik çek
  const fetchWarranty = async (force = false) => {
    if (warrantyInfo && warrantyInfo.checkedAt && !force) return;
    setWarrantyLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/warranty/lenovo/${ticket.serialNumber}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWarrantyInfo(data.warranty);
          onUpdateTicket(ticket.id, { warrantyInfo: data.warranty });
          if(force) showToast('Garanti durumu Lenovodan tekrar çekildi.', 'success');
        } else if (force) {
          showToast('Lenovo sunucusundan garanti durumu alınamadı.', 'error');
        }
      }
    } catch (e) { console.error('Garanti sorgulama hatası:', e); }
    setWarrantyLoading(false);
  };

  useEffect(() => {
    fetchWarranty();
  }, [ticket.serialNumber]);

  useEffect(() => {
    if (isEditing) return;
    setEditForm({
      customer: ticket.customer,
      brand: ticket.brand,
      model: ticket.model,
      serialNumber: ticket.serialNumber,
      complaint: ticket.complaint,
      dateReceived: ticket.dateReceived || '',
      dateSent: ticket.dateSent || '',
      dateReturned: ticket.dateReturned || '',
      dateDelivered: ticket.dateDelivered || '',
    });
    
    // MIGRATION: Eğer yeni notes dizisi yoksa ama eski notlar varsa taşı
    if (!ticket.notes && (ticket.internalNote || ticket.serviceNote)) {
       const initialNotes = [];
       if (ticket.internalNote) initialNotes.push({ id: Date.now() + 1, text: ticket.internalNote, type: 'internal', personnel: ticket.personnel || 'Sistem', date: ticket.dateReceived || new Date().toISOString() });
       if (ticket.serviceNote) initialNotes.push({ id: Date.now() + 2, text: ticket.serviceNote, type: 'public', personnel: ticket.personnel || 'Sistem', date: ticket.dateReceived || new Date().toISOString() });
       onUpdateTicket(ticket.id, { notes: initialNotes, internalNote: null, serviceNote: null });
    }
  }, [ticket, isEditing]);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const res = await apiFetch(`${API_URL}/photos?ticketId=${ticket.id}`);
        if (res.ok) setPhotos(await res.json());
      } catch (e) {
        console.error("Fotoğraflar çekilemedi", e);
      }
    };
    fetchPhotos();
  }, [ticket.id]);

  useEffect(() => {
    const fetchHistoryPhotos = async () => {
      const historyTickets = allTickets.filter(t => t.serialNumber === ticket.serialNumber && String(t.id) !== String(ticket.id));
      const photosMap = {};
      for (const t of historyTickets) {
        try {
          const res = await apiFetch(`${API_URL}/photos?ticketId=${t.id}`);
          if (res.ok) photosMap[t.id] = await res.json();
        } catch (e) {}
      }
      setHistoryPhotos(photosMap);
    };
    fetchHistoryPhotos();
  }, [ticket.serialNumber, allTickets, ticket.id]);

  const historyTickets = allTickets.filter(t => t.serialNumber === ticket.serialNumber && String(t.id) !== String(ticket.id)).sort((a,b) => new Date(b.dateReceived) - new Date(a.dateReceived));
  const isAdmin = user?.role === 'admin';
  const canDelete = isAdmin || user?.permissions?.canDeleteTickets;

  const ActionButton = ({ targetStatus, label, icon, bgClass, hoverClass, textClass }) => {
    return (
      <button 
        onClick={() => onStatusChangeRequest(targetStatus, [ticket.id])}
        className={`w-full h-12 ${bgClass} ${hoverClass} rounded-2xl font-black text-[13px] sm:text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg border border-white/10 uppercase tracking-widest ${textClass}`}
      >
        {icon}
        {label}
      </button>
    );
  };

  const handleEditChange = (e) => {
    let { name, value } = e.target;
    if (name === 'brand') {
      const firstModel = brandsModels[value] && brandsModels[value].length > 0 ? brandsModels[value][0] : '';
      setEditForm({ ...editForm, brand: value, model: firstModel });
    } else {
      let finalValue = value;
      if(name === 'serialNumber') finalValue = value.toUpperCase();
      if(e.target.type === 'checkbox') finalValue = e.target.checked;
      setEditForm({ ...editForm, [name]: finalValue });
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    let addedCount = 0;
    for (let i = 0; i < files.length; i++) {
       const base64 = await compressImage(files[i]);
       try {
         await apiFetch(`${API_URL}/photos`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ ticketId: ticket.id, url: base64 })
         });
         addedCount++;
       } catch (error) {}
    }
    
    const photosRes = await apiFetch(`${API_URL}/photos?ticketId=${ticket.id}`);
    if (photosRes.ok) setPhotos(await photosRes.json());
    if (addedCount > 0) showToast(`${addedCount} fotoğraf eklendi.`, 'success');
  };

  const handleRemovePhoto = async (photoId, e) => {
    e.stopPropagation(); 
    if (!window.confirm("Bu fotoğrafı silmek istediğinize emin misiniz?")) return;
    try {
      await apiFetch(`${API_URL}/photos/${photoId}`, { method: 'DELETE' });
      setPhotos(photos.filter(p => String(p.id) !== String(photoId)));
      showToast('Fotoğraf silindi.', 'success');
    } catch(e) {}
  };

  const handleSaveEdit = () => {
    if (!editForm.serialNumber.trim() || !editForm.customer || !editForm.brand) return;
    const updates = {
      serialNumber: editForm.serialNumber,
      customer: editForm.customer,
      brand: editForm.brand,
      model: editForm.model,
      complaint: editForm.complaint,
      internalNote: editForm.internalNote,
      serviceNote: editForm.serviceNote,
    };
    // Tarih düzenleme (geçmiş adımlar)
    if (editForm.dateReceived) updates.dateReceived = editForm.dateReceived;
    if (ticket.dateSent && editForm.dateSent) updates.dateSent = editForm.dateSent;
    if (ticket.dateReturned && editForm.dateReturned) updates.dateReturned = editForm.dateReturned;
    if (ticket.dateDelivered && editForm.dateDelivered) updates.dateDelivered = editForm.dateDelivered;
    
    // Seri numarası değiştiyse garantiyi yeniden sorgula
    if (editForm.serialNumber !== ticket.serialNumber) {
      updates.warrantyInfo = null;
      setWarrantyInfo(null);
    }
    onUpdateTicket(ticket.id, updates);
    setIsEditing(false);
  };

  const handleSaveQuote = (quoteData) => {
    onUpdateTicket(ticket.id, quoteData);
    setShowQuoteModal(false);
    showToast('Teklif bilgileri kaydedildi.', 'success');
  };

  const [newNote, setNewNote] = useState('');
  const [newNoteType, setNewNoteType] = useState('internal');
  const [editingNoteId, setEditingNoteId] = useState(null);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const notes = ticket.notes || [];
    const note = {
      id: Date.now(),
      text: newNote,
      type: newNoteType,
      personnel: user.displayName,
      date: new Date().toISOString()
    };
    onUpdateTicket(ticket.id, { notes: [...notes, note] });
    setNewNote('');
    showToast('Not eklendi.', 'success');
  };

  const handleUpdateNote = (id, text) => {
    const notes = ticket.notes.map(n => n.id === id ? { ...n, text, lastUpdate: new Date().toISOString() } : n);
    onUpdateTicket(ticket.id, { notes });
    setEditingNoteId(null);
    showToast('Not güncellendi.', 'success');
  };

  const handleDeleteNote = (id) => {
    if (!window.confirm("Bu notu silmek istediğinize emin misiniz?")) return;
    const notes = ticket.notes.filter(n => n.id !== id);
    onUpdateTicket(ticket.id, { notes });
    showToast('Not silindi.', 'success');
  };

  const handleUndo = () => {
    if (!window.confirm("Bu cihaz için yapılan SON DURUM DEĞİŞİKLİĞİNİ geri almak istediğinize emin misiniz?")) return;
    
    let updates = {};
    if (ticket.status === STATUS_LABELS.DELIVERED) {
      updates = { status: STATUS_LABELS.RETURNED, dateDelivered: null, personnelDelivered: null, lastPersonnel: `${user.displayName} (Geri Aldı)` };
    } else if (ticket.status === STATUS_LABELS.RETURNED) {
      updates = { status: STATUS_LABELS.SENT, dateReturned: null, personnelReturned: null, repairType: null, serviceNote: null, lastPersonnel: `${user.displayName} (Geri Aldı)` };
    } else if (ticket.status === STATUS_LABELS.SENT) {
      updates = { status: STATUS_LABELS.RECEIVED, dateSent: null, personnelSent: null, lastPersonnel: `${user.displayName} (Geri Aldı)` };
    } else {
      alert("Bu aşamada geri alınacak bir işlem bulunmuyor."); return;
    }
    
    onUpdateTicket(ticket.id, updates);
    showToast('Son işlem başarıyla geri alındı!', 'success');
  };

  const statuses = [STATUS_LABELS.RECEIVED, STATUS_LABELS.SENT, STATUS_LABELS.RETURNED, STATUS_LABELS.DELIVERED];
  const currentIndex = statuses.indexOf(ticket.status);

  const currentRemainingDays = calculateRemainingDays(warrantyInfo?.endDate);
  const currentIsInWarranty = currentRemainingDays > 0;

  return (
    <div className="max-w-4xl mx-auto pb-8">
      
      {/* Quote/Cost Modal */}
      {showQuoteModal && (
        <QuoteModal ticket={ticket} onSave={handleSaveQuote} onClose={() => setShowQuoteModal(false)} />
      )}

      {/* Lightbox / Fullscreen Image Modal */}
      {viewPhoto && (
        <div className="fixed inset-0 bg-slate-900/95 z-[200] flex items-center justify-center p-4 md:p-12 backdrop-blur-sm" onClick={() => setViewPhoto(null)}>
          <button className="absolute top-6 right-6 text-white hover:text-red-500 transition-colors p-3 bg-slate-800/50 hover:bg-slate-800 rounded-full" onClick={() => setViewPhoto(null)}>
            <X size={32} />
          </button>
          <img src={viewPhoto} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* ÜST BAŞLIK VE AKSİYON TOOLBARI */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8">
        <div className="flex items-start gap-4">
          <button onClick={onBack} className="mt-1 p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition-all hover:scale-105 active:scale-95 border border-slate-700 shadow-lg">
            <ArrowRight size={20} className="rotate-180" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                {ticket.customer}
              </h2>
              <StatusBadge status={ticket.status} repairType={ticket.repairType} />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 text-slate-400 font-bold text-xs">
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-sm">
                <span className="px-2 py-1 text-[9px] bg-slate-800 text-slate-500 uppercase font-black border-r border-slate-700">SN</span>
                <span className="px-3 py-1 font-mono text-slate-200 uppercase tracking-tight">{ticket.serialNumber}</span>
              </div>
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-sm">
                <span className="px-2 py-1 text-[9px] bg-slate-800 text-slate-500 uppercase font-black border-r border-slate-700">KAYIT</span>
                <span className="px-3 py-1 text-slate-200 tracking-tight">{ticket.id}</span>
              </div>
              <div className="text-slate-500 font-medium bg-slate-800/30 px-3 py-1 rounded-lg">
                {ticket.brand} {ticket.model}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {warrantyLoading ? (
                <span className="bg-slate-800 text-slate-400 text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-pulse"><RefreshCw size={12} className="animate-spin"/> Sorgulanıyor...</span>
              ) : warrantyInfo ? (
                <>
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${currentIsInWarranty ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'bg-red-900/40 text-red-400 border border-red-800'}`}>
                    <Shield size={12} /> {currentIsInWarranty ? `GARANTİLİ (${currentRemainingDays} g)` : 'GARANTİ DIŞI'}
                  </span>
                  {ticket.brand?.toLowerCase().includes('lenovo') && (
                    <a 
                      href={`https://pcsupport.lenovo.com/tr/tr/search?query=${ticket.serialNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-900/20"
                    >
                      <Globe size={12} /> LENOVO DESTEK
                    </a>
                  )}
                  <button onClick={() => fetchWarranty(true)} title="Yenile" className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors border border-slate-700">
                    <RefreshCw size={12} />
                  </button>
                </>
              ) : (
                <button onClick={() => fetchWarranty(true)} className="bg-blue-900/30 text-blue-400 border border-blue-800 hover:bg-blue-600 hover:text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
                  <Shield size={12}/> Garanti Sorgula
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-5 w-full xl:w-auto mt-6 xl:mt-0">
          {/* DURUM VE AKSİYON PANELİ */}
          <div className="bg-slate-900/50 p-3 md:p-4 rounded-[2rem] border border-slate-800 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col gap-3">
              {/* ANA DURUM DEĞİŞTİRME BUTONU */}
              {ticket.status !== STATUS_LABELS.DELIVERED && !isEditing && (
                <div className="w-full">
                  {ticket.status === STATUS_LABELS.RECEIVED && (
                    <ActionButton targetStatus={STATUS_LABELS.SENT} label="BAŞLAT" icon={<Truck size={18} />} bgClass="bg-blue-600 shadow-blue-900/20" hoverClass="hover:bg-blue-500" textClass="text-white" />
                  )}
                  {ticket.status === STATUS_LABELS.SENT && (
                    <ActionButton targetStatus={STATUS_LABELS.RETURNED} label="BİTİR" icon={<CheckCircle size={18} />} bgClass="bg-orange-600 shadow-orange-900/20" hoverClass="hover:bg-orange-500" textClass="text-white" />
                  )}
                  {ticket.status === STATUS_LABELS.RETURNED && (
                    <ActionButton targetStatus={STATUS_LABELS.DELIVERED} label="MÜŞTERİYE TESLİM ET" icon={<Users size={18} />} bgClass="bg-green-600 shadow-green-900/20" hoverClass="hover:bg-green-500" textClass="text-white" />
                  )}
                </div>
              )}

              {/* ARAÇ SETİ - MOBİLDE 2x2, DESKTOPTA YAN YANA */}
              <div className="grid grid-cols-2 md:flex md:items-center gap-2">
                {isAdmin && (
                  <button onClick={() => setShowQuoteModal(true)} className="h-11 px-4 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95">
                    <Download size={14} className="text-blue-400" /> TEKLİF
                  </button>
                )}
                {isAdmin && (
                  <button 
                    onClick={() => setIsEditing(true)} 
                    disabled={activeTab !== 'detay'}
                    className={`h-11 px-4 rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 border transition-all active:scale-95 ${activeTab !== 'detay' ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed' : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'}`}
                  >
                    <Edit size={14} className="text-amber-400" /> DÜZENLE
                  </button>
                )}
                {isAdmin && ticket.status !== STATUS_LABELS.RECEIVED && (
                  <button onClick={handleUndo} className="h-11 px-4 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 border border-slate-700 transition-all active:scale-95">
                    <Undo2 size={14} className="text-orange-400" /> GERİ AL
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => onDeleteTicket(ticket.id)} title="Kaydı Sil" className="h-11 px-4 bg-slate-800/50 text-slate-500 hover:bg-red-600 hover:text-white rounded-2xl flex items-center justify-center border border-slate-700 hover:border-red-600/50 transition-all active:scale-95">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>



      {/* TEKLİF MODAL */}
      {showQuoteModal && <QuoteModal ticket={ticket} onSave={handleSaveQuote} onClose={() => setShowQuoteModal(false)} />}

      <div className="flex border-b border-slate-800 mb-8 px-2 transition-colors">
        <button onClick={() => setActiveTab('detay')} className={`pb-4 px-6 text-sm md:text-base font-black border-b-4 transition-colors ${activeTab === 'detay' ? 'text-blue-400 border-blue-400' : 'border-transparent text-slate-500 hover:text-slate-200'}`}>Kayıt Detayları</button>
        <button onClick={() => setActiveTab('gecmis')} className={`pb-4 px-6 text-sm md:text-base font-black border-b-4 transition-colors flex items-center gap-2 ${activeTab === 'gecmis' ? 'text-blue-400 border-blue-400' : 'border-transparent text-slate-500 hover:text-slate-200'}`}>
          Geçmiş <span className={`${activeTab === 'gecmis' ? 'bg-blue-900/50 text-blue-300' : 'bg-slate-800 text-slate-400'} text-xs py-0.5 px-2 rounded-lg ml-1`}>{historyTickets.length}</span>
        </button>
      </div>

      {activeTab === 'detay' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            
            <div className="bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-800 relative overflow-hidden transition-colors">
              <div className="absolute top-0 left-0 w-2 h-full bg-slate-600"></div>
              
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">İLK KABUL BİLGİLERİ</h3>
              </div>

              {isEditing ? (
                <div className="space-y-4 bg-[#0f172a] p-5 rounded-2xl border border-blue-900/50 animate-in fade-in zoom-in-95 transition-colors">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Müşteri</label>
                    <select name="customer" value={editForm.customer} onChange={handleEditChange} className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-colors">
                      {customers.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Marka</label>
                      <select name="brand" value={editForm.brand} onChange={handleEditChange} className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-colors">
                        {Object.keys(brandsModels).map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1">Model</label>
                      <select name="model" value={editForm.model} onChange={handleEditChange} className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-colors">
                        {editForm.brand && brandsModels[editForm.brand] ? brandsModels[editForm.brand].map(m => <option key={m} value={m}>{m}</option>) : <option value="" disabled>Model yok</option>}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Seri Numarası</label>
                    <input type="text" name="serialNumber" value={editForm.serialNumber} onChange={handleEditChange} className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono font-black text-sm uppercase transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Cihaz Şikayeti (İlk Kabul)</label>
                    <textarea name="complaint" value={editForm.complaint} onChange={handleEditChange} rows="2" className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm transition-colors"></textarea>
                  </div>

                  <div className="pt-2 mt-4 border-t border-slate-800 space-y-4">
                     <div>
                       <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1"><Shield size={12} className="text-orange-400"/> İÇ NOTLAR (Müşteri Göremez)</label>
                       <textarea name="internalNote" value={editForm.internalNote} onChange={handleEditChange} rows="2" className="w-full px-3 py-2 rounded-xl border border-orange-900/30 bg-slate-900 text-slate-200 focus:ring-2 focus:ring-orange-500 outline-none font-medium text-sm transition-colors" placeholder="Personel için özel notlar..."></textarea>
                     </div>
                     <div>
                       <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center gap-1"><Info size={12} className="text-blue-400"/> MÜŞTERİ NOTU (Public)</label>
                       <textarea name="serviceNote" value={editForm.serviceNote} onChange={handleEditChange} rows="2" className="w-full px-3 py-2 rounded-xl border border-blue-900/30 bg-slate-900 text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm transition-colors" placeholder="Müşterinin sorgulama ekranında göreceği açıklama..."></textarea>
                     </div>
                  </div>

                  {/* TARİH DÜZENLEME (Geçmiş Adımlar) */}
                  <div className="pt-4 border-t border-slate-800 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tarih Düzenleme</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Alınma Tarihi</label>
                        <input type="datetime-local" name="dateReceived" value={editForm.dateReceived ? editForm.dateReceived.slice(0,16) : ''} onChange={handleEditChange} className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white text-xs outline-none" />
                      </div>
                      {ticket.dateSent && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Servis Başlangıç</label>
                          <input type="datetime-local" name="dateSent" value={editForm.dateSent ? editForm.dateSent.slice(0,16) : ''} onChange={handleEditChange} className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white text-xs outline-none" />
                        </div>
                      )}
                      {ticket.dateReturned && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Servis Bitiş</label>
                          <input type="datetime-local" name="dateReturned" value={editForm.dateReturned ? editForm.dateReturned.slice(0,16) : ''} onChange={handleEditChange} className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white text-xs outline-none" />
                        </div>
                      )}
                      {ticket.dateDelivered && (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Teslim Tarihi</label>
                          <input type="datetime-local" name="dateDelivered" value={editForm.dateDelivered ? editForm.dateDelivered.slice(0,16) : ''} onChange={handleEditChange} className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white text-xs outline-none" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* GARANTİ BİLGİSİ DÜZENLEME */}
                  <div className="pt-4 border-t border-slate-800 space-y-3">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1"><Shield size={12} className="text-green-400"/> Garanti Bilgisi (Manuel Düzenleme)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Garanti Durumu</label>
                        <select name="warrantyManualStatus" value={editForm.warrantyManualStatus || (warrantyInfo?.isInWarranty ? 'in' : 'out')} onChange={handleEditChange} className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white text-xs outline-none">
                          <option value="in">Garantili</option>
                          <option value="out">Garanti Dışı</option>
                          <option value="unknown">Bilinmiyor</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Garanti Bitiş Tarihi</label>
                        <input type="date" name="warrantyManualEndDate" value={editForm.warrantyManualEndDate || (warrantyInfo?.endDate || '')} onChange={handleEditChange} className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-white text-xs outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-blue-900/50">
                    <button onClick={() => {setIsEditing(false);}} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors">İptal</button>
                    <button onClick={handleSaveEdit} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-xl transition-all active:scale-95"><Save size={16}/> DEĞİŞİKLİKLERİ KAYDET</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* KABUL BİLGİLERİ VE NOTLAR BLOĞU */}
                  <div className="space-y-6">
                    <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-sm transition-colors">
                      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-slate-950 to-slate-900">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2"><Smartphone size={14} className="text-blue-500"/> İLK KABUL BİLGİLERİ</span>
                        <div className="flex gap-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500/50"></div>
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-700"></div>
                        </div>
                      </div>
                      <div className="p-8">
                         <div className="text-slate-200 text-lg md:text-xl font-medium leading-relaxed italic border-l-4 border-blue-600 pl-6 py-2 bg-blue-600/5 rounded-r-xl">
                           "{ticket.complaint || "Şikayet belirtilmemiş."}"
                         </div>
                      </div>
                    </div>

                    {/* OPERASYONEL NOTLAR (İÇ VE DIŞ) */}
                    <div className="space-y-8">
                      {/* BİRLEŞİK NOT EKLEME ALANI */}
                      <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden transition-all hover:border-slate-700">
                        <div className="px-8 py-5 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                                <MessageCircle size={20} className="text-blue-500" />
                              </div>
                              <span className="text-sm font-black text-white uppercase tracking-widest">NOT EKLE</span>
                           </div>
                           <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-2xl gap-1">
                              <button 
                                onClick={() => setNewNoteType('internal')} 
                                className={`px-5 py-2 rounded-xl text-[11px] font-black transition-all ${newNoteType === 'internal' ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                İÇ NOT
                              </button>
                              <button 
                                onClick={() => setNewNoteType('public')} 
                                className={`px-5 py-2 rounded-xl text-[11px] font-black transition-all ${newNoteType === 'public' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                MÜŞTERİYE
                              </button>
                           </div>
                        </div>
                        <div className="p-8">
                           <textarea 
                             value={newNote} 
                             onChange={e => setNewNote(e.target.value)} 
                             placeholder={newNoteType === 'internal' ? "Sadece personelin göreceği gizli not..." : "Müşterinin sorgulama ekranında göreceği açık not..."}
                             className={`w-full bg-slate-950 border ${newNoteType === 'internal' ? 'border-orange-900/30 focus:ring-orange-500/50' : 'border-blue-900/30 focus:ring-blue-500/50'} rounded-3xl p-6 text-base text-slate-200 outline-none focus:ring-2 transition-all min-h-[140px] font-medium leading-relaxed shadow-inner`}
                           />
                           <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                              <div className="text-xs font-bold text-slate-500 italic flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                {user.displayName} olarak yazıyorsunuz...
                              </div>
                              <button 
                                onClick={handleAddNote} 
                                disabled={!newNote.trim()}
                                className={`w-full sm:w-auto px-10 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 disabled:opacity-30 ${newNoteType === 'internal' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-900/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20'} text-white uppercase tracking-widest`}
                              >
                                <Send size={18}/> NOTU SİSTEME EKLE
                              </button>
                           </div>
                        </div>
                      </div>

                      {/* NOT AKIŞI (FEED) */}
                      <div className="space-y-4">
                        {(ticket.notes || []).length === 0 ? (
                           <div className="text-center py-12 bg-slate-900/30 rounded-[2.5rem] border-2 border-dashed border-slate-800 text-slate-600 text-sm font-bold flex flex-col items-center gap-3">
                             <MessageCircle size={32} className="opacity-20" />
                             Henüz bir not eklenmemiş.
                           </div>
                        ) : (
                           [...(ticket.notes || [])].reverse().map(note => (
                             <div key={note.id} className={`bg-slate-900 rounded-[2rem] border ${note.type === 'internal' ? 'border-orange-900/20 hover:border-orange-900/40' : 'border-blue-900/20 hover:border-blue-900/40'} overflow-hidden transition-all shadow-lg group`}>
                               <div className={`px-6 py-3 flex justify-between items-center ${note.type === 'internal' ? 'bg-orange-900/5' : 'bg-blue-900/5'}`}>
                                 <div className="flex items-center gap-4">
                                   <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${note.type === 'internal' ? 'bg-orange-900/40 text-orange-400' : 'bg-blue-900/40 text-blue-400'}`}>
                                     {note.type === 'internal' ? 'İÇ NOT' : 'MÜŞTERİ NOTU'}
                                   </span>
                                   <div className="flex items-center gap-2">
                                     <span className="text-xs font-black text-slate-200 uppercase tracking-tight">{note.personnel}</span>
                                     <span className="text-[10px] font-bold text-slate-600 border-l border-slate-800 pl-2">{formatDateTime(note.date)}</span>
                                   </div>
                                 </div>
                                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => { setEditingNoteId(note.id); setInlineNoteValue(note.text); }} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all"><Edit size={16}/></button>
                                   <button onClick={() => handleDeleteNote(note.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"><Trash2 size={16}/></button>
                                 </div>
                               </div>
                               <div className="p-6">
                                 {editingNoteId === note.id ? (
                                   <div className="space-y-4">
                                     <textarea 
                                       autoFocus 
                                       value={inlineNoteValue} 
                                       onChange={e => setInlineNoteValue(e.target.value)} 
                                       className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
                                       rows="3"
                                     />
                                     <div className="flex justify-end gap-3">
                                       <button onClick={() => setEditingNoteId(null)} className="px-4 py-2 text-xs text-slate-500 font-bold hover:text-slate-300 transition-colors">İPTAL</button>
                                       <button onClick={() => handleUpdateNote(note.id, inlineNoteValue)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-900/20 transition-all active:scale-95">GÜNCELLE</button>
                                     </div>
                                   </div>
                                 ) : (
                                   <p className="text-base font-medium text-slate-300 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                                 )}
                                 {note.lastUpdate && (
                                   <div className="mt-4 pt-3 border-t border-slate-800/50 flex items-center gap-2 text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                                     <Clock size={10} /> SON GÜNCELLEME: {formatDateTime(note.lastUpdate)}
                                   </div>
                                 )}
                               </div>
                             </div>
                           ))
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <div className="mt-6 border-t border-slate-800 pt-5">
                <div className="flex justify-between items-center mb-3">
                   <span className="text-xs font-bold text-slate-400">Cihaz Fotoğrafları</span>
                   {isEditing && (
                     <label className="text-blue-400 hover:bg-blue-900/30 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer">
                       <ImagePlus size={14}/> Yeni Ekle
                       <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                     </label>
                   )}
                </div>
                
                {photos.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {photos.map((photo) => (
                      <div key={photo.id} onClick={() => setViewPhoto(photo.url)} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-700 shadow-sm group flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity">
                        <img src={photo.url} alt="Cihaz" className="w-full h-full object-cover" />
                        {isEditing && (
                          <button type="button" onClick={(e) => handleRemovePhoto(photo.id, e)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                            <X size={12}/>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Henüz fotoğraf eklenmemiş.</p>
                )}
              </div>
            </div>



            {ticket.repairType && (
              <div className="bg-blue-900/10 rounded-3xl overflow-hidden border border-blue-900/50 shadow-sm transition-colors">
                <div className="bg-blue-900/20 px-6 py-3 border-b border-blue-800/30 flex justify-between items-center">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Wrench size={14}/> Servis Sonuç Raporu</span>
                  <div className="px-2 py-0.5 rounded bg-blue-600 text-white text-[9px] font-black uppercase">{ticket.repairType}</div>
                </div>
                <div className="p-6">
                  <p className="text-sm font-medium text-slate-200 leading-relaxed italic">
                    "{ticket.serviceNote || "İşlem detayı girilmemiş."}"
                  </p>
                </div>
              </div>
            )}

            {/* TEKLİF VE FİNANSAL BİLGİLER - EN ALTA TAŞINDI */}
            {(ticket.techQuoteReceived || ticket.customerQuoteGiven) && (
              <div className="bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-800 relative overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
                <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Download size={14}/> Teklif ve Onay Durumu</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-black text-slate-500 uppercase block mb-3 font-mono">Teknik Servis Maliyeti</span>
                    {ticket.techQuoteReceived ? (
                      <div className="space-y-3">
                        <div className="flex items-baseline gap-2">
                           <div className="text-xl font-black text-white">{ticket.techQuoteAmount?.toLocaleString('tr-TR')} TL</div>
                           <div className="text-[9px] text-slate-500 font-bold uppercase">{formatDateTime(ticket.techQuoteDate)}</div>
                        </div>
                        {ticket.techQuoteNote && (
                          <div className="text-[11px] text-slate-400 bg-black/30 p-3 rounded-xl border border-white/5 leading-relaxed italic">
                            "{ticket.techQuoteNote}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 font-bold flex items-center gap-2"><AlertCircle size={14}/> Henüz maliyet çıkmadı.</div>
                    )}
                  </div>

                  <div className={`p-5 rounded-2xl border ${ticket.customerQuoteGiven ? 'bg-blue-900/10 border-blue-900/30' : 'bg-slate-950 border-slate-800'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-black text-blue-500 uppercase block font-mono">
                        Müşteri Teklifi
                        {ticket.customerQuoteGiven && <span className="text-green-500 font-bold ml-1">(+{ticket.marginPercent}%)</span>}
                      </span>
                    </div>
                    {ticket.customerQuoteGiven ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[10px]">
                          <div className="text-xl font-black text-blue-400">{ticket.customerQuoteAmount?.toLocaleString('tr-TR')} TL</div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shadow-sm ${ticket.customerQuoteAccepted === 'Onaylandı' ? 'bg-green-600 text-white' : ticket.customerQuoteAccepted === 'Reddedildi' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}>
                            {ticket.customerQuoteAccepted === 'Onaylandı' ? 'ONAYLANDI' : ticket.customerQuoteAccepted === 'Reddedildi' ? 'REDDEDİLDİ' : 'BEKLİYOR'}
                          </span>
                        </div>
                        {ticket.customerQuoteNote && (
                          <div className="text-[11px] text-blue-300/70 bg-blue-900/20 p-3 rounded-xl border border-blue-800/30 leading-relaxed italic">
                            "{ticket.customerQuoteNote}"
                          </div>
                        )}
                        <div className="text-[9px] text-slate-500 font-bold uppercase text-right">{formatDateTime(ticket.customerQuoteDate)} İletildi</div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 font-bold flex items-center gap-2"><AlertCircle size={14}/> Henüz teklif verilmedi.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 p-6 md:p-8 rounded-3xl shadow-sm border border-slate-800 transition-colors">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-2">
                <History size={14} className="text-blue-500"/> Tarihsel Süreç
              </h3>
              
              <div className="space-y-0">
                <TimelineItem title={STATUS_LABELS.RECEIVED} date={ticket.dateReceived} personnel={ticket.personnelReceived || ticket.personnel} isCompleted={currentIndex >= 0} />
                
                <TimelineItem title={STATUS_LABELS.SENT} date={ticket.dateSent} personnel={ticket.personnelSent} isCompleted={currentIndex >= 1} />

                {ticket.techQuoteReceived && (
                    <TimelineItem title="Servisten Teklif Geldi" date={ticket.techQuoteDate} personnel={ticket.lastPersonnel || ticket.personnel} isCompleted={true} />
                )}
                
                {ticket.customerQuoteGiven && (
                    <TimelineItem 
                      title="Teklif Müşteriye İletildi" 
                      date={ticket.customerQuoteDate} 
                      subTitle={
                        <div className="flex flex-col gap-2">
                          <span className="text-blue-400 font-black flex items-center gap-2">
                             <Download size={12}/> {ticket.customerQuoteAmount?.toLocaleString('tr-TR')} TL Teklif Edildi
                          </span>
                          {ticket.customerQuoteAccepted === 'Bekleniyor' && (
                            <div className="flex gap-2 mt-2">
                               <button 
                                 onClick={() => onUpdateTicket(ticket.id, { customerQuoteAccepted: 'Onaylandı', customerQuoteResponseDate: new Date().toISOString() })}
                                 className="bg-green-600 hover:bg-green-500 text-white text-[10px] px-3 py-1.5 rounded-lg font-black transition-all active:scale-95 shadow-lg shadow-green-900/20"
                               >
                                 TEKLİFİ ONAYLA
                               </button>
                               <button 
                                 onClick={() => onUpdateTicket(ticket.id, { customerQuoteAccepted: 'Reddedildi', customerQuoteResponseDate: new Date().toISOString() })}
                                 className="bg-red-600 hover:bg-red-500 text-white text-[10px] px-3 py-1.5 rounded-lg font-black transition-all active:scale-95 shadow-lg shadow-red-900/20"
                               >
                                 TEKLİFİ REDDET
                               </button>
                            </div>
                          )}
                        </div>
                      }
                      isCompleted={true} 
                    />
                )}

                {ticket.customerQuoteGiven && ticket.customerQuoteAccepted !== 'Bekleniyor' && (
                    <TimelineItem 
                      title={`Teklif Müşteri Tarafından ${ticket.customerQuoteAccepted === 'Onaylandı' ? 'Onaylandı' : 'Reddedildi'}`}
                      date={ticket.customerQuoteResponseDate}
                      subTitle={
                        <div className="flex flex-col gap-1">
                           <span className={`flex items-center gap-2 font-black ${ticket.customerQuoteAccepted === 'Onaylandı' ? 'text-green-400' : 'text-red-400'}`}>
                              {ticket.customerQuoteAccepted === 'Onaylandı' ? <CheckSquare size={14}/> : <X size={14}/>}
                              {ticket.customerQuoteAccepted === 'Onaylandı' ? 'MÜŞTERİ ONAYI ALINDI' : 'MÜŞTERİ TEKLİFİ REDDETTİ'}
                           </span>
                           {ticket.customerQuoteDate && ticket.customerQuoteResponseDate && (
                             <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">
                                Onay Süreci: {formatDuration(ticket.customerQuoteDate, ticket.customerQuoteResponseDate)} sürdü
                             </span>
                           )}
                        </div>
                      }
                      isCompleted={true}
                    />
                )}

                <TimelineItem title={STATUS_LABELS.RETURNED + (ticket.repairType ? ` (${ticket.repairType})` : '')} date={ticket.dateReturned} personnel={ticket.personnelReturned} isCompleted={currentIndex >= 2} />
                <TimelineItem title={STATUS_LABELS.DELIVERED} date={ticket.dateDelivered} personnel={ticket.personnelDelivered} isCompleted={currentIndex >= 3} isLast={true} />
              </div>
              
              <div className={`mt-8 border border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition-colors ${ticket.status === STATUS_LABELS.DELIVERED ? 'bg-[#0f172a] text-slate-400' : 'bg-blue-900/10 text-blue-400 border-blue-900/20'}`}>
                <div className="flex items-center gap-1.5">
                  <Clock size={16} className={ticket.status !== STATUS_LABELS.DELIVERED ? "animate-pulse" : "text-slate-500"}/>
                  <span className="text-[10px] font-black uppercase tracking-widest">{ticket.status === STATUS_LABELS.DELIVERED ? 'TOPLAM SÜRE' : 'İŞLEM SÜRESİ'}</span>
                </div>
                <span className="text-xl font-black">{ticket.status === STATUS_LABELS.DELIVERED ? formatDuration(ticket.dateReceived, ticket.dateDelivered) : formatDuration(ticket.dateReceived, currentTime.toISOString())}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YENİLENEN GENİŞLETİLEBİLİR GEÇMİŞ EKRANI */}
      {activeTab === 'gecmis' && (
        <div className="bg-slate-900 rounded-3xl shadow-sm border border-slate-800 p-4 sm:p-8 transition-colors">
          {historyTickets.length === 0 ? (
            <div className="text-center py-16 text-slate-400"><History size={64} className="mx-auto text-slate-700 mb-4" /><p className="font-bold text-lg">Bu cihaz için başka geçmiş kayıt bulunamadı.</p></div>
          ) : (
            <div className="space-y-4">
              {historyTickets.map(hist => {
                const isExpanded = expandedHistoryId === hist.id;
                return (
                  <div key={hist.id} className="bg-[#0f172a] rounded-2xl border border-slate-800 overflow-hidden transition-all duration-300">
                    
                    <div 
                      onClick={() => setExpandedHistoryId(isExpanded ? null : hist.id)} 
                      className="p-4 sm:p-5 flex justify-between items-start sm:items-center cursor-pointer hover:bg-slate-800 transition-colors gap-3"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1.5">
                          <span className="font-black text-white text-base sm:text-lg truncate block">{hist.id}</span>
                          <span className="text-[10px] text-slate-300 font-bold bg-slate-700 px-2.5 py-1 rounded-lg uppercase tracking-wider inline-block w-max flex-shrink-0">{formatDateTime(hist.dateReceived)}</span>
                        </div>
                        <div className="text-sm text-slate-400 line-clamp-1 font-medium break-all sm:break-normal">Şikayet: {hist.complaint}</div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4 flex-shrink-0">
                        <div className="hidden sm:block">
                          <StatusBadge status={hist.status} repairType={hist.repairType} />
                        </div>
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 shadow-sm flex items-center justify-center flex-shrink-0 border border-slate-600">
                          {isExpanded ? <ChevronUp size={18} className="text-blue-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-900 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2 fade-in transition-colors">
                        <div className="space-y-6">
                          <div className="sm:hidden mb-4">
                             <StatusBadge status={hist.status} repairType={hist.repairType} />
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Müşteri Şikayeti</span>
                            <p className="text-sm font-medium text-slate-200 bg-[#0f172a] p-4 rounded-xl border border-slate-800 leading-relaxed">{hist.complaint || '-'}</p>
                          </div>
                          {hist.repairType && (
                            <div>
                              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5 mb-2"><Wrench size={12}/> Yapılan İşlem ({hist.repairType})</span>
                              <p className="text-sm font-medium text-slate-200 bg-blue-900/20 p-4 rounded-xl border border-blue-900/50 leading-relaxed">{hist.serviceNote || '-'}</p>
                            </div>
                          )}
                        </div>

                        <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 h-max space-y-5 transition-colors">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-slate-500 uppercase tracking-wider block font-bold mb-1">Teslim Alınma</span>
                              <span className="text-slate-200 font-black text-sm">{formatDateTime(hist.dateReceived)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 uppercase tracking-wider block font-bold mb-1">Teslim Edilme</span>
                              <span className="text-slate-200 font-black text-sm">{hist.dateDelivered ? formatDateTime(hist.dateDelivered) : '-'}</span>
                            </div>
                          </div>
                          
                          {hist.dateSent && hist.dateReturned && (
                            <div className="grid grid-cols-2 gap-4 text-xs border-t border-slate-800 pt-4">
                              <div>
                                <span className="text-slate-500 uppercase tracking-wider block font-bold mb-1">Servise Gidiş</span>
                                <span className="text-slate-200 font-black text-sm">{formatDateTime(hist.dateSent)}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 uppercase tracking-wider block font-bold mb-1">Servisten Dönüş</span>
                                <span className="text-slate-200 font-black text-sm">{formatDateTime(hist.dateReturned)}</span>
                              </div>
                            </div>
                          )}

                          {hist.dateReceived && hist.dateDelivered && (
                            <div className="mt-4 flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl shadow-sm transition-colors">
                              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wide"><Clock size={16} className="text-blue-400"/> İşlem Süresi</span>
                              <span className="text-base font-black text-white">{formatDuration(hist.dateReceived, hist.dateDelivered)}</span>
                            </div>
                          )}
                          
                          <div className="text-xs font-medium text-slate-500 text-right pt-2">
                            İşlemi Yapan: <span className="text-slate-300 font-black">{hist.personnel}</span>
                          </div>

                          {historyPhotos[hist.id] && historyPhotos[hist.id].length > 0 && (
                            <div className="pt-4 border-t border-slate-800">
                               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Geçmiş Kayıt Fotoğrafları</span>
                               <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                 {historyPhotos[hist.id].map(photo => (
                                   <div key={photo.id} onClick={() => setViewPhoto(photo.url)} className="w-20 h-20 rounded-xl overflow-hidden border border-slate-700 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
                                      <img src={photo.url} className="w-full h-full object-cover" />
                                   </div>
                                 ))}
                               </div>
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UnfinishedTicketModal({ ticket, onClose, onSubmit }) {
  const localIsoString = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  
  const [closureData, setClosureData] = useState({
    repairType: 'Garantili',
    serviceNote: '',
    deliveryDate: localIsoString
  });

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 overflow-hidden transition-colors border border-slate-800">
        <div className="p-5 border-b border-slate-800 bg-orange-900/20 flex justify-between items-center transition-colors">
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className="text-orange-400" />
            <div>
              <h3 className="font-black text-xl text-white">Devam Eden Kayıt Tespit Edildi</h3>
              <p className="text-xs text-slate-400 font-bold mt-1">Bu cihazın işlemi henüz kapatılmamış.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-500 hover:bg-slate-700 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 transition-colors">
            <div className="text-sm font-black text-white mb-1">{ticket.customer}</div>
            <div className="text-xs text-slate-400 mb-2">SN: {ticket.serialNumber} | Durum: {ticket.status}</div>
            <div className="text-xs text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800">{ticket.complaint || 'Şikayet belirtilmemiş.'}</div>
          </div>

          <p className="text-sm text-slate-300 font-medium">Yeni kayıt açabilmek için öncelikle bu cihazın açık olan kaydını kapatmalısınız. Geçmişte teslim ettiyseniz teslim tarihini ve yapılan işlemi girerek süreci tamamlayın.</p>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Teslim Tarihi (Kapatma Tarihi)</label>
              <input type="datetime-local" value={closureData.deliveryDate} onChange={e => setClosureData({...closureData, deliveryDate: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Onarım Tipi</label>
              <select value={closureData.repairType} onChange={e => setClosureData({...closureData, repairType: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold transition-colors">
                <option value="Garantili">Garantili</option>
                <option value="Ücretli">Ücretli</option>
                <option value="İşlem Yapılmadı">İşlem Yapılmadı</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Servis / Onarım Notu</label>
              <input type="text" value={closureData.serviceNote} onChange={e => setClosureData({...closureData, serviceNote: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-colors" placeholder="Yapılan işlem..." />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-800 bg-slate-950 flex justify-end gap-3 transition-colors">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-300 font-bold hover:bg-slate-800 transition-colors">İptal</button>
          <button onClick={() => onSubmit(ticket.id, closureData)} className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black shadow-md flex items-center gap-2 transition-colors"><CheckCircle size={18}/> Kaydı Kapat ve Devam Et</button>
        </div>
      </div>
    </div>
  );
}

function DeviceHistoryModal({ serialNumber, allTickets, onClose, currentTime }) {
  const history = allTickets.filter(t => t.serialNumber === serialNumber).sort((a,b) => new Date(b.dateReceived) - new Date(a.dateReceived));

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 overflow-hidden transition-colors border border-slate-800 flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex justify-between items-center transition-colors">
          <div>
            <h3 className="font-black text-xl text-white flex items-center gap-2"><History size={20} className="text-blue-500"/> Cihaz Geçmişi</h3>
            <p className="text-xs text-slate-400 font-mono mt-1">SN: {serialNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:bg-slate-700 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-slate-950/50 transition-colors">
          {history.map(t => (
            <div key={t.id} className="bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-white">{t.customer}</div>
                <StatusBadge status={t.status} repairType={t.repairType} />
              </div>
              <div className="text-xs text-slate-400 mb-3">{formatDateTime(t.dateReceived)}</div>
              <div className="text-sm font-medium text-slate-300">
                <span className="text-xs text-slate-500 block mb-1">Şikayet:</span>
                {t.complaint || '-'}
              </div>
              {t.repairType && (
                <div className="mt-3 pt-3 border-t border-slate-700 text-sm font-medium text-slate-300 transition-colors">
                   <span className="text-xs text-slate-500 block mb-1">Yapılan İşlem ({t.repairType}):</span>
                   {t.serviceNote || '-'}
                </div>
              )}
            </div>
          ))}
          {history.length === 0 && <p className="text-center text-slate-500 font-bold py-10">Kayıt bulunamadı.</p>}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, repairType }) {
  const styles = {
    [STATUS_LABELS.RECEIVED]: 'bg-orange-900/30 text-orange-400 border-orange-800',
    [STATUS_LABELS.SENT]: 'bg-blue-900/30 text-blue-400 border-blue-800',
    [STATUS_LABELS.RETURNED]: 'bg-green-900/30 text-green-400 border-green-800',
    [STATUS_LABELS.DELIVERED]: 'bg-slate-800 text-slate-400 border-slate-700',
  };
  
  const label = status === STATUS_LABELS.RETURNED && repairType 
    ? `${status} (${repairType})` 
    : status;

  return <span className={`px-2.5 py-1 text-[10px] md:text-xs font-bold rounded-lg flex-shrink-0 border ${styles[status]} text-center transition-colors uppercase tracking-tight`}>{label}</span>;
}

function TimelineItem({ title, date, personnel, subTitle, isCompleted, isLast }) {
  return (
    <div className="flex relative">
      {!isLast && <div className={`absolute top-6 bottom-[-8px] left-[11px] w-0.5 ${isCompleted ? 'bg-blue-500' : 'bg-slate-800'}`}></div>}
      <div className="mr-5 mt-1 relative z-10">
        <div className={`w-6 h-6 rounded-full border-[3.5px] flex items-center justify-center transition-all duration-500 ${isCompleted ? 'bg-slate-950 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-slate-900 border-slate-700'}`}>
          {isCompleted && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>}
        </div>
      </div>
      <div className="pb-8 flex-1">
        <div className={`text-sm md:text-base font-black tracking-tight leading-none ${isCompleted ? 'text-white' : 'text-slate-600'}`}>{title}</div>
        
        {/* ALT DAL (SUB-BRANCH) BİLGİSİ */}
        {subTitle && (
          <div className="mt-2 ml-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800/50 inline-flex items-center text-[11px] font-black uppercase tracking-widest shadow-inner">
            {subTitle}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 ml-1">
          {date && (
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 opacity-80 font-bold">
              <Clock size={10} className="text-slate-600"/> {formatDateTime(date)}
            </div>
          )}
          {personnel && isCompleted && (
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 font-bold">
              <span className="text-[9px] uppercase font-black text-slate-600 opacity-50">İŞLEM:</span> 
              <span className="text-slate-300">{personnel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerStatusView() {
  const [sn, setSn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ticketData, setTicketData] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!sn.trim()) return;
    setLoading(true); setError(''); setTicketData(null);
    try {
      const res = await apiFetch(`${API_URL}/tickets`);
      if (res.ok) {
        const allTickets = await res.json();
        const found = allTickets.filter(t => t.serialNumber.trim().toUpperCase() === sn.trim().toUpperCase());
        if (found.length > 0) {
          found.sort((a,b) => new Date(b.dateReceived) - new Date(a.dateReceived));
          setTicketData(found);
        } else {
          setError('Bu seri numarasına ait kayıt bulunamadı.');
        }
      } else {
        setError('Sunucu hatası.');
      }
    } catch (err) {
      setError('Bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-4 text-slate-100">
      <div className="w-full max-w-lg mt-10">
         <div className="text-center mb-10">
            <img src={LOGO_URL} alt="Logo" className="h-16 mx-auto mb-6 object-contain drop-shadow-lg" />
            <h1 className="text-3xl font-black text-white uppercase tracking-widest drop-shadow-md">Onarım Durumu</h1>
            <p className="text-slate-400 text-sm mt-3 font-medium">Servise bıraktığınız cihazınızın seri numarasını (SN) girerek güncel durumunu öğrenebilirsiniz.</p>
         </div>
         <form onSubmit={handleSearch} className="bg-[#0f172a] p-6 rounded-3xl border border-slate-800 shadow-2xl mb-8 flex flex-col gap-4">
            <div>
               <div className="relative">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" value={sn} onChange={e => setSn(e.target.value)} placeholder="Seri No (Örn: ABC12345)" className="w-full pl-12 pr-5 py-4 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none uppercase shadow-inner" />
               </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition-all shadow-lg disabled:opacity-50">{loading ? 'Sorgulanıyor...' : 'Durumu Sorgula'}</button>
         </form>

         {error && <div className="bg-red-900/30 border border-red-900/50 text-red-400 p-4 rounded-2xl text-center font-bold text-sm mb-6 flex items-center justify-center gap-2"><AlertCircle size={18}/> {error}</div>}

         {ticketData && (
            <div className="bg-[#0f172a] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8">
               <div className="p-6 border-b border-slate-800 bg-slate-900/50">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Güncel Cihaz Durumu</div>
                  <div className="text-xl font-black text-white flex items-center gap-2"><Smartphone size={20} className="text-slate-400"/> {ticketData[0].brand} {ticketData[0].model}</div>
                  <div className="mt-4 flex gap-2 w-full justify-between items-center text-xs text-slate-400">
                    <span className="font-mono font-bold bg-slate-800 border border-slate-700 px-2.5 py-1.5 rounded-lg text-slate-300">SN: {ticketData[0].serialNumber}</span>
                    <span className="font-bold bg-blue-900/30 text-blue-400 px-2.5 py-1.5 rounded-lg border border-blue-900/50">Kayıt No: {ticketData[0].id}</span>
                  </div>
               </div>
               
               <div className="p-6 space-y-8 bg-slate-950/20">
                  {/* Sadece En Güncel Kayıt */}
                  <div className="relative">
                     <div className="mb-4 flex items-center justify-between">
                        <StatusBadge status={ticketData[0].status} repairType={ticketData[0].repairType} />
                        <span className="text-xs font-bold text-slate-500">{formatDateTime(ticketData[0].dateReceived)}</span>
                     </div>
                     
                     <div className="space-y-4">
                        <div className="text-sm text-slate-300 font-medium bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
                           <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                           <span className="text-[10px] text-blue-400 uppercase font-black tracking-widest block mb-1.5 flex items-center gap-1"><AlertCircle size={12}/> Müşteri Şikayeti</span>
                           <div className="leading-relaxed">{ticketData[0].complaint || '-'}</div>
                        </div>

                        {/* Müşteri Notları (Yeni Sistem) */}
                        {(ticketData[0].notes || []).filter(n => n.type === 'public').map(note => (
                           <div key={note.id} className="text-sm text-slate-300 font-medium bg-blue-900/10 p-4 rounded-xl border border-blue-900/30 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
                              <span className="text-[10px] text-blue-400 uppercase font-black tracking-widest block mb-1.5 flex items-center gap-1"><Info size={12}/> Müşteri Notu</span>
                              <div className="leading-relaxed">{note.text}</div>
                              <div className="text-[10px] text-slate-500 mt-2 italic">{formatDateTime(note.date)}</div>
                           </div>
                        ))}

                        {/* Teklif Durumu (Fiyatsız) */}
                        {ticketData[0].customerQuoteDate && (
                           <div className="text-sm text-slate-300 font-medium bg-emerald-900/10 p-4 rounded-xl border border-emerald-900/30 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
                              <span className="text-[10px] text-emerald-400 uppercase font-black tracking-widest block mb-1.5 flex items-center gap-1"><DollarSign size={12}/> Teklif Durumu</span>
                              <div className="leading-relaxed">
                                 {ticketData[0].customerQuoteStatus === 'Onaylandı' ? 'Teklifiniz onaylandı, işlemler devam ediyor.' : 
                                  ticketData[0].customerQuoteStatus === 'Reddedildi' ? 'Teklif reddedildi.' : 
                                  'Cihazınız için onarım teklifi iletilmiştir. Onayınız bekleniyor.'}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-2 italic">Son İşlem: {formatDateTime(ticketData[0].customerQuoteResponseDate || ticketData[0].customerQuoteDate)}</div>
                           </div>
                        )}

                        {/* Eski Sistem Notu (Geriye dönük uyumluluk için) */}
                        {ticketData[0].serviceNote && (!ticketData[0].notes || ticketData[0].notes.length === 0) && (
                           <div className="text-sm text-slate-300 font-medium bg-blue-900/10 p-4 rounded-xl border border-blue-900/30 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
                              <span className="text-[10px] text-blue-400 uppercase font-black tracking-widest block mb-1.5 flex items-center gap-1"><Info size={12}/> Müşteri Notu</span>
                              <div className="leading-relaxed">{ticketData[0].serviceNote || '-'}</div>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Geçmiş Kayıtlar Accordion */}
                  {ticketData.length > 1 && (
                     <div className="pt-4 border-t border-slate-800/50">
                        <button onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center justify-between p-4 bg-slate-900/40 rounded-2xl hover:bg-slate-900 transition-all border border-slate-800 group">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-400 transition-colors">
                                 <History size={16} />
                              </div>
                              <span className="text-sm font-black text-slate-300">Geçmiş Servis Kayıtları ({ticketData.length - 1})</span>
                           </div>
                           {showHistory ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
                        </button>

                        {showHistory && (
                           <div className="mt-4 space-y-6 pl-4 border-l-2 border-slate-800 animate-in slide-in-from-top-2">
                              {ticketData.slice(1).map((t) => (
                                 <div key={t.id} className="relative">
                                    <div className="flex items-center justify-between mb-2">
                                       <span className="text-[10px] font-black text-slate-500">{formatDateTime(t.dateReceived)}</span>
                                       <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">{t.status}</span>
                                    </div>
                                    <div className="text-xs text-slate-400 leading-relaxed italic border-l border-slate-700 pl-3">
                                       <span className="text-[9px] uppercase font-black text-slate-600 block not-italic mb-0.5">Eski Şikayet:</span>
                                       {t.complaint}
                                    </div>
                                    {t.serviceNote && (
                                       <div className="mt-2 text-xs text-blue-400/70 leading-relaxed italic border-l border-blue-900/30 pl-3">
                                          <span className="text-[9px] uppercase font-black text-blue-900 block not-italic mb-0.5">Servis İşlem Notu:</span>
                                          {t.serviceNote}
                                       </div>
                                    )}
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  )}
               </div>
            </div>
         )}
         
         <div className="text-center mt-8 text-xs text-slate-600 font-medium">Bu ekrandaki veriler bilgilendirme amaçlıdır.</div>
      </div>
    </div>
  );
}

function RootSetupWizard({ currentUser, onAdminCreated, onDisableBackdoor }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ username: '', password: '', displayName: '', role: 'admin' });
  const [loading, setLoading] = useState(false);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setStep(2);
        onAdminCreated();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Kullanıcı oluşturulamadı.');
      }
    } catch (err) {
      alert('Bağlantı hatası.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="p-8 text-center bg-slate-950/50 relative">
           <button onClick={() => { localStorage.removeItem('tech_servis_user'); window.location.reload(); }} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 text-xs font-bold border border-slate-800 px-3 py-1.5 rounded-xl bg-slate-900 transition-all flex items-center gap-2">
              <LogOut size={14} /> Çıkış Yap
           </button>
           <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-500/30">
              <Shield size={40} className="text-blue-500" />
           </div>
           <h2 className="text-2xl font-black text-white">Sistem Kurulumu</h2>
           <p className="text-slate-400 text-sm mt-2 font-medium">Güvenliğiniz için ilk admin hesabınızı oluşturun.</p>
        </div>
        
        <div className="p-8">
          {step === 1 ? (
            <form onSubmit={handleCreateAdmin} className="space-y-4">
               <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Admin Kullanıcı Adı</label><input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: admin_onur" /></div>
               <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Admin Şifresi</label><input required type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Güçlü bir şifre seçin" /></div>
               <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Görünür İsim</label><input required type="text" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Örn: Onur Yılmaz" /></div>
               <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-2xl mt-4 shadow-lg shadow-blue-900/20 transition-all active:scale-95">{loading ? 'Kaydediliyor...' : 'Hesabı Oluştur ve Devam Et'}</button>
            </form>
          ) : (
            <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4">
               <div className="bg-green-900/20 border border-green-900/50 p-6 rounded-3xl">
                  <CheckCircle size={32} className="text-green-500 mx-auto mb-3" />
                  <p className="text-sm font-bold text-green-400">Yönetici hesabı başarıyla oluşturuldu!</p>
               </div>
               <div className="space-y-4">
                  <p className="text-xs text-slate-400 font-medium px-4 leading-relaxed">Artık kendi hesabınızla giriş yapabilirsiniz. Güvenliğiniz için geçici <b>root (arka kapı)</b> erişimini şimdi kapatmak ister misiniz?</p>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => { onDisableBackdoor(); }} className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-red-900/20">Evet, Root Erişimini Kapat</button>
                    <button onClick={() => window.location.reload()} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-2xl text-sm underline underline-offset-4">Şimdilik Açık Kalsın</button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}