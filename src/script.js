const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const todoBody = document.getElementById('todo-body');
const searchStatus = document.getElementById('search-status'); // Tangkap element status

function jalankanPencarian() {
  if (!searchInput || !todoBody || !searchStatus) return;

  const kataKunci = searchInput.value.toLowerCase().trim();
  const semuaBaris = todoBody.getElementsByTagName('tr');
  
  // Jika kolom input kosong, normalkan tabel dan sembunyikan status tulisan
  if (kataKunci === "") {
    for (let i = 0; i < semuaBaris.length; i++) {
      semuaBaris[i].style.display = "";
    }
    searchStatus.classList.add('hidden');
    return;
  }

  let ditemukan = false; // Variabel penanda untuk cek status ada/tidak

  for (let i = 0; i < semuaBaris.length; i++) {
    const baris = semuaBaris[i];
    const kolomKegiatan = baris.querySelector('.nama-kegiatan');

    if (kolomKegiatan) {
      const teksKegiatan = (kolomKegiatan.textContent || '').toLowerCase();

      if (teksKegiatan.includes(kataKunci)) {
        baris.style.display = ""; 
        ditemukan = true; // Tandai true jika ada minimal 1 data yang cocok
      } else {
        baris.style.display = "none"; 
      }
    }
  }

  // LOGIKA MUNCULIN TULISAN JAWABAN DI BAWAH INPUT
  searchStatus.classList.remove('hidden'); // Munculkan element statusnya

  if (ditemukan) {
    searchStatus.textContent = "✅ Hasil pencarian: Ada!";
    searchStatus.className = "mt-2 text-sm font-semibold text-center text-emerald-600"; // Warna hijau
  } else {
    searchStatus.textContent = "❌ Hasil pencarian: Tidak Ada";
    searchStatus.className = "mt-2 text-sm font-semibold text-center text-rose-600"; // Warna merah
  }
}

// Jalankan fungsi ketika tombol cari diklik
if (searchButton && searchInput) {
  searchButton.addEventListener('click', jalankanPencarian);
  
  // Opsi: Jika ingin tulisan "Ada/Tidak" langsung berubah otomatis pas mengetik, aktifkan ini:
  searchInput.addEventListener('input', jalankanPencarian);
}

