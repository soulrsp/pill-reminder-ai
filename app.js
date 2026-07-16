// PillFlow AI - Main Logic & View Routing

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. state definition & Default Data
    // ==========================================
    const defaultPills = [
        {
            id: "pill-sample-1",
            name: "아스피린 100mg",
            dosage: "1정",
            frequency: "morning",
            totalQty: 30,
            currentQty: 28,
            expiryDate: "2027-12-31"
        },
        {
            id: "pill-sample-2",
            name: "타이레놀 500mg",
            dosage: "1정",
            frequency: "thrice",
            totalQty: 10,
            currentQty: 3,
            expiryDate: "2026-08-15"
        },
        {
            id: "pill-sample-3",
            name: "비타민 D3 2000IU",
            dosage: "1캡슐",
            frequency: "morning",
            totalQty: 60,
            currentQty: 58,
            expiryDate: "2027-06-30"
        },
        {
            id: "pill-sample-4",
            name: "오메가3 영양제",
            dosage: "1캡슐",
            frequency: "afternoon",
            totalQty: 50,
            currentQty: 48,
            expiryDate: "2027-03-15"
        },
        {
            id: "pill-sample-5",
            name: "글루코사민",
            dosage: "1정",
            frequency: "evening",
            totalQty: 30,
            currentQty: 28,
            expiryDate: "2026-11-20"
        },
        {
            id: "pill-sample-6",
            name: "멜라토닌 3mg",
            dosage: "1정",
            frequency: "bedtime",
            totalQty: 20,
            currentQty: 18,
            expiryDate: "2027-01-10"
        }
    ];

    const defaultChatMessages = [
        {
            sender: "bot",
            message: "안녕하세요! 복용 중인 의약품에 관한 질문을 무엇이든 받아드릴 수 있는 <strong>PillFlow AI 복용 비서</strong>입니다.💊<br>예를 들어, \"감기약과 타이레놀을 같이 먹어도 되나요?\" 또는 \"홍삼과 오메가3의 상호작용은 어때요?\" 와 같이 질문해 주세요!",
            timestamp: "오전 10:19"
        },
        {
            sender: "user",
            message: "오메가3는 꼭 밥 먹고 바로 먹어야 할까요?",
            timestamp: "오전 10:20"
        },
        {
            sender: "bot",
            message: "네, <strong>오메가3는 꼭 식후에 드시는 것이 좋습니다!</strong><br><br>1. <strong>흡수율 극대화:</strong> 오메가3는 지용성 기름이기 때문에 위산보다는 식사 시 분비되는 췌장 소화액(리파아제)과 담즙산이 있어야 체내에 원활하게 흡수됩니다. 지방이 함유된 식사 후에 드시면 공복 대비 흡수율이 최대 2~3배까지 올라갑니다.<br>2. <strong>위장 장애 방지:</strong> 공복에 드시면 특유의 비린내(어취)가 올라오거나 메스꺼움, 설사, 속쓰림 등의 위장 장애 증상이 발생하기 쉽습니다. 식사 직후 또는 식사 중간에 섭취하시는 것이 가장 부작용을 줄일 수 있는 방법입니다!",
            timestamp: "오전 10:20"
        }
    ];

    let state = {
        profiles: [],
        activeProfileId: "",
        pills: {},
        intakeRecords: {},
        chatLogs: {},
        notifiedDoses: {}
    };

    const STORAGE_KEYS = {
        PROFILES: 'pillflow_profiles',
        ACTIVE_PROFILE_ID: 'pillflow_active_profile_id',
        PILLS: 'pillflow_pills',
        INTAKE_RECORDS: 'pillflow_intake_records',
        CHAT_LOGS: 'pillflow_chat_logs',
        NOTIFIED_DOSES: 'pillflow_notified_doses'
    };

    let tempAnalyzedPills = [];
    let activePillAlarm = null;
    let snoozeTimers = {};
    let currentRoomId = null;
    let lastSyncedDataString = "";
    let isSyncing = false;


    function getInitialChatMessages(profileName) {
        return [
            {
                sender: "bot",
                message: `안녕하세요, <strong>${profileName}</strong> 님! 복용 중인 의약품에 관한 질문을 무엇이든 받아드릴 수 있는 <strong>PillFlow AI 복용 비서</strong>입니다.💊<br>예를 들어, "감기약과 타이레놀을 같이 먹어도 되나요?" 또는 "홍삼과 오메가3의 상호작용은 어때요?" 와 같이 질문해 주세요!`,
                timestamp: getFormattedTime()
            },
            {
                sender: "user",
                message: "오메가3는 꼭 밥 먹고 바로 먹어야 할까요?",
                timestamp: getFormattedTime()
            },
            {
                sender: "bot",
                message: "네, <strong>오메가3는 꼭 식후에 드시는 것이 좋습니다!</strong><br><br>1. <strong>흡수율 극대화:</strong> 오메가3는 지용성 기름이기 때문에 위산보다는 식사 시 분비되는 췌장 소화액(리파아제)과 담즙산이 있어야 체내에 원활하게 흡수됩니다. 지방이 함유된 식사 후에 드시면 공복 대비 흡수율이 최대 2~3배까지 올라갑니다.<br>2. <strong>위장 장애 방지:</strong> 공복에 드시면 특유의 비린내(어취)가 올라오거나 메스꺼움, 설사, 속쓰림 등의 위장 장애 증상이 발생하기 쉽습니다. 식사 직후 또는 식사 중간에 섭취하시는 것이 가장 부작용을 줄일 수 있는 방법입니다!",
                timestamp: getFormattedTime()
            }
        ];
    }

    // ==========================================
    // 2. Storage Sync functions
    // ==========================================
    function loadState() {
        let profiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILES));
        let activeProfileId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
        
        let rawPills = localStorage.getItem(STORAGE_KEYS.PILLS);
        let rawIntake = localStorage.getItem(STORAGE_KEYS.INTAKE_RECORDS);
        let rawChat = localStorage.getItem(STORAGE_KEYS.CHAT_LOGS);
        let rawNotified = localStorage.getItem(STORAGE_KEYS.NOTIFIED_DOSES);
        
        let parsedPills = rawPills ? JSON.parse(rawPills) : null;
        let parsedIntake = rawIntake ? JSON.parse(rawIntake) : null;
        let parsedChat = rawChat ? JSON.parse(rawChat) : null;
        let parsedNotified = rawNotified ? JSON.parse(rawNotified) : null;

        let needsMigration = false;
        if (parsedPills && Array.isArray(parsedPills)) {
            needsMigration = true;
        } else if (parsedChat && Array.isArray(parsedChat)) {
            needsMigration = true;
        } else if (parsedIntake && !parsedIntake["prof-default"] && Object.keys(parsedIntake).some(k => !k.startsWith("prof-"))) {
            needsMigration = true;
        }

        if (needsMigration) {
            state.profiles = profiles || [{ id: "prof-default", name: "기본 사용자", avatarColor: "#6366f1" }];
            state.activeProfileId = activeProfileId || "prof-default";
            
            state.pills = {};
            state.pills["prof-default"] = Array.isArray(parsedPills) ? parsedPills : defaultPills;
            
            state.intakeRecords = {};
            state.intakeRecords["prof-default"] = (parsedIntake && !parsedIntake["prof-default"]) ? parsedIntake : {};
            
            state.chatLogs = {};
            state.chatLogs["prof-default"] = (parsedChat && Array.isArray(parsedChat)) ? parsedChat : getInitialChatMessages("기본 사용자");
            
            state.notifiedDoses = {};
            state.notifiedDoses["prof-default"] = (parsedNotified && !parsedNotified["prof-default"]) ? parsedNotified : {};
            
            saveState();
        } else {
            state.profiles = profiles || [{ id: "prof-default", name: "기본 사용자", avatarColor: "#6366f1" }];
            state.activeProfileId = activeProfileId || "prof-default";
            
            state.pills = parsedPills || { "prof-default": defaultPills };
            state.intakeRecords = parsedIntake || {};
            state.chatLogs = parsedChat || { "prof-default": getInitialChatMessages("기본 사용자") };
            state.notifiedDoses = parsedNotified || {};
            
            state.profiles.forEach(p => {
                if (!state.pills[p.id]) state.pills[p.id] = (p.id === "prof-default" ? defaultPills : []);
                if (!state.intakeRecords[p.id]) state.intakeRecords[p.id] = {};
                if (!state.chatLogs[p.id]) state.chatLogs[p.id] = getInitialChatMessages(p.name);
                if (!state.notifiedDoses[p.id]) state.notifiedDoses[p.id] = {};
            });
        }
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(state.profiles));
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, state.activeProfileId);
        localStorage.setItem(STORAGE_KEYS.PILLS, JSON.stringify(state.pills));
        localStorage.setItem(STORAGE_KEYS.INTAKE_RECORDS, JSON.stringify(state.intakeRecords));
        localStorage.setItem(STORAGE_KEYS.CHAT_LOGS, JSON.stringify(state.chatLogs));
        localStorage.setItem(STORAGE_KEYS.NOTIFIED_DOSES, JSON.stringify(state.notifiedDoses));
        
        saveToCloud();
    }

    const FIREBASE_DB_URL = 'https://pill-reminder-ai-43ffa-default-rtdb.asia-southeast1.firebasedatabase.app';

    // ── 이미지 자동 압축 (최대 200×200px, JPEG 품질 70%) ──
    function compressImage(file, maxWidth, maxHeight, quality) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let w = img.width, h = img.height;
                    if (w > maxWidth || h > maxHeight) {
                        const ratio = Math.min(maxWidth / w, maxHeight / h);
                        w = Math.round(w * ratio);
                        h = Math.round(h * ratio);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ── Firebase 사진 저장 (프로필별 별도 경로) ──
    async function savePhotoToCloud(profileId, base64Image) {
        if (!currentRoomId) return;
        try {
            const url = `${FIREBASE_DB_URL}/rooms/${encodeURIComponent(currentRoomId)}/photos/${encodeURIComponent(profileId)}.json`;
            const body = JSON.stringify({ img: base64Image || null, ts: Date.now() });
            await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body
            });
        } catch (e) {
            console.error('Firebase photo save error:', e);
        }
    }

    // ── Firebase 사진 로드 (모든 프로필 사진 동기화) ──
    async function loadPhotosFromCloud() {
        if (!currentRoomId) return;
        try {
            const url = `${FIREBASE_DB_URL}/rooms/${encodeURIComponent(currentRoomId)}/photos.json?t=${Date.now()}`;
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) return;
            const photos = await response.json();
            if (!photos) return;
            let changed = false;
            state.profiles.forEach(profile => {
                const entry = photos[profile.id];
                if (entry && entry.img !== profile.avatarImage) {
                    profile.avatarImage = entry.img;
                    changed = true;
                }
            });
            if (changed) {
                localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(state.profiles));
                renderProfileList();
                // Refresh active profile avatar
                const activeProfile = state.profiles.find(p => p.id === state.activeProfileId);
                if (activeProfile) {
                    const el = document.getElementById('profile-current-avatar');
                    if (el) {
                        if (activeProfile.avatarImage) {
                            el.innerHTML = `<img class="profile-avatar-img" src="${activeProfile.avatarImage}">`;
                            el.style.backgroundColor = 'transparent';
                        } else {
                            el.innerHTML = `<i class="fa-solid fa-user-circle"></i>`;
                            el.style.color = activeProfile.avatarColor;
                            el.style.backgroundColor = '';
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Firebase photo load error:', e);
        }
    }

    async function saveToCloud() {
        if (!currentRoomId) return;
        
        // Deep copy state and strip heavy Base64 image payload
        const cleanState = JSON.parse(JSON.stringify(state));
        if (cleanState.profiles && Array.isArray(cleanState.profiles)) {
            cleanState.profiles.forEach(p => {
                delete p.avatarImage;
            });
        }
        
        const payload = {
            stateData: JSON.stringify(cleanState),
            timestamp: Date.now()
        };
        const bodyStr = JSON.stringify(payload);
        if (bodyStr === lastSyncedDataString) return;
        
        lastSyncedDataString = bodyStr;
        try {
            // Firebase REST API: PUT /rooms/{roomId}.json
            const url = `${FIREBASE_DB_URL}/rooms/${encodeURIComponent(currentRoomId)}.json`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: bodyStr
            });
            if (!response.ok) {
                console.error('Firebase save failed:', response.status, await response.text());
            }
        } catch (e) {
            console.error('Firebase save error:', e);
        }
    }

    async function loadFromCloud() {
        if (!currentRoomId || isSyncing) return;
        isSyncing = true;
        try {
            // Firebase REST API: GET /rooms/{roomId}.json
            const url = `${FIREBASE_DB_URL}/rooms/${encodeURIComponent(currentRoomId)}.json?t=${Date.now()}`;
            const response = await fetch(url, { cache: 'no-store' });
            
            if (!response.ok) {
                console.error('Firebase load failed:', response.status);
                return;
            }
            
            const resData = await response.json();
            
            // Firebase returns null if path doesn't exist yet — save current state
            if (resData === null) {
                isSyncing = false;
                await saveToCloud();
                return;
            }
            
            let fetchedState = null;
            if (resData && resData.stateData) {
                try {
                    fetchedState = JSON.parse(resData.stateData);
                } catch(e) {
                    console.error('Failed to parse Firebase stateData:', e);
                }
            }
            
            if (fetchedState && Array.isArray(fetchedState.profiles) && fetchedState.activeProfileId) {
                // Merge local avatar images (preserve per-device photos)
                fetchedState.profiles.forEach(fetchedProfile => {
                    const localProfile = state.profiles.find(lp => lp.id === fetchedProfile.id);
                    if (localProfile && localProfile.avatarImage) {
                        fetchedProfile.avatarImage = localProfile.avatarImage;
                    }
                });
                
                const stateStr = JSON.stringify(fetchedState);
                const localStateStr = JSON.stringify(state);
                
                if (stateStr !== localStateStr) {
                    state = fetchedState;
                    
                    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(state.profiles));
                    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, state.activeProfileId);
                    localStorage.setItem(STORAGE_KEYS.PILLS, JSON.stringify(state.pills));
                    localStorage.setItem(STORAGE_KEYS.INTAKE_RECORDS, JSON.stringify(state.intakeRecords));
                    localStorage.setItem(STORAGE_KEYS.CHAT_LOGS, JSON.stringify(state.chatLogs));
                    localStorage.setItem(STORAGE_KEYS.NOTIFIED_DOSES, JSON.stringify(state.notifiedDoses));
                    
                    initTodaySchedule();
                    renderDashboard();
                    renderCabinet();
                    renderChat();
                    renderProfileList();
                    
                    const activeProfile = state.profiles.find(p => p.id === state.activeProfileId);
                    if (activeProfile) {
                        const activeProfileNameEl = document.getElementById('profile-current-name');
                        if (activeProfileNameEl) activeProfileNameEl.textContent = `${activeProfile.name} 님`;
                        
                        const activeProfileAvatarEl = document.getElementById('profile-current-avatar');
                        if (activeProfileAvatarEl) {
                            if (activeProfile.avatarImage) {
                                activeProfileAvatarEl.innerHTML = `<img class="profile-avatar-img" src="${activeProfile.avatarImage}">`;
                                activeProfileAvatarEl.style.backgroundColor = 'transparent';
                            } else {
                                activeProfileAvatarEl.innerHTML = `<i class="fa-solid fa-user-circle"></i>`;
                                activeProfileAvatarEl.style.color = activeProfile.avatarColor;
                                activeProfileAvatarEl.style.backgroundColor = '';
                            }
                        }
                    }
                }
                lastSyncedDataString = JSON.stringify({ stateData: JSON.stringify(fetchedState), timestamp: resData.timestamp || Date.now() });
                // 사진도 동기화
                loadPhotosFromCloud();
            }
        } catch (e) {
            console.error('Firebase load error:', e);
        } finally {
            isSyncing = false;
        }
    }

    // ==========================================
    // 3. Date & Time Helpers
    // ==========================================
    function getTodayString() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function getKoreanDateString(dateStr) {
        const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        const d = new Date(dateStr + 'T00:00:00');
        const yyyy = d.getFullYear();
        const mm = d.getMonth() + 1;
        const dd = d.getDate();
        const dayName = days[d.getDay()];
        return `${yyyy}년 ${mm}월 ${dd}일 ${dayName}`;
    }

    function getFormattedTime() {
        const d = new Date();
        const hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? '오후' : '오전';
        const displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
        return `${ampm} ${displayHour}:${minutes}`;
    }

    // ==========================================
    // 4. Daily Schedule Generator
    // ==========================================
    function initTodaySchedule() {
        const activeProfileId = state.activeProfileId;
        if (!activeProfileId) return;
        
        const todayStr = getTodayString();
        
        if (!state.intakeRecords[activeProfileId]) {
            state.intakeRecords[activeProfileId] = {};
        }
        
        if (!state.intakeRecords[activeProfileId][todayStr]) {
            state.intakeRecords[activeProfileId][todayStr] = [];
            
            const profilePills = state.pills[activeProfileId] || [];
            profilePills.forEach(pill => {
                if (pill.frequency === 'as-needed') return;
                
                const times = getScheduleTimes(pill.frequency);
                times.forEach(time => {
                    const doseId = `dose-${pill.id}-${time}`;
                    state.intakeRecords[activeProfileId][todayStr].push({
                        id: doseId,
                        pillId: pill.id,
                        name: pill.name,
                        dosage: pill.dosage,
                        time: time,
                        period: getPeriodFromTime(time),
                        instruction: getInstructionText(pill.name, pill.dosage, time),
                        status: 'pending'
                    });
                });
            });
            
            state.intakeRecords[activeProfileId][todayStr].sort((a, b) => a.time.localeCompare(b.time));
            
            if (!state.notifiedDoses[activeProfileId]) {
                state.notifiedDoses[activeProfileId] = {};
            }
            if (!state.notifiedDoses[activeProfileId][todayStr]) {
                state.notifiedDoses[activeProfileId][todayStr] = {};
            }
            
            saveState();
        }
    }

    function getScheduleTimes(frequency) {
        switch (frequency) {
            case 'morning': return ['08:30'];
            case 'afternoon': return ['12:30'];
            case 'evening': return ['18:30'];
            case 'bedtime': return ['22:00'];
            case 'twice': return ['08:30', '18:30'];
            case 'thrice': return ['08:30', '12:30', '18:30'];
            default: return [];
        }
    }

    function getPeriodFromTime(time) {
        if (time === '08:30') return 'morning';
        if (time === '12:30') return 'afternoon';
        if (time === '18:30') return 'evening';
        if (time === '22:00') return 'night';
        return 'morning';
    }

    function getInstructionText(name, dosage, time) {
        let periodText = "";
        if (time === '08:30') periodText = "아침 식사 후 30분";
        else if (time === '12:30') periodText = "점심 식사 후 30분";
        else if (time === '18:30') periodText = "저녁 식사 후 30분";
        else if (time === '22:00') periodText = "취침 1시간 전";
        return `${periodText}, 물과 함께 ${dosage} 복용하세요.`;
    }

    // ==========================================
    // 5. Toast Notifications
    // ==========================================
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'fa-check-circle';
        if (type === 'warning') icon = 'fa-triangle-exclamation';
        if (type === 'error') icon = 'fa-circle-xmark';
        if (type === 'info') icon = 'fa-circle-info';

        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Trigger reflow for transition
        toast.offsetHeight;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.style.animation = 'none';
            toast.offsetHeight; // trigger reflow
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.5s ease-in-out';
            setTimeout(() => toast.remove(), 500);
        }, 5000);
    }

    // ==========================================
    // 6. View Switcher Routing
    // ==========================================
    const navItems = document.querySelectorAll('.nav-item');
    const viewPanels = document.querySelectorAll('.view-panel');

    function switchToView(viewId) {
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-target') === viewId) {
                item.classList.add('active');
            }
        });

        viewPanels.forEach(panel => {
            panel.classList.remove('active');
            if (panel.id === viewId) {
                panel.classList.add('active');
            }
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.getAttribute('data-target');
            switchToView(targetId);
        });
    });

    // Request notifications permission on interaction
    document.addEventListener('click', function requestPermissionOnce() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
        document.removeEventListener('click', requestPermissionOnce);
    });

    // ==========================================
    // 7. Dashboard Rendering
    // ==========================================
    function renderDashboard() {
        const activeProfileId = state.activeProfileId;
        if (!activeProfileId) return;
        
        const todayStr = getTodayString();
        
        const todayDateEl = document.getElementById('today-date');
        if (todayDateEl) {
            todayDateEl.textContent = getKoreanDateString(todayStr);
        }
        
        const todayDoses = (state.intakeRecords[activeProfileId] && state.intakeRecords[activeProfileId][todayStr]) || [];
        const totalDoses = todayDoses.length;
        const completedDoses = todayDoses.filter(d => d.status === 'taken').length;
        const remainingDoses = totalDoses - completedDoses;
        const adherencePct = totalDoses > 0 ? Math.round((completedDoses / totalDoses) * 100) : 0;
        
        // Update stats text
        const adherencePctEl = document.getElementById('adherence-pct');
        if (adherencePctEl) adherencePctEl.textContent = `${adherencePct}%`;
        
        const totalDosesEl = document.getElementById('total-doses-count');
        if (totalDosesEl) totalDosesEl.textContent = `${totalDoses}회`;
        
        const completedDosesEl = document.getElementById('completed-doses-count');
        if (completedDosesEl) completedDosesEl.textContent = `${completedDoses}회`;
        
        const remainingDosesEl = document.getElementById('remaining-doses-count');
        if (remainingDosesEl) remainingDosesEl.textContent = `${remainingDoses}회`;
        
        // Sidebar Profile status
        const profileStatusEl = document.querySelector('.profile-status');
        if (profileStatusEl) profileStatusEl.textContent = `오늘 복용률 ${adherencePct}%`;
        
        // Progress ring circle update
        const progressRing = document.getElementById('progress-ring-circle');
        if (progressRing) {
            const radius = progressRing.r.baseVal.value;
            const circumference = 2 * Math.PI * radius;
            progressRing.style.strokeDasharray = `${circumference}`;
            const offset = circumference * (1 - adherencePct / 100);
            progressRing.style.strokeDashoffset = offset;
        }
        
        // Timeline badge
        const timelineStatusBadge = document.getElementById('timeline-status-badge');
        if (timelineStatusBadge) {
            if (totalDoses === 0) {
                timelineStatusBadge.textContent = "일정 없음";
                timelineStatusBadge.style.background = 'rgba(255, 255, 255, 0.05)';
                timelineStatusBadge.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                timelineStatusBadge.style.color = 'var(--text-muted)';
            } else if (adherencePct === 100) {
                timelineStatusBadge.textContent = "완료";
                timelineStatusBadge.style.background = 'rgba(20, 184, 166, 0.15)';
                timelineStatusBadge.style.borderColor = 'rgba(20, 184, 166, 0.3)';
                timelineStatusBadge.style.color = 'var(--accent-teal)';
            } else {
                timelineStatusBadge.textContent = "진행중";
                timelineStatusBadge.style.background = 'rgba(99, 102, 241, 0.15)';
                timelineStatusBadge.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                timelineStatusBadge.style.color = 'var(--accent-indigo)';
            }
        }
        
        // Render checklist timeline
        const timelineListEl = document.getElementById('timeline-list');
        if (timelineListEl) {
            if (totalDoses === 0) {
                timelineListEl.innerHTML = `
                    <div class="results-placeholder" style="padding: 60px 0;">
                        <i class="fa-solid fa-calendar-xmark placeholder-icon" style="font-size: 40px; margin-bottom: 12px;"></i>
                        <p>오늘 예약된 약 복용 일정이 없습니다.<br>약 보관함에 복용 빈도를 설정하여 등록해 보세요.</p>
                    </div>
                `;
                return;
            }
            
            timelineListEl.innerHTML = todayDoses.map(dose => {
                const isCompleted = dose.status === 'taken';
                const [hour, minute] = dose.time.split(':');
                const hNum = parseInt(hour, 10);
                const ampm = hNum >= 12 ? 'PM' : 'AM';
                const formattedHour = hNum > 12 ? String(hNum - 12).padStart(2, '0') : (hNum === 0 ? '12' : hour);
                const displayTime = `${formattedHour}:${minute}`;
                
                const badgeClass = dose.period; // morning, afternoon, evening, night
                let badgeText = "";
                if (dose.period === 'morning') badgeText = "아침 식후";
                else if (dose.period === 'afternoon') badgeText = "점심 식후";
                else if (dose.period === 'evening') badgeText = "저녁 식후";
                else if (dose.period === 'night') badgeText = "취침 전";
                
                return `
                    <div class="timeline-item ${isCompleted ? 'completed' : ''}" data-id="${dose.id}">
                        <div class="timeline-time">${displayTime} <span class="time-ampm">${ampm}</span></div>
                        <div class="timeline-content">
                            <div class="pill-info-main">
                                <span class="pill-badge ${badgeClass}">${badgeText}</span>
                                <h4 class="pill-name">${dose.name}</h4>
                            </div>
                            <p class="pill-instruction">${dose.instruction}</p>
                        </div>
                        <div class="timeline-action">
                            <label class="custom-checkbox">
                                <input type="checkbox" ${isCompleted ? 'checked' : ''} class="dose-checkbox" data-id="${dose.id}">
                                <span class="checkmark"><i class="fa-solid fa-check"></i></span>
                            </label>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Wire checkbox changes
            const checkboxes = timelineListEl.querySelectorAll('.dose-checkbox');
            checkboxes.forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const doseId = e.target.getAttribute('data-id');
                    const isChecked = e.target.checked;
                    toggleDoseStatus(doseId, isChecked);
                });
            });
        }
    }

    function toggleDoseStatus(doseId, isChecked) {
        const activeProfileId = state.activeProfileId;
        if (!activeProfileId) return;
        
        const todayStr = getTodayString();
        const doses = (state.intakeRecords[activeProfileId] && state.intakeRecords[activeProfileId][todayStr]) || [];
        const dose = doses.find(d => d.id === doseId);
        if (!dose) return;
        
        const newStatus = isChecked ? 'taken' : 'pending';
        if (dose.status === newStatus) return;
        
        dose.status = newStatus;
        
        // Decrement / Increment from Cabinet Quantity
        const profilePills = state.pills[activeProfileId] || [];
        const pill = profilePills.find(p => p.id === dose.pillId);
        if (pill) {
            const dosageMatch = pill.dosage.match(/(\d+(?:\.\d+)?)/);
            const qtyDiff = dosageMatch ? parseFloat(dosageMatch[1]) : 1;
            
            if (isChecked) {
                pill.currentQty = Math.max(0, pill.currentQty - qtyDiff);
                showToast(`${dose.name} 복용이 기록되었습니다. (보관함 -${qtyDiff}정)`, 'success');
            } else {
                pill.currentQty = Math.min(pill.totalQty, pill.currentQty + qtyDiff);
                showToast(`${dose.name} 복용 완료가 해제되었습니다. (보관함 +${qtyDiff}정)`, 'info');
            }
        }
        
        saveState();
        renderDashboard();
        renderCabinet();
    }

    // ==========================================
    // 8. AI Prescription Parser Logic
    // ==========================================
    const btnAnalyze = document.getElementById('btn-analyze');
    const rxInput = document.getElementById('rx-input');
    const analysisResults = document.getElementById('analysis-results');
    const btnSaveSchedule = document.getElementById('btn-save-schedule');

    if (btnAnalyze) {
        btnAnalyze.addEventListener('click', () => {
            const text = rxInput.value.trim();
            if (!text) {
                showToast("분석할 처방전 내용을 입력해 주세요.", "warning");
                return;
            }
            analyzeRxText(text);
        });
    }

    if (btnSaveSchedule) {
        btnSaveSchedule.addEventListener('click', () => {
            saveAnalyzedSchedule();
        });
    }

    function analyzeRxText(text) {
        tempAnalyzedPills = [];
        
        // Split by lines or sentence punctuation
        const lines = text.split(/[\n\.]+/).map(l => l.trim()).filter(l => l.length > 0);
        
        // Common drug names dictionary to match
        const commonPills = ["타이레놀", "아스피린", "비타민C", "비타민 C", "비타민 D3", "비타민D3", "오메가3", "오메가 3", "글루코사민", "멜라토닌", "리피토정", "리피토", "덱시부프로펜", "이부프로펜", "노바스크", "메트포르민", "아토르바스타틴", "루테인", "밀크씨슬", "유산균", "프로바이오틱스"];
        
        lines.forEach((line, index) => {
            let pillName = "";
            
            // 1. Try matching with dictionary
            for (const cp of commonPills) {
                if (line.includes(cp)) {
                    pillName = cp;
                    // Extract exact name including mg/mcg/IU context if exists near the name
                    const mgMatch = line.match(new RegExp(cp + '\\s*\\d*\\s*(?:mg|mcg|IU|g)?', 'i'));
                    if (mgMatch) {
                        pillName = mgMatch[0];
                    }
                    break;
                }
            }
            
            // 2. Regex fallback for brand names & chemical names
            if (!pillName) {
                const nameMatch = line.match(/^([가-힣A-Za-z0-9\s\-]+?)(?:\s|\d+정|\d+캡슐|하루|매일|식후|식전|식사|\d+mg)/);
                if (nameMatch && nameMatch[1].trim().length > 1) {
                    pillName = nameMatch[1].trim();
                } else {
                    const words = line.split(/\s+/);
                    if (words.length > 0 && words[0].length > 1 && !["하루", "매일", "식사", "아침", "점심", "저녁", "취침", "자기"].includes(words[0])) {
                        pillName = words[0];
                    }
                }
            }
            
            // Filter invalid names
            if (!pillName || ["식사", "하루", "매일", "아침", "점심", "저녁", "복용", "처방", "취침"].includes(pillName)) {
                return;
            }
            
            // 1회 복용량 파싱
            let dosage = "1정";
            const dosageMatch = line.match(/(\d+)\s*(정|캡슐|알|포|캡슐씩|정씩|포씩|알씩|정제)/);
            if (dosageMatch) {
                dosage = `${dosageMatch[1]}${dosageMatch[2].replace('씩', '')}`;
            } else {
                if (pillName.includes('캡슐') || line.includes('캡슐')) dosage = "1캡슐";
                else if (pillName.includes('포') || line.includes('포')) dosage = "1포";
            }
            
            // 복용 빈도 파싱
            let frequency = "morning"; // default
            if (line.includes("아침") && line.includes("점심") && line.includes("저녁")) {
                frequency = "thrice";
            } else if (line.includes("아침") && line.includes("저녁")) {
                frequency = "twice";
            } else if (line.includes("점심") && line.includes("저녁")) {
                frequency = "twice";
            } else if (line.includes("아침") || line.includes("식후 아침")) {
                frequency = "morning";
            } else if (line.includes("점심")) {
                frequency = "afternoon";
            } else if (line.includes("저녁")) {
                frequency = "evening";
            } else if (line.includes("취침") || line.includes("자기 전") || line.includes("잠들기 전") || line.includes("자기전") || line.includes("취침전")) {
                frequency = "bedtime";
            } else if (line.includes("3번") || line.includes("3회") || line.includes("세번")) {
                frequency = "thrice";
            } else if (line.includes("2번") || line.includes("2회") || line.includes("두번")) {
                frequency = "twice";
            } else if (line.includes("필요 시") || line.includes("필요할 때") || line.includes("통증 시")) {
                frequency = "as-needed";
            }
            
            // 복용 일수 파싱
            let days = 30; // default 30 days
            const daysMatch = line.match(/(\d+)\s*(일간|일분|일치|일)/);
            if (daysMatch) {
                days = parseInt(daysMatch[1], 10);
            }
            
            const doseNumMatch = dosage.match(/(\d+(?:\.\d+)?)/);
            const doseNum = doseNumMatch ? parseFloat(doseNumMatch[1]) : 1;
            
            let dailyFreqMultiplier = 1;
            if (frequency === 'twice') dailyFreqMultiplier = 2;
            else if (frequency === 'thrice') dailyFreqMultiplier = 3;
            else if (frequency === 'as-needed') dailyFreqMultiplier = 1;
            
            const totalQty = days * doseNum * dailyFreqMultiplier;
            
            // Expiry date (1 year from today as default)
            const expiry = new Date();
            expiry.setFullYear(expiry.getFullYear() + 1);
            const expiryDateStr = expiry.toISOString().split('T')[0];
            
            tempAnalyzedPills.push({
                id: `pill-analyzed-${Date.now()}-${index}`,
                name: pillName,
                dosage: dosage,
                frequency: frequency,
                totalQty: totalQty,
                currentQty: totalQty,
                expiryDate: expiryDateStr
            });
        });
        
        renderAnalysisResults();
    }

    function renderAnalysisResults() {
        if (!analysisResults || !btnSaveSchedule) return;
        
        if (tempAnalyzedPills.length === 0) {
            analysisResults.innerHTML = `
                <div class="results-placeholder">
                    <i class="fa-solid fa-triangle-exclamation placeholder-icon text-warning"></i>
                    <p>처방전 분석에 실패했습니다.<br>약물 정보와 복용법을 좀 더 명확하게 기입해 주세요.<br>(예: "타이레놀 500mg 하루 3번 식사 후 1정씩 5일간 복용")</p>
                </div>
            `;
            btnSaveSchedule.disabled = true;
            return;
        }
        
        let html = `
            <div class="analysis-meta" style="margin-bottom: 16px;">
                <i class="fa-solid fa-circle-check"></i> AI가 <strong>${tempAnalyzedPills.length}종</strong>의 약물 스케줄을 추출했습니다.
            </div>
        `;
        
        html += tempAnalyzedPills.map(pill => {
            let freqText = "";
            if (pill.frequency === 'morning') freqText = "아침 식사 후";
            else if (pill.frequency === 'afternoon') freqText = "점심 식사 후";
            else if (pill.frequency === 'evening') freqText = "저녁 식사 후";
            else if (pill.frequency === 'bedtime') freqText = "취침 전";
            else if (pill.frequency === 'twice') freqText = "하루 2회 (아침/저녁)";
            else if (pill.frequency === 'thrice') freqText = "하루 3회 (아침/점심/저녁)";
            else if (pill.frequency === 'as-needed') freqText = "필요 시 복용";
            
            return `
                <div class="parsed-pill-item" style="margin-bottom: 12px;">
                    <div class="parsed-header">
                        <span class="parsed-name"><i class="fa-solid fa-capsules indigo-color"></i> ${pill.name}</span>
                        <span class="parsed-freq">${freqText}</span>
                    </div>
                    <div class="parsed-details">
                        <div class="detail-cell">
                            <strong>1회 분량:</strong> <span>${pill.dosage}</span>
                        </div>
                        <div class="detail-cell">
                            <strong>총 수량:</strong> <span>${pill.totalQty}정</span>
                        </div>
                        <div class="detail-cell">
                            <strong>유효기간:</strong> <span>${pill.expiryDate}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        analysisResults.innerHTML = html;
        btnSaveSchedule.disabled = false;
    }

    function saveAnalyzedSchedule() {
        if (tempAnalyzedPills.length === 0) return;
        
        const activeProfileId = state.activeProfileId;
        if (!activeProfileId) return;
        
        const todayStr = getTodayString();
        
        if (!state.pills[activeProfileId]) state.pills[activeProfileId] = [];
        if (!state.intakeRecords[activeProfileId]) state.intakeRecords[activeProfileId] = {};
        
        tempAnalyzedPills.forEach(pill => {
            state.pills[activeProfileId].push(pill);
            
            if (pill.frequency === 'as-needed') return;
            
            const times = getScheduleTimes(pill.frequency);
            times.forEach(time => {
                const doseId = `dose-${pill.id}-${time}`;
                if (!state.intakeRecords[activeProfileId][todayStr]) {
                    state.intakeRecords[activeProfileId][todayStr] = [];
                }
                
                state.intakeRecords[activeProfileId][todayStr].push({
                    id: doseId,
                    pillId: pill.id,
                    name: pill.name,
                    dosage: pill.dosage,
                    time: time,
                    period: getPeriodFromTime(time),
                    instruction: getInstructionText(pill.name, pill.dosage, time),
                    status: 'pending'
                });
            });
        });
        
        if (state.intakeRecords[activeProfileId][todayStr]) {
            state.intakeRecords[activeProfileId][todayStr].sort((a, b) => a.time.localeCompare(b.time));
        }
        
        saveState();
        renderCabinet();
        renderDashboard();
        
        showToast(`처방약 ${tempAnalyzedPills.length}종을 보관함 및 일정에 추가 완료하였습니다.`, 'success');
        
        // Reset Analyzer
        rxInput.value = "";
        analysisResults.innerHTML = `
            <div class="results-placeholder">
                <i class="fa-solid fa-robot placeholder-icon"></i>
                <p>처방전 텍스트를 분석하면 추출된 약품 목록과 권장 복용 주기가 여기에 표시됩니다.</p>
            </div>
        `;
        btnSaveSchedule.disabled = true;
        tempAnalyzedPills = [];
        
        // Go back to dashboard view
        switchToView('dashboard-view');
    }

    // ==========================================
    // 9. Pill Cabinet Manual Registration Form
    // ==========================================
    const pillForm = document.getElementById('pill-form');
    if (pillForm) {
        pillForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const activeProfileId = state.activeProfileId;
            if (!activeProfileId) return;
            
            const name = document.getElementById('pill-name-input').value.trim();
            const dosage = document.getElementById('pill-dosage-input').value.trim();
            const frequency = document.getElementById('pill-freq-select').value;
            const totalQty = parseInt(document.getElementById('pill-total-input').value, 10);
            const expiryDate = document.getElementById('pill-expiry-input').value;
            
            const newPill = {
                id: `pill-manual-${Date.now()}`,
                name,
                dosage,
                frequency,
                totalQty,
                currentQty: totalQty,
                expiryDate
            };
            
            if (!state.pills[activeProfileId]) state.pills[activeProfileId] = [];
            state.pills[activeProfileId].push(newPill);
            
            // Instantly append to today's schedule if it's scheduled frequency
            if (frequency !== 'as-needed') {
                const todayStr = getTodayString();
                const times = getScheduleTimes(frequency);
                times.forEach(time => {
                    const doseId = `dose-${newPill.id}-${time}`;
                    if (!state.intakeRecords[activeProfileId]) {
                        state.intakeRecords[activeProfileId] = {};
                    }
                    if (!state.intakeRecords[activeProfileId][todayStr]) {
                        state.intakeRecords[activeProfileId][todayStr] = [];
                    }
                    
                    state.intakeRecords[activeProfileId][todayStr].push({
                        id: doseId,
                        pillId: newPill.id,
                        name: newPill.name,
                        dosage: newPill.dosage,
                        time: time,
                        period: getPeriodFromTime(time),
                        instruction: getInstructionText(newPill.name, newPill.dosage, time),
                        status: 'pending'
                    });
                });
                state.intakeRecords[activeProfileId][todayStr].sort((a, b) => a.time.localeCompare(b.time));
            }
            
            saveState();
            renderCabinet();
            renderDashboard();
            
            showToast(`"${name}" 의약품을 보관함에 등록했습니다.`, 'success');
            pillForm.reset();
        });
    }

    function renderCabinet() {
        const activeProfileId = state.activeProfileId;
        if (!activeProfileId) return;
        
        const profilePills = state.pills[activeProfileId] || [];
        
        const cabinetTotalBadge = document.getElementById('cabinet-total-badge');
        if (cabinetTotalBadge) {
            cabinetTotalBadge.textContent = `보유 약품: ${profilePills.length}종`;
        }
        
        const cabinetGridEl = document.getElementById('cabinet-grid');
        if (cabinetGridEl) {
            if (profilePills.length === 0) {
                cabinetGridEl.innerHTML = `
                    <div class="results-placeholder" style="grid-column: span 2; padding: 60px 0;">
                        <i class="fa-solid fa-prescription-bottle-medical placeholder-icon" style="font-size: 48px; margin-bottom: 16px;"></i>
                        <p>보관된 약품이 없습니다.<br>처방전 분석을 이용하거나 수동으로 약품을 추가하세요.</p>
                    </div>
                `;
                return;
            }
            
            cabinetGridEl.innerHTML = profilePills.map(pill => {
                const isWarning = pill.currentQty < 10;
                const badgeClass = isWarning ? 'warning' : 'normal';
                const badgeText = isWarning ? '수량 부족!' : '보유 중';
                
                let freqText = "";
                if (pill.frequency === 'morning') freqText = "아침 식사 후";
                else if (pill.frequency === 'afternoon') freqText = "점심 식사 후";
                else if (pill.frequency === 'evening') freqText = "저녁 식사 후";
                else if (pill.frequency === 'bedtime') freqText = "취침 전";
                else if (pill.frequency === 'twice') freqText = "하루 2회 (아침/저녁)";
                else if (pill.frequency === 'thrice') freqText = "하루 3회 (아침/점심/저녁)";
                else if (pill.frequency === 'as-needed') freqText = "필요 시 복용";
                
                const warningBanner = isWarning ? `
                    <div class="pill-warning-banner">
                        <i class="fa-solid fa-triangle-exclamation"></i> 남은 약이 10정 미만입니다. 재처방을 준비하세요!
                    </div>
                ` : "";
                
                const isNearExpiry = isExpiryNear(pill.expiryDate);
                const expiryClass = isNearExpiry ? 'text-warning' : '';
                
                return `
                    <div class="pill-cabinet-item ${isWarning ? 'warning-pill' : ''}" data-id="${pill.id}">
                        <div class="pill-badge-indicator ${badgeClass}">${badgeText}</div>
                        <div class="pill-item-header">
                            <div class="pill-item-icon">
                                <i class="fa-solid ${pill.frequency === 'bedtime' ? 'fa-moon' : 'fa-capsules'}"></i>
                            </div>
                            <div class="pill-item-names">
                                <h4 class="pill-name">${pill.name}</h4>
                                <span class="pill-dosage">1회 복용량: ${pill.dosage}</span>
                            </div>
                        </div>
                        <div class="pill-item-details">
                            <div class="detail-row">
                                <span class="detail-label">복용 빈도</span>
                                <span class="detail-val">${freqText}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">유효기간</span>
                                <span class="detail-val ${expiryClass}">${pill.expiryDate}</span>
                            </div>
                            <div class="detail-row qty-row">
                                <span class="detail-label ${isWarning ? 'text-warning' : ''}">남은 수량</span>
                                <span class="detail-val quantity-text ${isWarning ? 'text-warning font-bold' : ''}">
                                    ${pill.currentQty}정 <span class="total-qty">/ ${pill.totalQty}정</span>
                                </span>
                            </div>
                        </div>
                        ${warningBanner}
                        <div class="pill-item-footer">
                            <button class="btn-delete-pill btn-icon-only" data-id="${pill.id}" title="약품 삭제">
                                <i class="fa-regular fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Delete button binding
            const deleteButtons = cabinetGridEl.querySelectorAll('.btn-delete-pill');
            deleteButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const pillId = btn.getAttribute('data-id');
                    deletePill(pillId);
                });
            });
        }
    }

    function isExpiryNear(expiryDateStr) {
        if (!expiryDateStr) return false;
        const expiry = new Date(expiryDateStr + 'T00:00:00');
        const today = new Date();
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 30;
    }

    function deletePill(pillId) {
        const activeProfileId = state.activeProfileId;
        if (!activeProfileId) return;
        
        const profilePills = state.pills[activeProfileId] || [];
        const pill = profilePills.find(p => p.id === pillId);
        if (!pill) return;
        
        if (confirm(`보관함에서 '${pill.name}'을 삭제하시겠습니까? 오늘 복용 예정인 미완료 일정도 함께 삭제됩니다.`)) {
            state.pills[activeProfileId] = profilePills.filter(p => p.id !== pillId);
            
            const todayStr = getTodayString();
            if (state.intakeRecords[activeProfileId] && state.intakeRecords[activeProfileId][todayStr]) {
                state.intakeRecords[activeProfileId][todayStr] = state.intakeRecords[activeProfileId][todayStr].filter(d => !(d.pillId === pillId && d.status !== 'taken'));
            }
            
            saveState();
            renderCabinet();
            renderDashboard();
            showToast('약품이 보관함에서 삭제되었습니다.', 'info');
        }
    }

    // ==========================================
    // 10. AI Chatbot Simulator Q&A
    // ==========================================
    const chatInput = document.getElementById('chat-input');
    const btnChatSend = document.getElementById('btn-chat-send');

    if (btnChatSend) {
        btnChatSend.addEventListener('click', () => {
            sendUserMessage();
        });
    }

    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                sendUserMessage();
            }
        });
    }

    const BOT_RESPONSES = [
        {
            keywords: ["자몽", "리피토", "아토르바스타틴", "고지혈증"],
            response: "💊 <strong>자몽과 고지혈증 약물(리피토정 등) 상호작용 경고!</strong><br><br>리피토(아토르바스타틴) 등 일부 고지혈증 약물은 자몽 및 자몽 주스와 함께 섭취하시면 위험합니다.<br>자몽에 함유된 플라보노이드 성분이 간의 약물 대사 효소(CYP3A4) 작용을 억제하여, 혈중 고지혈증 약의 농도를 비정상적으로 높이게 됩니다. 이로 인해 근육 세포가 파괴되는 <strong>횡문근융해증(근육통, 소변 색이 갈색으로 변함)</strong>이나 간 손상 같은 부작용 위험이 증가합니다. 고지혈증 약 복용 중에는 자몽 섭취를 금하시는 것이 좋습니다."
        },
        {
            keywords: ["술", "음주", "알코올", "타이레놀", "아세트아미노펜", "두통약", "진통제"],
            response: "⚠️ <strong>타이레놀(아세트아미노펜)과 알코올(술) 상호작용 경고!</strong><br><br>타이레놀을 포함한 아세트아미노펜 성분은 간에서 대사됩니다. 술을 드신 상태에서 타이레놀을 복용하면, 간에 치명적인 독성 물질(NAPQI)이 과도하게 축적되어 <strong>급성 간부전 및 간 손상</strong>을 유발할 수 있습니다.<br>음주 전후에는 절대 타이레놀을 복용하시면 안 되며, 술 드신 후 두통이 있을 때는 덱시부프로펜이나 이부프로펜 등 소염진통제 계열을 복용하시거나, 충분히 수분을 보충하고 휴식을 취하십시오."
        },
        {
            keywords: ["스케줄", "일정", "복용 시간", "시간", "오늘 일정"],
            response: "📅 <strong>오늘 설정된 복용 스케줄 안내</strong><br><br>현재 등록되어 있는 복용 일정은 <strong>대시보드</strong> 탭에서 언제든지 편리하게 체크하실 수 있습니다.<br>기본 복용 타임라인은 다음과 같습니다:<br>- <strong>아침:</strong> 08:30<br>- <strong>점심:</strong> 12:30<br>- <strong>저녁:</strong> 18:30<br>- <strong>취침전:</strong> 22:00<br>각 약물의 주기에 따라 일정이 자동으로 설정되며, 수정을 원하시면 <strong>약 보관함</strong>에서 등록 정보를 변경할 수 있습니다."
        },
        {
            keywords: ["오메가3", "오메가 3", "지용성"],
            response: "🐟 <strong>오메가3 올바른 복용 지침</strong><br><br>결론부터 말씀드리면, <strong>오메가3는 꼭 식사 직후 또는 식사 중간에 드셔야 합니다.</strong><br><br>1. <strong>흡수율 증가:</strong> 오메가3는 지용성 지방산 성분이기 때문에 담즙산과 소화 효소가 풍부하게 분비되는 식사 후에 섭취해야 흡수율이 공복 대비 2~3배 상승합니다.<br>2. <strong>위장 장애 방지:</strong> 공복에 드시면 특유의 비린내(어취)가 올라오거나, 메스꺼움, 설사, 속쓰림 등의 위장 장애 증상이 생기기 쉽습니다. 식후 즉시 섭취하시면 이를 완화할 수 있습니다!"
        },
        {
            keywords: ["홍삼", "오메가3", "궁합", "같이"],
            response: "🌿 <strong>홍삼과 오메가3 병용 섭섭취 안내</strong><br><br>홍삼과 오메가3는 일반적으로 함께 섭취해도 괜찮은 조합입니다.<br>다만 두 영양제 성분 모두 <strong>혈행 개선(피를 맑게 하고 혈소판 응집을 억제)</strong> 기능이 우수합니다. 이에 따라 <strong>혈압약, 아스피린, 항응고제(와파린 등)</strong>를 드시는 중이거나, <strong>치과 치료 및 큰 수술</strong>을 앞두고 계신 경우라면 지혈이 지연될 위험이 있습니다. 만약 처방된 혈액 관리 약물을 드시는 중이라면 사전에 주치의와 상의하시는 것을 권장합니다."
        }
    ];

    function getBotReply(userMessage) {
        const text = userMessage.trim().toLowerCase();
        let bestMatch = null;
        let maxMatchCount = 0;
        
        for (const item of BOT_RESPONSES) {
            let matchCount = 0;
            for (const keyword of item.keywords) {
                if (text.includes(keyword.toLowerCase())) {
                    matchCount++;
                }
            }
            if (matchCount > maxMatchCount) {
                maxMatchCount = matchCount;
                bestMatch = item;
            }
        }
        
        if (bestMatch && maxMatchCount > 0) {
            return bestMatch.response;
        }
        
        return "💡 약물 복용이나 영양제 상호작용에 대해 질문해 주시면 친절하게 알려드리겠습니다.<br><br><strong>추천 질문 검색어:</strong><br>- 자몽과 고지혈증약 같이 먹어도 되나요?<br>- 술 먹고 타이레놀 복용은?<br>- 오메가3 복용 타이밍<br>- 홍삼과 오메가3 조합";
    }

    function renderChat() {
        const chatMessagesEl = document.getElementById('chat-messages');
        if (!chatMessagesEl) return;
        
        const activeProfileId = state.activeProfileId;
        if (!activeProfileId) return;
        
        const profileChatLogs = state.chatLogs[activeProfileId] || [];
        
        chatMessagesEl.innerHTML = profileChatLogs.map(log => {
            const isBot = log.sender === 'bot';
            
            if (isBot) {
                return `
                    <div class="chat-bubble-container bot">
                        <div class="chat-avatar"><i class="fa-solid fa-robot"></i></div>
                        <div class="chat-bubble-block">
                            <div class="chat-bubble">
                                ${log.message}
                            </div>
                            <span class="chat-time">${log.timestamp}</span>
                        </div>
                    </div>
                `;
            } else {
                return `
                    <div class="chat-bubble-container user">
                        <div class="chat-bubble-block">
                            <div class="chat-bubble">
                                ${log.message}
                            </div>
                            <span class="chat-time">${log.timestamp}</span>
                        </div>
                    </div>
                `;
            }
        }).join('');
        
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    function sendUserMessage() {
        if (!chatInput) return;
        
        const activeProfileId = state.activeProfileId;
        if (!activeProfileId) return;
        
        const messageText = chatInput.value.trim();
        if (!messageText) return;
        
        if (!state.chatLogs[activeProfileId]) state.chatLogs[activeProfileId] = [];
        
        state.chatLogs[activeProfileId].push({
            sender: 'user',
            message: messageText,
            timestamp: getFormattedTime()
        });
        
        chatInput.value = "";
        saveState();
        renderChat();
        
        showTypingIndicator();
        
        setTimeout(() => {
            removeTypingIndicator();
            const botReply = getBotReply(messageText);
            
            state.chatLogs[activeProfileId].push({
                sender: 'bot',
                message: botReply,
                timestamp: getFormattedTime()
            });
            
            saveState();
            renderChat();
        }, 1200);
    }

    function showTypingIndicator() {
        const chatMessagesEl = document.getElementById('chat-messages');
        if (!chatMessagesEl) return;
        
        const indicator = document.createElement('div');
        indicator.id = 'chat-typing-indicator';
        indicator.className = 'chat-bubble-container bot';
        indicator.innerHTML = `
            <div class="chat-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="chat-bubble-block">
                <div class="chat-bubble typing-dots">
                    <span>.</span><span>.</span><span>.</span>
                </div>
            </div>
        `;
        chatMessagesEl.appendChild(indicator);
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('chat-typing-indicator');
        if (indicator) indicator.remove();
    }

    // ==========================================
    // 11. Alarm Dispatcher & Scheduler (Web Notification & Modal)
    // ==========================================
    const btnTakeConfirm = document.getElementById('btn-take-confirm');
    const btnTakeSnooze = document.getElementById('btn-take-snooze');

    if (btnTakeConfirm) {
        btnTakeConfirm.addEventListener('click', handleTakeConfirm);
    }
    
    if (btnTakeSnooze) {
        btnTakeSnooze.addEventListener('click', handleTakeSnooze);
    }

    function triggerAlarm(dose) {
        activePillAlarm = dose;
        let desktopNotified = false;
        
        // Try desktop notification
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                const notif = new Notification("💊 PillFlow 복용 시간 알림", {
                    body: `${dose.name} 복용 시간입니다.\n${dose.instruction}`,
                    icon: 'favicon.ico'
                });
                notif.onclick = () => {
                    window.focus();
                    switchToView('dashboard-view');
                };
                desktopNotified = true;
            } catch (e) {
                console.error("데스크톱 알림 실패", e);
            }
        }
        
        // Show in-app alarm modal as fallback or dual display
        showAlarmModal(dose);
    }

    function showAlarmModal(dose) {
        const modal = document.getElementById('alarm-modal');
        const nameEl = document.getElementById('alarm-pill-name');
        const instructionEl = document.getElementById('alarm-pill-instruction');
        
        if (modal && nameEl && instructionEl) {
            nameEl.textContent = dose.name;
            instructionEl.textContent = dose.instruction;
            modal.classList.remove('hidden');
        }
    }

    function closeAlarmModal() {
        const modal = document.getElementById('alarm-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        activePillAlarm = null;
    }

    function handleTakeConfirm() {
        if (!activePillAlarm) return;
        
        const doseId = activePillAlarm.id;
        toggleDoseStatus(doseId, true);
        
        delete snoozeTimers[doseId];
        closeAlarmModal();
    }

    // Snooze Alarm
    function handleTakeSnooze() {
        if (!activePillAlarm) return;
        
        const doseId = activePillAlarm.id;
        snoozeTimers[doseId] = Date.now() + 5 * 60 * 1000;
        
        showToast(`${activePillAlarm.name}의 알림을 5분 후로 설정했습니다.`, 'info');
        closeAlarmModal();
    }

    function checkSchedule() {
        const activeProfileId = state.activeProfileId;
        if (!activeProfileId) return;
        
        const todayStr = getTodayString();
        const todayDoses = (state.intakeRecords[activeProfileId] && state.intakeRecords[activeProfileId][todayStr]) || [];
        
        const now = new Date();
        const currentHour = String(now.getHours()).padStart(2, '0');
        const currentMinute = String(now.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${currentHour}:${currentMinute}`;
        const nowMs = now.getTime();
        
        if (!state.notifiedDoses[activeProfileId]) {
            state.notifiedDoses[activeProfileId] = {};
        }
        if (!state.notifiedDoses[activeProfileId][todayStr]) {
            state.notifiedDoses[activeProfileId][todayStr] = {};
        }
        
        todayDoses.forEach(dose => {
            if (dose.status === 'taken') return;
            
            const isTimeMatch = dose.time === currentTimeStr;
            const isAlreadyNotified = state.notifiedDoses[activeProfileId][todayStr][dose.id];
            
            const snoozeTime = snoozeTimers[dose.id];
            const isSnoozeTrigger = snoozeTime && nowMs >= snoozeTime;
            
            if ((isTimeMatch && !isAlreadyNotified) || isSnoozeTrigger) {
                triggerAlarm(dose);
                
                state.notifiedDoses[activeProfileId][todayStr][dose.id] = true;
                
                if (isSnoozeTrigger) {
                    delete snoozeTimers[dose.id];
                }
                
                saveState();
            }
        });
    }

    // ==========================================
    // 12. Multi-Profile Management Logic & Bindings
    // ==========================================
    function createProfile(name, color, avatarImage) {
        const newId = `prof-${Date.now()}`;
        const newProfile = {
            id: newId,
            name: name,
            avatarColor: color,
            avatarImage: avatarImage || null
        };
        
        state.profiles.push(newProfile);
        state.pills[newId] = [];
        state.intakeRecords[newId] = {};
        state.chatLogs[newId] = getInitialChatMessages(name);
        state.notifiedDoses[newId] = {};
        
        saveState();
        
        showToast(`새 프로필 "${name}"이(가) 추가되었습니다.`, 'success');
        switchProfile(newId);
    }
    
    function switchProfile(profileId) {
        const activeProfile = state.profiles.find(p => p.id === profileId);
        if (!activeProfile) return;
        
        state.activeProfileId = profileId;
        saveState();
        
        const activeProfileNameEl = document.getElementById('profile-current-name');
        if (activeProfileNameEl) {
            activeProfileNameEl.textContent = `${activeProfile.name} 님`;
        }
        
        const activeProfileAvatarEl = document.getElementById('profile-current-avatar');
        if (activeProfileAvatarEl) {
            if (activeProfile.avatarImage) {
                activeProfileAvatarEl.innerHTML = `<img class="profile-avatar-img" src="${activeProfile.avatarImage}">`;
                activeProfileAvatarEl.style.backgroundColor = 'transparent';
            } else {
                activeProfileAvatarEl.innerHTML = `<i class="fa-solid fa-user-circle"></i>`;
                activeProfileAvatarEl.style.color = activeProfile.avatarColor;
                activeProfileAvatarEl.style.backgroundColor = '';
            }
        }
        
        initTodaySchedule();
        
        renderDashboard();
        renderCabinet();
        renderChat();
        renderProfileList();
        
        showToast(`"${activeProfile.name}" 프로필로 전환되었습니다.`, 'info');
    }

    function deleteProfile(profileId) {
        if (state.profiles.length <= 1) {
            showToast("최소 1개 이상의 프로필이 유지되어야 하므로 삭제할 수 없습니다.", "warning");
            return;
        }
        
        const profile = state.profiles.find(p => p.id === profileId);
        if (!profile) return;
        
        if (confirm(`"${profile.name}" 프로필을 삭제하시겠습니까? 등록된 약물 정보와 복용 일정 내역이 모두 유실됩니다.`)) {
            state.profiles = state.profiles.filter(p => p.id !== profileId);
            delete state.pills[profileId];
            delete state.intakeRecords[profileId];
            delete state.chatLogs[profileId];
            delete state.notifiedDoses[profileId];
            
            saveState();
            
            showToast(`"${profile.name}" 프로필이 삭제되었습니다.`, 'info');
            
            if (state.activeProfileId === profileId) {
                switchProfile(state.profiles[0].id);
            } else {
                renderProfileList();
            }
        }
    }

    function renderProfileList() {
        const profileListEl = document.getElementById('profile-list');
        if (!profileListEl) return;
        
        profileListEl.innerHTML = state.profiles.map(p => {
            const isActive = p.id === state.activeProfileId;
            const avatarContent = p.avatarImage 
                ? `<img class="profile-item-avatar-img" src="${p.avatarImage}">` 
                : `<i class="fa-solid fa-user"></i>`;
            const avatarBg = p.avatarImage ? 'background: transparent;' : `background-color: ${p.avatarColor};`;
            return `
                <div class="profile-item ${isActive ? 'active' : ''}" data-id="${p.id}">
                    <div class="profile-item-click-zone" style="display: flex; align-items: center; gap: 10px; flex-grow: 1; height: 100%;">
                        <div class="profile-item-avatar" style="${avatarBg}">
                            ${avatarContent}
                        </div>
                        <span class="profile-item-name">${p.name}</span>
                    </div>
                    <button class="btn-delete-profile" data-id="${p.id}" title="프로필 삭제" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: var(--transition-smooth);">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        const profileItems = profileListEl.querySelectorAll('.profile-item-click-zone');
        profileItems.forEach(zone => {
            zone.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = zone.closest('.profile-item');
                const profileId = item.getAttribute('data-id');
                switchProfile(profileId);
                const dropdown = document.getElementById('profile-dropdown');
                if (dropdown) dropdown.classList.remove('active');
            });
        });

        const deleteButtons = profileListEl.querySelectorAll('.btn-delete-profile');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const profileId = btn.getAttribute('data-id');
                deleteProfile(profileId);
            });
        });
    }

    // Profile Dropdown Toggle
    const profileArea = document.getElementById('profile-area');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    if (profileArea && profileDropdown) {
        profileArea.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        
        document.addEventListener('click', () => {
            profileDropdown.classList.remove('active');
        });
    }

    // Share Link Copy Button
    const btnCopyShareLink = document.getElementById('btn-copy-share-link');
    if (btnCopyShareLink) {
        btnCopyShareLink.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (profileDropdown) profileDropdown.classList.remove('active');
            
            // If no room yet, prompt for a room name
            let roomId = currentRoomId;
            if (!roomId) {
                roomId = prompt('공유할 방 번호를 입력하세요 (예: 1, 2, family)', '1');
                if (!roomId) return;
                roomId = roomId.trim();
                currentRoomId = roomId;
                
                const newUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
                window.history.pushState({ path: newUrl }, '', newUrl);
            }
            
            // Save current state to Firebase first
            await saveToCloud();
            
            // Show banner & start polling if not already running
            const syncBanner = document.getElementById('sync-status-banner');
            if (syncBanner) syncBanner.classList.remove('hidden');
            
            // Start polling (safe to call multiple times — interval checks internally)
            if (!window._syncIntervalStarted) {
                window._syncIntervalStarted = true;
                setInterval(loadFromCloud, 5000);
            }
            
            // Copy share link to clipboard
            const shareLink = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
            navigator.clipboard.writeText(shareLink).then(() => {
                showToast(`공유 링크가 복사되었습니다! (방 번호: ${roomId})`, 'success');
            }).catch(() => {
                showToast(`공유 링크: ${shareLink}`, 'info');
            });
        });
    }

    // Profile Creation Modal Trigger & Controls
    const btnAddProfile = document.getElementById('btn-add-profile');
    const profileModal = document.getElementById('profile-modal');
    const btnCancelProfile = document.getElementById('btn-cancel-profile');
    const btnCreateProfile = document.getElementById('btn-create-profile');
    const newProfileNameInput = document.getElementById('new-profile-name');
    const colorPresets = document.querySelectorAll('.color-preset-btn');
    
    let selectedColor = "#6366f1";
    
    if (btnAddProfile && profileModal) {
        btnAddProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            if (newProfileNameInput) newProfileNameInput.value = "";
            
            colorPresets.forEach(preset => {
                preset.classList.remove('active');
                if (preset.getAttribute('data-color') === "#6366f1") {
                    preset.classList.add('active');
                }
            });
            selectedColor = "#6366f1";
            profileModal.classList.remove('hidden');
            if (profileDropdown) profileDropdown.classList.remove('active');
        });
    }
    
    if (btnCancelProfile && profileModal) {
        btnCancelProfile.addEventListener('click', () => {
            profileModal.classList.add('hidden');
        });
    }
    
    colorPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            colorPresets.forEach(p => p.classList.remove('active'));
            preset.classList.add('active');
            selectedColor = preset.getAttribute('data-color');
        });
    });
    
    if (btnCreateProfile) {
        btnCreateProfile.addEventListener('click', () => {
            const name = newProfileNameInput.value.trim();
            if (!name) {
                showToast("프로필 이름을 입력해 주세요.", "warning");
                return;
            }
            createProfile(name, selectedColor, null);
            profileModal.classList.add('hidden');
        });
    }

    // ==========================================
    // 12.5 Profile Photo Edit Controls
    // ==========================================
    const btnEditProfilePhoto = document.getElementById('btn-edit-profile-photo');
    const profilePhotoModal = document.getElementById('profile-photo-modal');
    const btnCancelProfilePhoto = document.getElementById('btn-cancel-profile-photo');
    const btnSaveProfilePhoto = document.getElementById('btn-save-profile-photo');
    const btnDeleteCurrentPhoto = document.getElementById('btn-delete-current-photo');
    const editProfilePhotoInput = document.getElementById('edit-profile-photo-input');
    const editPhotoPreview = document.getElementById('edit-photo-preview');
    
    let tempPhotoBase64 = null;
    
    if (btnEditProfilePhoto && profilePhotoModal) {
        btnEditProfilePhoto.addEventListener('click', (e) => {
            e.stopPropagation();
            const activeProfile = state.profiles.find(p => p.id === state.activeProfileId);
            if (!activeProfile) return;
            
            tempPhotoBase64 = activeProfile.avatarImage;
            if (editProfilePhotoInput) editProfilePhotoInput.value = "";
            
            if (editPhotoPreview) {
                if (tempPhotoBase64) {
                    editPhotoPreview.innerHTML = `<img src="${tempPhotoBase64}" style="width: 100%; height: 100%; object-fit: cover;">`;
                } else {
                    editPhotoPreview.innerHTML = `<i class="fa-solid fa-user"></i>`;
                }
            }
            profilePhotoModal.classList.remove('hidden');
            if (profileDropdown) profileDropdown.classList.remove('active');
        });
    }
    
    if (editProfilePhotoInput && editPhotoPreview) {
        editProfilePhotoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 10 * 1024 * 1024) {
                    showToast("이미지 크기는 최대 10MB까지 지원됩니다.", "warning");
                    editProfilePhotoInput.value = "";
                    return;
                }
                try {
                    showToast("이미지를 처리하는 중...", "info");
                    // 200×200px, JPEG 70%로 자동 압축
                    tempPhotoBase64 = await compressImage(file, 200, 200, 0.7);
                    editPhotoPreview.innerHTML = `<img src="${tempPhotoBase64}" style="width: 100%; height: 100%; object-fit: cover;">`;
                } catch (err) {
                    console.error('Image compress error:', err);
                    showToast("이미지 처리에 실패했습니다. 다른 사진을 시도해 주세요.", "error");
                    editProfilePhotoInput.value = "";
                }
            }
        });
    }
    
    if (btnDeleteCurrentPhoto && editPhotoPreview) {
        btnDeleteCurrentPhoto.addEventListener('click', () => {
            tempPhotoBase64 = null;
            editPhotoPreview.innerHTML = `<i class="fa-solid fa-user"></i>`;
            if (editProfilePhotoInput) editProfilePhotoInput.value = "";
        });
    }
    
    if (btnCancelProfilePhoto && profilePhotoModal) {
        btnCancelProfilePhoto.addEventListener('click', () => {
            profilePhotoModal.classList.add('hidden');
        });
    }
    
    if (btnSaveProfilePhoto && profilePhotoModal) {
        btnSaveProfilePhoto.addEventListener('click', async () => {
            const activeProfile = state.profiles.find(p => p.id === state.activeProfileId);
            if (activeProfile) {
                activeProfile.avatarImage = tempPhotoBase64;
                saveState();
                
                // Firebase에 사진 동기화 업로드
                if (currentRoomId) {
                    showToast("사진을 동기화 중...", "info");
                    await savePhotoToCloud(activeProfile.id, tempPhotoBase64);
                    showToast("프로필 사진이 저장되고 동기화되었습니다.", "success");
                } else {
                    showToast("프로필 사진이 성공적으로 수정되었습니다.", "success");
                }
                
                // Refresh headers and dropdown
                const activeProfileAvatarEl = document.getElementById('profile-current-avatar');
                if (activeProfileAvatarEl) {
                    if (tempPhotoBase64) {
                        activeProfileAvatarEl.innerHTML = `<img class="profile-avatar-img" src="${tempPhotoBase64}">`;
                        activeProfileAvatarEl.style.backgroundColor = 'transparent';
                    } else {
                        activeProfileAvatarEl.innerHTML = `<i class="fa-solid fa-user-circle"></i>`;
                        activeProfileAvatarEl.style.color = activeProfile.avatarColor;
                        activeProfileAvatarEl.style.backgroundColor = '';
                    }
                }
                
                renderProfileList();
            }
            profilePhotoModal.classList.add('hidden');
        });
    }

    // ==========================================
    // 13. App Initialization
    // ==========================================
    loadState();
    initTodaySchedule();
    
    // URL parameter check for Room Sync
    const urlParams = new URLSearchParams(window.location.search);
    const urlRoomId = urlParams.get('room');
    if (urlRoomId) {
        currentRoomId = urlRoomId;
        const syncBanner = document.getElementById('sync-status-banner');
        if (syncBanner) {
            syncBanner.classList.remove('hidden');
        }
        
        // Initial cloud load (asynchronous)
        loadFromCloud().then(() => {
            // Set active profile header details after sync
            const initialActiveProfile = state.profiles.find(p => p.id === state.activeProfileId);
            if (initialActiveProfile) {
                const activeProfileNameEl = document.getElementById('profile-current-name');
                if (activeProfileNameEl) activeProfileNameEl.textContent = `${initialActiveProfile.name} 님`;
                
                const activeProfileAvatarEl = document.getElementById('profile-current-avatar');
                if (activeProfileAvatarEl) {
                    if (initialActiveProfile.avatarImage) {
                        activeProfileAvatarEl.innerHTML = `<img class="profile-avatar-img" src="${initialActiveProfile.avatarImage}">`;
                        activeProfileAvatarEl.style.backgroundColor = 'transparent';
                    } else {
                        activeProfileAvatarEl.innerHTML = `<i class="fa-solid fa-user-circle"></i>`;
                        activeProfileAvatarEl.style.color = initialActiveProfile.avatarColor;
                        activeProfileAvatarEl.style.backgroundColor = '';
                    }
                }
            }
            
            renderDashboard();
            renderCabinet();
            renderChat();
            renderProfileList();
            // 사진도 시작 시 즉시 동기화
            loadPhotosFromCloud();
        });
        
        // Start cloud polling every 5 seconds (state + photos)
        setInterval(loadFromCloud, 5000);
        setInterval(loadPhotosFromCloud, 10000); // 사진은 10초마다 폴링
    } else {
        saveState();
    }
    
    // Set initially active profile header details
    const initialActiveProfile = state.profiles.find(p => p.id === state.activeProfileId);
    if (initialActiveProfile) {
        const activeProfileNameEl = document.getElementById('profile-current-name');
        if (activeProfileNameEl) activeProfileNameEl.textContent = `${initialActiveProfile.name} 님`;
        
        const activeProfileAvatarEl = document.getElementById('profile-current-avatar');
        if (activeProfileAvatarEl) {
            if (initialActiveProfile.avatarImage) {
                activeProfileAvatarEl.innerHTML = `<img class="profile-avatar-img" src="${initialActiveProfile.avatarImage}">`;
                activeProfileAvatarEl.style.backgroundColor = 'transparent';
            } else {
                activeProfileAvatarEl.innerHTML = `<i class="fa-solid fa-user-circle"></i>`;
                activeProfileAvatarEl.style.color = initialActiveProfile.avatarColor;
                activeProfileAvatarEl.style.backgroundColor = '';
            }
        }
    }
    
    // First render
    renderDashboard();
    renderCabinet();
    renderChat();
    renderProfileList();

    // Start 10-second check loop
    setInterval(checkSchedule, 10000);

    console.log("PillFlow AI Initialized.");
});

