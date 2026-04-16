import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// ES Module ortamında __dirname varsayılan olarak gelmediği için manuel tanımlıyoruz:
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors({
    origin: true, // This allows any origin correctly reflective, supporting credentials
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-api-key']
}));

const API_KEY = process.env.API_KEY || 'devoteam_secure_api_key_2026';
const authMiddleware = (req, res, next) => {
    // If it's an OPTIONS request, allow it
    if (req.method === 'OPTIONS') return next();
    
    const key = req.headers['x-api-key'];
    if (key !== API_KEY) {
        return res.status(401).json({ error: 'Yetkisiz erişim' });
    }
    next();
};

app.use(authMiddleware);

// ÖNEMLİ: Fotoğraflar (Base64) büyük yer kapladığı için sunucunun veri kabul limitini 50MB'a çıkarıyoruz.
app.use(express.json({ limit: '50mb' }));

// --- PostgreSQL Bağlantısı ---
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://devoteam:devoteam_db_password@db-postgres:5432/devoteam_db'
});

const readDb = async (resource) => {
    try {
        const res = await pool.query('SELECT data FROM docs WHERE resource = $1', [resource]);
        return res.rows.map(r => r.data);
    } catch (e) {
        console.error('DB Error:', e);
        return [];
    }
};

const writeDbRecord = async (resource, id, data) => {
    await pool.query(
        'INSERT INTO docs (resource, id, data) VALUES ($1, $2, $3) ON CONFLICT (resource, id) DO UPDATE SET data = $3',
        [resource, String(id), data]
    );
};

const deleteDbRecord = async (resource, id) => {
    await pool.query('DELETE FROM docs WHERE resource = $1 AND id = $2', [resource, String(id)]);
};

// --- YEDEKLEME İŞLEMLERİ ---
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

const createBackup = async () => {
    try {
        const res = await pool.query('SELECT * FROM docs');
        const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;
        fs.writeFileSync(path.join(backupDir, filename), JSON.stringify(res.rows));
        console.log(`✅ Yedek alındı: ${filename}`);
        
        const files = fs.readdirSync(backupDir);
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        files.forEach(f => {
            const stats = fs.statSync(path.join(backupDir, f));
            if (stats.mtimeMs < thirtyDaysAgo) {
                fs.unlinkSync(path.join(backupDir, f));
                console.log(`🗑️ Eski yedek silindi: ${f}`);
            }
        });
    } catch (e) { console.error('Yedekleme hatası:', e); }
};

setInterval(() => {
    const now = new Date();
    if (now.getHours() === 3) {
        const filename = `backup-${now.toISOString().split('T')[0]}.json`;
        if (!fs.existsSync(path.join(backupDir, filename))) {
            createBackup();
        }
    }
}, 60 * 60 * 1000);

// --- DİNAMİK REST API YÖNETİMİ ---
const resources = ['tickets', 'users', 'logs', 'photos'];

resources.forEach(resource => {
    // GET: Tüm listeyi getir veya Query ile filtrele
    app.get(`/${resource}`, async (req, res) => {
        let data = await readDb(resource);
        
        // Remove passwords from users response
        if (resource === 'users') {
            data = data.map(({ password, ...user }) => user);
        }

        if (Object.keys(req.query).length > 0) {
            data = data.filter(item => {
                return Object.entries(req.query).every(([key, val]) => String(item[key]) === String(val));
            });
        }
        res.json(data);
    });

    // GET: Tekil ID bul
    app.get(`/${resource}/:id`, async (req, res) => {
        const data = await readDb(resource);
        const item = data.find(i => String(i.id) === String(req.params.id));
        item ? res.json(item) : res.status(404).json({ error: "Kayıt bulunamadı" });
    });

    // POST: Yeni kayıt ekle
    app.post(`/${resource}`, async (req, res) => {
        const newItem = { ...req.body, id: req.body.id || Date.now().toString() };
        await writeDbRecord(resource, newItem.id, newItem);
        res.status(201).json(newItem);
    });

    // PATCH: Sadece değişen veriyi güncelle
    app.patch(`/${resource}/:id`, async (req, res) => {
        const data = await readDb(resource);
        const index = data.findIndex(i => String(i.id) === String(req.params.id));
        if (index !== -1) {
            const updatedItem = { ...data[index], ...req.body };
            await writeDbRecord(resource, updatedItem.id, updatedItem);
            res.json(updatedItem);
        } else {
            res.status(404).json({ error: "Kayıt bulunamadı" });
        }
    });

    // DELETE: Kaydı sil
    app.delete(`/${resource}/:id`, async (req, res) => {
        await deleteDbRecord(resource, req.params.id);
        res.json({ success: true });
    });
});

// --- SETTINGS (AYARLAR) İÇİN ÖZEL API ---
app.get('/settings/global', async (req, res) => {
    const data = await readDb('settings');
    const globalSettings = data.find(s => s.id === 'global') || {};
    res.json(globalSettings);
});

app.put('/settings/global', async (req, res) => {
    const newSettings = { ...req.body, id: 'global' };
    await writeDbRecord('settings', 'global', newSettings);
    res.json(newSettings);
});

// --- AUTH API ---
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    // Root backdoor (hardcoded fallback)
    if (username === 'root' && password === '1234') {
        const rootUser = { 
            id: 'root', 
            username: 'root', 
            displayName: 'Sistem Yöneticisi', 
            role: 'admin', 
            permissions: { canManageCustomers: true, canManageBrands: true, canDeleteTickets: true } 
        };
        return res.json({ success: true, user: rootUser });
    }

    const data = await readDb('users');
    const validUser = data.find(u => u.username === username && u.password === password);
    
    if (validUser) {
        const { password: _, ...userData } = validUser;
        res.json({ success: true, user: userData });
    } else {
        res.status(401).json({ success: false, error: 'Kullanıcı adı veya şifre hatalı' });
    }
});

// --- SYSTEM YEDEKLEME API ---
app.get('/system/backup', async (req, res) => {
    try {
        const data = await pool.query('SELECT * FROM docs');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="devoteam-db-backup-${new Date().toISOString().split('T')[0]}.json"`);
        res.send(JSON.stringify(data.rows));
    } catch (e) {
        res.status(500).json({ error: 'Yedek indirme başarısız' });
    }
});

app.post('/system/restore', async (req, res) => {
    try {
        const rows = req.body;
        if (!Array.isArray(rows)) return res.status(400).json({ error: 'Geçersiz format' });
        
        for (const row of rows) {
            if (row.resource && row.id && row.data) {
                await writeDbRecord(row.resource, row.id, row.data);
            }
        }
        res.json({ success: true, message: `${rows.length} kayıt başarıyla geri yüklendi.` });
    } catch (e) {
        res.status(500).json({ error: 'Geri yükleme başarısız' });
    }
});

// Sunucuyu Başlat
app.listen(4001, () => {
    console.log('✅ YENİ API SUNUCUSU 4001 PORTUNDA ÇALIŞIYOR!');
    console.log('📂 Verileriniz artık POSTGRESQL veritabanında tutulmaktadır.');
});