# Esports Muhasebe

Türkçe arayüzlü gelir-gider paneli. Express sunucusu ve SQLite kullanır.

## Dağıtım
Bu uygulama yalnızca Netlify'ın statik yayınlama özelliğiyle çalışmaz; Node.js sunucusu ve kalıcı disk gerekir. `render.yaml` bir Render web servisi ve kalıcı disk tanımlar. Bu yapılandırma ücretli plan gerektirebilir; dağıtımdan önce sağlayıcının güncel ücretlerini kontrol edin.

Ortam değişkenleri:
- `NODE_ENV=production`
- `DATA_DIR=/var/data`
- `ADMIN_EMAIL` — yönetici e-postası
- `ADMIN_PASSWORD_HASH` — `npm run make-password-hash` komutuyla oluşturulur
- `SESSION_SECRET` — rastgele, en az 32 karakter

Parolayı veya `.env` dosyasını GitHub'a yüklemeyin. Gerçek finansal verileri kullanmadan önce yedekleme ve güvenlik incelemesi yapın.
