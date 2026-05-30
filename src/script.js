// 1. Ambil elemen HTML yang punya id "current-date"
const dateElement = document.getElementById('current-date');

// 2. Buat fungsi untuk mengambil dan memformat tanggal hari ini
function displayRealDate() {
  const today = new Date();
  
  // Format tanggal khusus Indonesia (Contoh: Sabtu, 30 Mei 2026)
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  const formattedDate = today.toLocaleDateString('id-ID', options);
  
  // 3. Masukkan tanggalnya ke dalam HTML
  if (dateElement) {
    dateElement.innerText = formattedDate;
  }
}

// Jalankan fungsinya saat halaman web dibuka
displayRealDate();