document.addEventListener('DOMContentLoaded', () => {
    // ---- 1. Data Store Initialization & Migration ----
    let rawStore = localStorage.getItem('ivyLeeData');
    let store = rawStore ? JSON.parse(rawStore) : null;
    let currentCategory = localStorage.getItem('ivyLeeCategory') || 'private';
    
    // Theme logic
    const validThemes = ['light', 'dark'];
    let currentTheme = localStorage.getItem('ivyLeeTheme') || 'dark';
    if (!validThemes.includes(currentTheme)) currentTheme = 'dark';
    document.body.setAttribute('data-theme', currentTheme);
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) themeSelector.value = currentTheme;

    themeSelector.addEventListener('change', (e) => {
        currentTheme = e.target.value;
        document.body.setAttribute('data-theme', currentTheme);
        localStorage.setItem('ivyLeeTheme', currentTheme);
    });

    // Tools
    function generateId() { return Math.random().toString(36).substr(2, 9); }
    function saveStore() { localStorage.setItem('ivyLeeData', JSON.stringify(store)); }
    function formatDateYMD(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const todayYMD = formatDateYMD(today);
    let currentStartDate = new Date(today);

    // Initial Migration logic
    if (!store || (!store.work && !store.private)) {
        const oldTasksByDate = store?.tasksByDate || {};
        const oldHistory = store?.history || [];
        store = {
            work: { tasksByDate: oldTasksByDate, history: oldHistory, routines: [] },
            private: { tasksByDate: {}, history: [], routines: [] }
        };
        saveStore();
    }
    
    // Ensure routines exists in both categories
    if (!store.work.routines) store.work.routines = [];
    if (!store.private.routines) store.private.routines = [];
    saveStore();
    
    // Further check for extremely old "ivyLeeTasks" object
    const oldTasks = JSON.parse(localStorage.getItem('ivyLeeTasks'));
    if (oldTasks && Object.keys(store.work.tasksByDate).length === 0) {
        store.work.tasksByDate[todayYMD] = oldTasks.map(t => ({ 
            id: generateId(), text: t.text, completed: t.completed 
        }));
        localStorage.removeItem('ivyLeeTasks');
        saveStore();
    }

    // ---- 2. Category Toggle Logic ----
    function switchCategory(category, isInitial = false) {
        currentCategory = category;
        localStorage.setItem('ivyLeeCategory', category);
        
        // update UI buttons
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`tab-${category}`).classList.add('active');
        
        if (isInitial) {
            renderWeek();
        } else {
            // re-render week container with slight animation
            const weekContainer = document.getElementById('week-container');
            weekContainer.style.opacity = '0';
            setTimeout(() => {
                renderWeek();
                weekContainer.style.opacity = '1';
            }, 200);
        }
    }
    
    // Event listener for Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cat = e.currentTarget.getAttribute('data-category');
            if (currentCategory !== cat) switchCategory(cat);
        });
    });

    // ---- 3. Render UI (Weekly View) ----
    const weekContainer = document.getElementById('week-container');
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    
    function renderWeek() {
        weekContainer.innerHTML = '';
        const catData = store[currentCategory];

        for (let i = 0; i < 7; i++) {
            const d = new Date(currentStartDate);
            d.setDate(d.getDate() + i);
            const dateStr = formatDateYMD(d);
            const isToday = dateStr === todayYMD;
            const title = isToday ? `今日 ${d.getMonth()+1}/${d.getDate()}(${dayNames[d.getDay()]})` 
                          : `${d.getMonth()+1}/${d.getDate()}(${dayNames[d.getDay()]})`;

            const tasks = catData.tasksByDate[dateStr] || [];
            
            // Auto-inject routines if space is available
            if (tasks.length < 6) { injectRoutines(dateStr); }
            const currentTasks = catData.tasksByDate[dateStr] || [];

            const card = document.createElement('div');
            card.className = `day-card ${isToday ? 'today-card' : ''}`;
            
            const disabledAttr = currentTasks.length >= 6 ? 'disabled' : '';
            const placeholder = currentTasks.length >= 6 ? '最大6つまで設定可能' : '新しいタスクを追加...';
            
            let html = `
                <div class="card-header">
                    <h2>${title}</h2>
                </div>
                <div class="task-input-section">
                    <input type="text" id="input-${dateStr}" placeholder="${placeholder}" ${disabledAttr}>
                    <button class="add-task-btn" data-date="${dateStr}" ${disabledAttr}>追加</button>
                </div>
                <ul class="task-list" id="list-${dateStr}">
            `;
            
            for (let j = 0; j < 6; j++) {
                const task = currentTasks[j];
                if (task) {
                    html += `
                        <li class="task-item ${task.completed ? 'completed' : ''}" data-date="${dateStr}" data-id="${task.id}">
                            <div class="rank">${j + 1}</div>
                            <input type="checkbox" class="checkbox" ${task.completed ? 'checked' : ''} data-date="${dateStr}" data-id="${task.id}">
                            <span class="task-text">${escapeHTML(task.text)}</span>
                            <button class="delete-btn" aria-label="削除" data-date="${dateStr}" data-id="${task.id}">×</button>
                            <div class="drag-handle" data-date="${dateStr}" data-id="${task.id}" title="ドラッグして並び替え">⠿</div>
                        </li>
                    `;
                } else {
                    html += `
                        <li class="task-item empty">
                            <div class="rank empty-rank">${j + 1}</div>
                            <span class="task-text empty-text">未設定</span>
                        </li>
                    `;
                }
            }
            html += `</ul>`;
            
            const allCompleted = currentTasks.length > 0 && currentTasks.every(t => t.completed);
            
            if (currentTasks.some(t => !t.completed) || currentTasks.length === 0) {
                const nextD = new Date(d);
                nextD.setDate(nextD.getDate() + 1);
                const nextDateStr = formatDateYMD(nextD);
                
                html += `
                <div class="actions-section">
                    <button class="carry-over-btn" data-date="${dateStr}" data-next="${nextDateStr}">
                        未完了を翌日へ繰り越す
                    </button>
                </div>`;
            } else if (allCompleted) {
                html += `
                <div class="actions-section">
                    <div class="all-done-msg">🎊 すべて完了しました！</div>
                </div>`;
            }

            card.innerHTML = html;
            weekContainer.appendChild(card);
        }
    }

    // ---- 4. Drag-to-reorder ----
    // タッチ＆マウス両対応のドラッグ並び替え
    let dragState = null;

    function getDragHandleFromEvent(e) {
        return e.target.closest('.drag-handle');
    }

    function getTaskItemFromHandle(handle) {
        return handle.closest('.task-item');
    }

    function onDragStart(e) {
        const handle = getDragHandleFromEvent(e);
        if (!handle) return;
        const item = getTaskItemFromHandle(handle);
        if (!item) return;

        const dateStr = handle.getAttribute('data-date');
        const id = handle.getAttribute('data-id');
        const list = item.closest('.task-list');
        const items = Array.from(list.querySelectorAll('.task-item:not(.empty)'));
        const startIndex = items.indexOf(item);

        const startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        const itemHeight = item.getBoundingClientRect().height;

        item.classList.add('dragging');

        dragState = { dateStr, id, item, list, items, startIndex, startY, itemHeight, currentIndex: startIndex };

        if (e.type === 'touchstart') {
            e.preventDefault();
        }
    }

    function onDragMove(e) {
        if (!dragState) return;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        const dy = clientY - dragState.startY;
        const steps = Math.round(dy / (dragState.itemHeight + 8)); // 8 = gap
        const newIndex = Math.max(0, Math.min(dragState.items.length - 1, dragState.startIndex + steps));

        if (newIndex !== dragState.currentIndex) {
            dragState.currentIndex = newIndex;
            // Reorder DOM for visual feedback
            const items = Array.from(dragState.list.querySelectorAll('.task-item:not(.empty)'));
            dragState.list.insertBefore(dragState.item,
                newIndex >= items.length ? null : (newIndex > items.indexOf(dragState.item) ? items[newIndex].nextSibling : items[newIndex])
            );
        }
        if (e.type === 'touchmove') e.preventDefault();
    }

    function onDragEnd() {
        if (!dragState) return;
        dragState.item.classList.remove('dragging');

        if (dragState.currentIndex !== dragState.startIndex) {
            const tasks = store[currentCategory].tasksByDate[dragState.dateStr];
            const fromIdx = tasks.findIndex(t => t.id === dragState.id);
            const toIdx = dragState.currentIndex;
            if (fromIdx !== -1 && fromIdx !== toIdx) {
                const [moved] = tasks.splice(fromIdx, 1);
                tasks.splice(toIdx, 0, moved);
                saveStore();
                renderWeek();
            }
        }
        dragState = null;
    }

    weekContainer.addEventListener('mousedown', onDragStart);
    weekContainer.addEventListener('touchstart', onDragStart, { passive: false });
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchend', onDragEnd);

    // ---- 5. Render History Modal ----
    function renderHistory() {
        // Label indicating which history is being shown
        const label = document.getElementById('history-category-label');
        label.textContent = currentCategory === 'work' ? '(💼 仕事)' : '(🏠 プライベート)';
        
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        const catHistory = store[currentCategory].history;
        
        if (!catHistory || catHistory.length === 0) {
            list.innerHTML = '<li class="empty-msg">完了したタスクの履歴はありません。</li>';
            return;
        }

        const sortedHistory = [...catHistory].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
        let currentDateGroup = null;
        
        sortedHistory.forEach(item => {
            const itemDate = new Date(item.completedAt);
            const dateStr = formatDateYMD(itemDate);
            
            if (dateStr !== currentDateGroup) {
                const header = document.createElement('h3');
                header.className = 'history-date-header';
                header.textContent = `${itemDate.getFullYear()}年${itemDate.getMonth() + 1}月${itemDate.getDate()}日`;
                list.appendChild(header);
                currentDateGroup = dateStr;
            }
            
            const li = document.createElement('li');
            li.className = 'history-item';
            const timeStr = `${String(itemDate.getHours()).padStart(2,'0')}:${String(itemDate.getMinutes()).padStart(2,'0')}`;
            
            li.innerHTML = `
                <span class="history-time">${timeStr}</span>
                <span class="history-text">${escapeHTML(item.text)}</span>
            `;
            list.appendChild(li);
        });
    }

    // ---- 6. Routine Management ----
    function renderRoutines() {
        const label = document.getElementById('routine-category-label');
        label.textContent = currentCategory === 'work' ? '(💼 仕事)' : '(🏠 プライベート)';
        
        const list = document.getElementById('routine-list');
        list.innerHTML = '';
        const routines = store[currentCategory].routines || [];
        
        if (routines.length === 0) {
            list.innerHTML = '<li class="empty-msg">登録されているルーティンはありません。</li>';
            return;
        }

        routines.forEach(r => {
            const li = document.createElement('li');
            li.className = 'routine-list-item';
            
            let ruleText = '';
            if (r.type === 'daily') ruleText = '毎日';
            if (r.type === 'weekly') ruleText = `毎週 ${dayNames[r.value]}曜日`;
            if (r.type === 'monthly') ruleText = `毎月 ${r.value}日`;
            if (r.type === 'nth-weekday') ruleText = `第${r.value.week} ${dayNames[r.value.day]}曜日`;

            li.innerHTML = `
                <div class="routine-info">
                    <span class="routine-name">${escapeHTML(r.text)}</span>
                    <span class="routine-rule">${ruleText}</span>
                </div>
                <button class="delete-btn" data-routine-id="${r.id}" aria-label="削除">×</button>
            `;
            list.appendChild(li);
        });
    }

    function injectRoutines(dateStr) {
        const targetDate = new Date(dateStr);
        const catData = store[currentCategory];
        const routines = catData.routines || [];
        if (!catData.tasksByDate[dateStr]) catData.tasksByDate[dateStr] = [];
        
        const currentTasks = catData.tasksByDate[dateStr];
        
        routines.forEach(r => {
            let match = false;
            if (r.type === 'daily') match = true;
            if (r.type === 'weekly' && targetDate.getDay() == r.value) match = true;
            if (r.type === 'monthly' && targetDate.getDate() == r.value) match = true;
            if (r.type === 'nth-weekday') {
              if (isNthWeekday(targetDate, r.value.week, r.value.day)) match = true;
            }

            if (match) {
                // Check if task with same text already exists for this day
                const exists = currentTasks.some(t => t.text === r.text);
                if (!exists && currentTasks.length < 6) {
                    currentTasks.push({ id: generateId(), text: r.text, completed: false, isRoutine: true });
                }
            }
        });
    }

    function isNthWeekday(date, n, weekday) {
        if (date.getDay() != weekday) return false;
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        let count = 0;
        for (let d = 1; d <= 31; d++) {
            const check = new Date(date.getFullYear(), date.getMonth(), d);
            if (check.getMonth() !== date.getMonth()) break;
            if (check.getDay() == weekday) {
                count++;
                if (d === date.getDate()) return count == n;
            }
        }
        return false;
    }

    // ---- 6. Global Event Listeners ----
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-task-btn')) {
            addTask(e.target.getAttribute('data-date'));
        }
        if (e.target.classList.contains('delete-btn')) {
            const rid = e.target.getAttribute('data-routine-id');
            if (rid) {
                store[currentCategory].routines = store[currentCategory].routines.filter(r => r.id !== rid);
                saveStore();
                renderRoutines();
                renderWeek();
            } else {
                deleteTask(e.target.getAttribute('data-date'), e.target.getAttribute('data-id'));
            }
        }
        
        if (e.target.classList.contains('carry-over-btn')) {
            const currentDate = e.target.getAttribute('data-date');
            const nextDate = e.target.getAttribute('data-next');
            carryOverTasks(currentDate, nextDate);
        }

        if (e.target.id === 'show-history-btn') {
            renderHistory();
            document.getElementById('history-modal').classList.remove('hidden');
        }

        if (e.target.id === 'show-routines-btn') {
            renderRoutines();
            document.getElementById('routine-modal').classList.remove('hidden');
        }

        if (e.target.id === 'add-routine-btn') {
            addRoutine();
        }

        if (e.target.id === 'prev-week-btn') {
             currentStartDate.setDate(currentStartDate.getDate() - 7);
             renderWeek();
        }
        
        if (e.target.id === 'next-week-btn') {
             currentStartDate.setDate(currentStartDate.getDate() + 7);
             renderWeek();
        }
        
        if (e.target.id === 'today-btn') {
             currentStartDate = new Date(today);
             renderWeek();
        }
        
        if (e.target.hasAttribute('data-close')) {
            document.getElementById(e.target.getAttribute('data-close')).classList.add('hidden');
        }

        if (e.target.id === 'clear-history-btn') {
            if (confirm(`${currentCategory === 'work' ? '仕事' : 'プライベート'}の履歴データを完全に消去してもよろしいですか？`)) {
                store[currentCategory].history = [];
                saveStore();
                renderHistory();
            }
        }
    });

    const routineType = document.getElementById('routine-type');
    if (routineType) {
        routineType.addEventListener('change', (e) => {
            const val = e.target.value;
            document.getElementById('routine-value-weekly').classList.toggle('hidden', val !== 'weekly');
            document.getElementById('routine-value-monthly').classList.toggle('hidden', val !== 'monthly');
            document.getElementById('routine-value-nth').classList.toggle('hidden', val !== 'nth-weekday');
        });
        // Populate monthly options
        const monthlySelect = document.getElementById('routine-value-monthly');
        for (let d = 1; d <= 31; d++) {
            const opt = document.createElement('option');
            opt.value = d; opt.textContent = `${d}日`;
            monthlySelect.appendChild(opt);
        }
    }

    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.id.startsWith('input-')) {
            addTask(e.target.id.replace('input-', ''));
        }
    });

    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('checkbox')) {
            toggleTask(e.target.getAttribute('data-date'), e.target.getAttribute('data-id'), e.target.checked);
        }
    });

    // ---- 6. State Modifications ----
    function addTask(dateStr) {
        const input = document.getElementById(`input-${dateStr}`);
        const text = input.value.trim();
        const catData = store[currentCategory];
        
        if (!catData.tasksByDate[dateStr]) catData.tasksByDate[dateStr] = [];
        
        if (text && catData.tasksByDate[dateStr].length < 6) {
            catData.tasksByDate[dateStr].push({ id: generateId(), text, completed: false });
            input.value = '';
            saveStore();
            renderWeek();
            setTimeout(() => {
                const updatedInput = document.getElementById(`input-${dateStr}`);
                if (updatedInput && !updatedInput.disabled) updatedInput.focus();
            }, 0);
        }
    }

    function toggleTask(dateStr, id, isCompleted) {
        const catData = store[currentCategory];
        const task = catData.tasksByDate[dateStr].find(t => t.id === id);
        
        if (task) {
            task.completed = isCompleted;
            if (!catData.history) catData.history = [];
            
            if (isCompleted) {
                catData.history.push({ id: task.id, text: task.text, completedAt: new Date().toISOString() });
            } else {
                catData.history = catData.history.filter(h => h.id !== task.id);
            }
            saveStore();
            renderWeek();
        }
    }

    function deleteTask(dateStr, id) {
        const catData = store[currentCategory];
        catData.tasksByDate[dateStr] = catData.tasksByDate[dateStr].filter(t => t.id !== id);
        saveStore();
        renderWeek();
    }

    function moveTask(dateStr, id, action) {
        const tasks = store[currentCategory].tasksByDate[dateStr];
        const index = tasks.findIndex(t => t.id === id);
        if (index === -1) return;
        
        if (action === 'up' && index > 0) {
            [tasks[index], tasks[index - 1]] = [tasks[index - 1], tasks[index]];
        } else if (action === 'down' && index < tasks.length - 1) {
            [tasks[index], tasks[index + 1]] = [tasks[index + 1], tasks[index]];
        }
        saveStore();
        renderWeek();
    }

    function addRoutine() {
        const textInput = document.getElementById('routine-text-input');
        const text = textInput.value.trim();
        if (!text) return;
        
        const type = document.getElementById('routine-type').value;
        let value = null;
        
        if (type === 'weekly') value = document.getElementById('routine-value-weekly').value;
        if (type === 'monthly') value = document.getElementById('routine-value-monthly').value;
        if (type === 'nth-weekday') {
            value = {
                week: document.getElementById('routine-nth-week').value,
                day: document.getElementById('routine-nth-day').value
            };
        }
        
        const newRoutine = { id: generateId(), text, type, value };
        store[currentCategory].routines.push(newRoutine);
        saveStore();
        
        textInput.value = '';
        renderRoutines();
        renderWeek();
    }

    function carryOverTasks(currentDate, nextDate) {
        const catData = store[currentCategory];
        const currentTasks = catData.tasksByDate[currentDate] || [];
        const incompleteTasks = currentTasks.filter(t => !t.completed);
        const completedTasks = currentTasks.filter(t => t.completed);
        
        if (incompleteTasks.length === 0) return;
        
        if (!catData.tasksByDate[nextDate]) catData.tasksByDate[nextDate] = [];
        
        let carriedCount = 0;
        incompleteTasks.forEach(task => {
            if (catData.tasksByDate[nextDate].length < 6) {
                catData.tasksByDate[nextDate].push(task);
                carriedCount++;
            }
        });
        
        if (carriedCount === 0) {
            alert('翌日のタスクリストがすでに6つ埋まっているため、一部のタスクを繰り越しできません。');
            return;
        }

        const remainingIncomplete = incompleteTasks.slice(carriedCount);
        catData.tasksByDate[currentDate] = [...completedTasks, ...remainingIncomplete];
        
        saveStore();
        renderWeek();
        
        // Flash animation
        document.body.style.transition = "opacity 0.2s";
        document.body.style.opacity = "0.7";
        setTimeout(() => document.body.style.opacity = "1", 200);
    }

    const escapeHTML = (str) => {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    };

    // INIT
    switchCategory(currentCategory, true);
});
