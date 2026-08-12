// ============================================================
// TaskMaster - script.js
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const daysShort = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  const LS_ACTIVITIES = 'todo_activities';
  const LS_CHECKS = 'todo_checkboxes';
  const LS_VIEW = 'todo_view';
  const LS_COMPLETION_LOG = 'todo_completion_log';

  const CATEGORIES = {
    Kuliah:    { label: 'Kuliah',    color: 'sky' },
    Kesehatan: { label: 'Kesehatan', color: 'emerald' },
    Personal:  { label: 'Personal',  color: 'amber' },
    Coding:    { label: 'Coding',    color: 'fuchsia' },
    Lainnya:   { label: 'Lainnya',   color: 'slate' },
  };

  let activities = JSON.parse(localStorage.getItem(LS_ACTIVITIES)) || [
    { id: 1, time: '03.00 AM', name: 'Bangun Pagi & Sholat', category: 'Personal' },
    { id: 2, time: '08.00 AM', name: 'Workout Tipis-Tipis', category: 'Kesehatan' },
    { id: 3, time: '08.00 PM', name: 'Ngoding Portfolio', category: 'Coding' }
  ];
  activities = activities.map(a => ({ category: 'Lainnya', ...a }));

  let savedChecks = JSON.parse(localStorage.getItem(LS_CHECKS)) || {};
  let completionLog = JSON.parse(localStorage.getItem(LS_COMPLETION_LOG)) || {};

  let currentFilter = 'Semua';
  let currentView = localStorage.getItem(LS_VIEW) || 'table';
  let progressChart = null;

  const tbody = document.getElementById('todo-body');
  const cardsContainer = document.getElementById('todo-cards');
  const categoryFiltersEl = document.getElementById('categoryFilters');
  const modal = document.getElementById('todoModal');
  const modalCard = document.getElementById('modalCard');
  const openModalBtn = document.getElementById('openModalBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const addTodoForm = document.getElementById('addTodoForm');
  const viewTableBtn = document.getElementById('viewTableBtn');
  const viewCardBtn = document.getElementById('viewCardBtn');
  const yearSelect = document.getElementById('yearSelect');
  const enableNotifBtn = document.getElementById('enableNotifBtn');
  const notifBtnText = document.getElementById('notifBtnText');

  function persistActivities() { localStorage.setItem(LS_ACTIVITIES, JSON.stringify(activities)); }
  function persistChecks() { localStorage.setItem(LS_CHECKS, JSON.stringify(savedChecks)); }
  function persistCompletionLog() { localStorage.setItem(LS_COMPLETION_LOG, JSON.stringify(completionLog)); }

  function formatDate(d) { return d.toISOString().slice(0, 10); }

  function categoryBadgeClasses(catKey) {
    const color = (CATEGORIES[catKey] || CATEGORIES.Lainnya).color;
    return `bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`;
  }

  function getTodayIndex() {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  // ---------------- PWA SERVICE WORKER REGISTRATION ----------------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(() => {
        console.log('ServiceWorker registered successfully.');
      }).catch(err => {
        console.log('ServiceWorker registration failed:', err);
      });
    });
  }

  // ---------------- NOTIFICATION API & REMINDER ----------------
  function initNotifications() {
    if (!('Notification' in window)) {
      if (enableNotifBtn) enableNotifBtn.style.display = 'none';
      return;
    }

    if (Notification.permission === 'granted') {
      updateNotifButtonState(true);
    } else if (Notification.permission === 'denied') {
      updateNotifButtonState(false, 'Notifikasi Ditolak');
    }
  }

  function updateNotifButtonState(isGranted, customText) {
    if (!notifBtnText) return;
    if (customText) {
      notifBtnText.innerText = customText;
      enableNotifBtn.classList.add('opacity-50', 'cursor-not-allowed');
      return;
    }

    if (isGranted) {
      notifBtnText.innerText = 'Pengingat Aktif';
      enableNotifBtn.classList.add('bg-cyan-500/10', 'text-cyan-400', 'border-cyan-500/30');
    } else {
      notifBtnText.innerText = 'Aktifkan Pengingat';
    }
  }

  if (enableNotifBtn) {
    enableNotifBtn.addEventListener('click', () => {
      if (!('Notification' in window)) return;

      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          updateNotifButtonState(true);
          new Notification('TaskMaster', {
            body: 'Pengingat kegiatan aktif! Kamu akan menerima notifikasi sesuai jam jadwal.',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2306b6d4" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
          });
        } else {
          updateNotifButtonState(false, 'Notifikasi Ditolak');
        }
      });
    });
  }

  // Pengecekan Jam Jadwal Setiap 60 Detik untuk Kirim Notifikasi
  function checkScheduledReminders() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const now = new Date();
    const todayIndex = getTodayIndex();
    
    // Format Waktu Sekarang (misal: "08.00 AM")
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const currentTimeStr = `${formattedHours}.${formattedMinutes} ${ampm}`;

    activities.forEach(act => {
      // Jika jam cocok dan tugas belum dicentang hari ini
      const checkKey = `check_${act.id}_${todayIndex}`;
      const isChecked = !!savedChecks[checkKey];

      if (act.time === currentTimeStr && !isChecked) {
        // Kirim Notifikasi Pengingat
        new Notification(`Jadwal: ${act.name}`, {
          body: `Waktunya melakukan kegiatan "${act.name}" (${act.time})! Jangan lupa dicentang.`,
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2306b6d4" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
        });
      }
    });
  }

  // Jalankan pengecekan setiap 60 detik
  setInterval(checkScheduledReminders, 60000);

  // ---------------- TAB SWITCH ----------------
  function switchTab(tab) {
    const secDashboard = document.getElementById('sectionDashboard');
    const secSchedule = document.getElementById('sectionSchedule');
    const navDashboard = document.getElementById('navDashboard');
    const navSchedule = document.getElementById('navSchedule');

    const activeClass = ['bg-cyan-500/10', 'text-cyan-400', 'border', 'border-cyan-500/20'];
    const inactiveClass = ['text-slate-400', 'hover:bg-slate-800', 'hover:text-slate-200'];

    if (tab === 'dashboard') {
      secDashboard.classList.remove('hidden');
      secSchedule.classList.add('hidden');
      navDashboard.classList.add(...activeClass);
      navDashboard.classList.remove(...inactiveClass);
      navSchedule.classList.remove(...activeClass);
      navSchedule.classList.add(...inactiveClass);
      updateDashboardStats();
      updateChart();
    } else {
      secSchedule.classList.remove('hidden');
      secDashboard.classList.add('hidden');
      navSchedule.classList.add(...activeClass);
      navSchedule.classList.remove(...inactiveClass);
      navDashboard.classList.remove(...activeClass);
      navDashboard.classList.add(...inactiveClass);
    }
    closeMobileSidebar();
  }

  // ---------------- STREAK ----------------
  function calculateStreak() {
    const dateSet = new Set(Object.keys(completionLog).filter(d => completionLog[d]));
    if (dateSet.size === 0) return 0;

    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    if (!dateSet.has(formatDate(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }

    while (dateSet.has(formatDate(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function updateStreakDisplay() {
    const streak = calculateStreak();
    const statStreak = document.getElementById('statStreak');
    const streakBadge = document.getElementById('streakBadge');

    if (statStreak) statStreak.innerText = `${streak} hari`;

    if (streakBadge) {
      if (streak >= 1) {
        streakBadge.innerHTML = `🔥 <span>Streak ${streak} hari</span>`;
        streakBadge.classList.remove('hidden');
      } else {
        streakBadge.innerHTML = `Mulai streak kamu hari ini!`;
        streakBadge.classList.remove('hidden');
      }
    }
  }

  function markTodayActive() {
    const todayKey = formatDate(new Date());
    if (!completionLog[todayKey]) {
      completionLog[todayKey] = true;
      persistCompletionLog();
    }
  }

  // ---------------- DASHBOARD STATS & CHART ----------------
  function updateDashboardStats() {
    const totalTasks = activities.length;
    const totalChecks = Object.keys(savedChecks).length;
    const totalPossible = totalTasks * 7;
    const progress = totalPossible > 0 ? Math.round((totalChecks / totalPossible) * 100) : 0;

    document.getElementById('statTotal').innerText = totalTasks;
    document.getElementById('statCompleted').innerText = totalChecks;
    document.getElementById('statProgress').innerText = `${progress}%`;
    updateStreakDisplay();
  }

  function populateYearSelect() {
    if (!yearSelect) return;
    const currentYear = new Date().getFullYear();
    const years = new Set([currentYear]);

    Object.values(savedChecks).forEach(item => {
      if (item && item.timestamp) {
        years.add(new Date(item.timestamp).getFullYear());
      }
    });

    yearSelect.innerHTML = '';
    Array.from(years).sort((a, b) => b - a).forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      option.className = 'bg-slate-900 text-slate-100';
      yearSelect.appendChild(option);
    });

    yearSelect.value = currentYear;
  }

  function getMonthlyDataForYear(year) {
    const monthlyCounts = Array(12).fill(0);
    Object.values(savedChecks).forEach(item => {
      if (item && item.timestamp) {
        const date = new Date(item.timestamp);
        if (date.getFullYear() === parseInt(year)) {
          const monthIdx = date.getMonth();
          monthlyCounts[monthIdx]++;
        }
      }
    });
    return monthlyCounts;
  }

  function updateChart() {
    const chartCanvas = document.getElementById('progressChart');
    if (!chartCanvas) return;

    const selectedYear = (yearSelect && yearSelect.value) ? yearSelect.value : new Date().getFullYear();
    const monthlyData = getMonthlyDataForYear(selectedYear);
    const monthsLabel = ['Bulan 1', 'Bulan 2', 'Bulan 3', 'Bulan 4', 'Bulan 5', 'Bulan 6', 'Bulan 7', 'Bulan 8', 'Bulan 9', 'Bulan 10', 'Bulan 11', 'Bulan 12'];

    const ctx = chartCanvas.getContext('2d');
    if (progressChart) progressChart.destroy();

    progressChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthsLabel,
        datasets: [{
          label: `Tugas Selesai (${selectedYear})`,
          data: monthlyData,
          backgroundColor: 'rgba(6, 182, 212, 0.6)',
          borderColor: 'rgba(6, 182, 212, 1)',
          borderWidth: 2,
          borderRadius: 8,
          hoverBackgroundColor: 'rgba(6, 182, 212, 0.9)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: '#94a3b8' },
            grid: { color: 'rgba(51, 65, 85, 0.3)' }
          },
          x: {
            ticks: { color: '#94a3b8' },
            grid: { display: false }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: '#f1f5f9',
              font: { family: 'Plus Jakarta Sans', weight: '600' }
            }
          }
        }
      }
    });
  }

  function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(' ');
    if (parts.length < 2) return 0;
    const [hoursStr, minsStr] = parts[0].split('.');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minsStr, 10);
    const ampm = parts[1].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  function populateHourSelect() {
    const selectHour = document.getElementById('selectHour');
    selectHour.innerHTML = '';
    for (let h = 1; h <= 12; h++) {
      const hourStr = h < 10 ? `0${h}` : `${h}`;
      ['00', '30'].forEach(min => {
        const timeValue = `${hourStr}.${min}`;
        const option = document.createElement('option');
        option.value = timeValue;
        option.textContent = timeValue;
        option.className = 'bg-slate-900 text-slate-100';
        selectHour.appendChild(option);
      });
    }
  }

  function populateCategorySelect() {
    const select = document.getElementById('selectCategory');
    if (!select) return;
    select.innerHTML = '';
    Object.keys(CATEGORIES).forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = CATEGORIES[key].label;
      option.className = 'bg-slate-900 text-slate-100';
      select.appendChild(option);
    });
  }

  function cleanupOldCheckboxes() {
    const now = Date.now();
    let hasChanges = false;
    Object.keys(savedChecks).forEach(key => {
      if (now - savedChecks[key].timestamp > SEVEN_DAYS_MS) {
        delete savedChecks[key];
        hasChanges = true;
      }
    });
    if (hasChanges) persistChecks();
  }

  function cleanupChecksForActivity(activityId) {
    let hasChanges = false;
    Object.keys(savedChecks).forEach(key => {
      if (key.startsWith(`check_${activityId}_`)) {
        delete savedChecks[key];
        hasChanges = true;
      }
    });
    if (hasChanges) persistChecks();
  }

  function renderFilterButtons() {
    if (!categoryFiltersEl) return;
    const filterKeys = ['Semua', ...Object.keys(CATEGORIES)];

    categoryFiltersEl.innerHTML = filterKeys.map(key => {
      const isActive = currentFilter === key;
      const color = key === 'Semua' ? 'cyan' : CATEGORIES[key].color;
      const activeClasses = `bg-${color}-500/10 text-${color}-400 border-${color}-500/30`;
      const inactiveClasses = 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-800';
      return `
        <button
          data-filter="${key}"
          class="filter-btn px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${isActive ? activeClasses : inactiveClasses}">
          ${key}
        </button>
      `;
    }).join('');

    categoryFiltersEl.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentFilter = btn.getAttribute('data-filter');
        renderFilterButtons();
        renderSchedule();
      });
    });
  }

  function getFilteredActivities() {
    if (currentFilter === 'Semua') return activities;
    return activities.filter(a => (a.category || 'Lainnya') === currentFilter);
  }

  function setView(view) {
    currentView = view;
    localStorage.setItem(LS_VIEW, view);

    const activeCls = ['bg-cyan-500', 'text-slate-950'];
    const inactiveCls = ['text-slate-400', 'hover:text-slate-200'];

    if (viewTableBtn && viewCardBtn) {
      if (view === 'table') {
        viewTableBtn.classList.add(...activeCls);
        viewTableBtn.classList.remove(...inactiveCls);
        viewCardBtn.classList.remove(...activeCls);
        viewCardBtn.classList.add(...inactiveCls);
      } else {
        viewCardBtn.classList.add(...activeCls);
        viewCardBtn.classList.remove(...inactiveCls);
        viewTableBtn.classList.remove(...activeCls);
        viewTableBtn.classList.add(...inactiveCls);
      }
    }

    renderSchedule();
  }

  function renderSchedule() {
    cleanupOldCheckboxes();
    activities.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    if (currentView === 'table') {
      tbody.closest('table').classList.remove('hidden');
      cardsContainer.classList.add('hidden');
      renderTable();
    } else {
      tbody.closest('table').classList.add('hidden');
      cardsContainer.classList.remove('hidden');
      renderCards();
    }
  }

  function buildDayCheckboxesHtml(act) {
    let rowCheckCount = 0;
    const todayIndex = getTodayIndex();

    const cellsHtml = days.map((day, dayIndex) => {
      const checkKey = `check_${act.id}_${dayIndex}`;
      const isChecked = !!savedChecks[checkKey];
      if (isChecked) rowCheckCount++;
      const isFutureDay = dayIndex > todayIndex;
      return { checkKey, isChecked, day, isFutureDay, isToday: dayIndex === todayIndex };
    });
    return { cellsHtml, rowCheckCount };
  }

  function renderTable() {
    const filtered = getFilteredActivities();
    tbody.innerHTML = '';

    if (filtered.length === 0) {
      const message = activities.length === 0
        ? 'Belum ada kegiatan. Klik "Tambah Kegiatan" untuk memulai!'
        : 'Tidak ada kegiatan di kategori ini.';
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-8 text-slate-500">${message}</td></tr>`;
      lucide.createIcons();
      return;
    }

    filtered.forEach((act) => {
      const realIndex = activities.findIndex(a => a.id === act.id);
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-800/40 transition-colors group';

      const { cellsHtml, rowCheckCount } = buildDayCheckboxesHtml(act);
      const dayCellsStr = cellsHtml.map(({ checkKey, isChecked, day, isFutureDay, isToday }) => `
        <td class="p-3 text-center ${isToday ? 'bg-cyan-500/10' : ''}">
          <input type="checkbox"
            data-key="${checkKey}"
            ${isChecked ? 'checked' : ''}
            ${isFutureDay ? 'disabled' : ''}
            aria-label="${act.name} - ${day}"
            title="${isFutureDay ? 'Belum memasuki hari ' + day : day}"
            class="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-400/20 focus:ring-offset-0 accent-cyan-500 ${isFutureDay ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}"
            onchange="handleCheckboxChange(this)">
        </td>
      `).join('');

      const isTaskDone = rowCheckCount > 0;
      const catKey = act.category || 'Lainnya';

      tr.innerHTML = `
        <td class="p-3 text-center font-mono text-xs text-cyan-400/90 bg-slate-950/30">${act.time}</td>
        <td class="p-3">
          <div class="flex flex-col gap-1">
            <span class="font-medium ${isTaskDone ? 'line-through text-slate-500' : 'text-slate-200'} task-name-cell">${act.name}</span>
            <span class="inline-block w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold ${categoryBadgeClasses(catKey)}">${(CATEGORIES[catKey] || CATEGORIES.Lainnya).label}</span>
          </div>
        </td>
        ${dayCellsStr}
        <td class="p-3 text-center">
          <button onclick="deleteActivity(${realIndex})" class="text-slate-500 hover:text-red-400 transition-colors p-1 cursor-pointer" title="Hapus" aria-label="Hapus ${act.name}">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    lucide.createIcons();
  }

  function renderCards() {
    const filtered = getFilteredActivities();
    cardsContainer.innerHTML = '';

    if (filtered.length === 0) {
      const message = activities.length === 0
        ? 'Belum ada kegiatan. Klik "Tambah Kegiatan" untuk memulai!'
        : 'Tidak ada kegiatan di kategori ini.';
      cardsContainer.innerHTML = `<p class="col-span-full text-center py-8 text-slate-500">${message}</p>`;
      lucide.createIcons();
      return;
    }

    filtered.forEach((act) => {
      const realIndex = activities.findIndex(a => a.id === act.id);
      const { cellsHtml, rowCheckCount } = buildDayCheckboxesHtml(act);
      const isTaskDone = rowCheckCount > 0;
      const catKey = act.category || 'Lainnya';

      const dayGridStr = cellsHtml.map(({ checkKey, isChecked, isFutureDay, isToday }, i) => `
        <div class="flex flex-col items-center gap-1 ${isToday ? 'bg-cyan-500/10 p-1 rounded-lg' : ''}">
          <span class="text-[10px] ${isToday ? 'text-cyan-400 font-bold' : 'text-slate-500 font-semibold'}">${daysShort[i]}</span>
          <input type="checkbox"
            data-key="${checkKey}"
            ${isChecked ? 'checked' : ''}
            ${isFutureDay ? 'disabled' : ''}
            aria-label="${act.name} - ${days[i]}"
            title="${isFutureDay ? 'Belum memasuki hari ' + days[i] : days[i]}"
            class="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-400/20 focus:ring-offset-0 accent-cyan-500 ${isFutureDay ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}"
            onchange="handleCheckboxChange(this)">
        </div>
      `).join('');

      const card = document.createElement('div');
      card.className = 'bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition-colors';
      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div>
            <span class="font-mono text-xs text-cyan-400/90">${act.time}</span>
            <p class="font-medium mt-1 ${isTaskDone ? 'line-through text-slate-500' : 'text-slate-200'} task-name-cell">${act.name}</p>
          </div>
          <button onclick="deleteActivity(${realIndex})" class="text-slate-500 hover:text-red-400 transition-colors p-1 shrink-0 cursor-pointer" title="Hapus" aria-label="Hapus ${act.name}">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
        <span class="inline-block w-fit px-2 py-0.5 rounded-full text-[10px] font-semibold ${categoryBadgeClasses(catKey)}">${(CATEGORIES[catKey] || CATEGORIES.Lainnya).label}</span>
        <div class="grid grid-cols-7 gap-1 pt-2 border-t border-slate-800">
          ${dayGridStr}
        </div>
      `;
      cardsContainer.appendChild(card);
    });

    lucide.createIcons();
  }

  function handleCheckboxChange(checkbox) {
    const key = checkbox.getAttribute('data-key');
    if (checkbox.checked) {
      savedChecks[key] = { checked: true, timestamp: Date.now() };
      markTodayActive();
    } else {
      delete savedChecks[key];
    }
    persistChecks();

    const container = checkbox.closest('tr') || checkbox.closest('.rounded-2xl');
    if (container) {
      const taskCell = container.querySelector('.task-name-cell');
      const allCheckboxes = container.querySelectorAll('input[type="checkbox"]');
      const isAnyChecked = Array.from(allCheckboxes).some(cb => cb.checked);
      if (taskCell) {
        taskCell.classList.toggle('line-through', isAnyChecked);
        taskCell.classList.toggle('text-slate-500', isAnyChecked);
        taskCell.classList.toggle('text-slate-200', !isAnyChecked);
      }
    }

    updateDashboardStats();
    updateChart();
  }

  function openModal() {
    modal.classList.remove('hidden');
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      modalCard.classList.remove('scale-95');
    }, 10);
  }

  function closeModal() {
    modal.classList.add('opacity-0');
    modalCard.classList.add('scale-95');
    setTimeout(() => {
      modal.classList.add('hidden');
      addTodoForm.reset();
    }, 300);
  }

  function deleteActivity(index) {
    const activity = activities[index];
    if (!activity) return;
    if (!confirm(`Hapus kegiatan "${activity.name}"?`)) return;

    activities.splice(index, 1);
    persistActivities();
    cleanupChecksForActivity(activity.id);
    renderSchedule();
    updateDashboardStats();
    updateChart();
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (overlay) overlay.classList.add('hidden');
  }

  function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;
    const isOpen = !sidebar.classList.contains('-translate-x-full');
    if (isOpen) {
      closeMobileSidebar();
    } else {
      sidebar.classList.remove('-translate-x-full');
      if (overlay) overlay.classList.remove('hidden');
    }
  }

  window.switchTab = switchTab;
  window.handleCheckboxChange = handleCheckboxChange;
  window.deleteActivity = deleteActivity;
  window.toggleMobileSidebar = toggleMobileSidebar;

  openModalBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);

  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileSidebar);

  if (viewTableBtn) viewTableBtn.addEventListener('click', () => setView('table'));
  if (viewCardBtn) viewCardBtn.addEventListener('click', () => setView('card'));
  if (yearSelect) yearSelect.addEventListener('change', updateChart);

  addTodoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('inputName');
    const name = nameInput.value.trim();
    const hour = document.getElementById('selectHour').value;
    const ampm = document.getElementById('selectAmpm').value;
    const categorySelect = document.getElementById('selectCategory');
    const category = categorySelect ? categorySelect.value : 'Lainnya';

    if (!name) {
      nameInput.focus();
      return;
    }

    const formattedTime = `${hour} ${ampm}`;
    activities.push({ id: Date.now(), name, time: formattedTime, category });
    persistActivities();

    renderSchedule();
    updateDashboardStats();
    updateChart();
    closeModal();
  });

  // ---------------- INIT ----------------
  populateHourSelect();
  populateCategorySelect();
  populateYearSelect();
  renderFilterButtons();
  setView(currentView);
  updateDashboardStats();
  updateChart();
  initNotifications();
});