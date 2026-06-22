# Aktifkan fungsi lupa kata laluan

Antara muka aplikasi dan backend Google Apps Script perlu diterbitkan bersama.

1. Salin kandungan terkini `apps-script/Code.gs` ke projek Apps Script yang digunakan oleh Smart Lab.
2. Pilih **Deploy > Manage deployments**.
3. Edit deployment Web app, pilih **New version**, kemudian tekan **Deploy**.
4. Kekalkan akses Web app seperti deployment semasa supaya URL tidak berubah.
5. Pastikan Apps Script diberi kebenaran menghantar emel melalui `MailApp`.

## Ujian

1. Buka halaman log masuk dan tekan **Lupa kata laluan?**.
2. Masukkan emel pengguna yang berdaftar.
3. Semak emel untuk kod 6 digit.
4. Masukkan kod serta kata laluan baharu sekurang-kurangnya 4 aksara.
5. Log masuk menggunakan kata laluan baharu.

Kod sah selama 10 minit, dihadkan kepada lima percubaan, dan permintaan kod dihadkan sekali seminit bagi setiap emel.
