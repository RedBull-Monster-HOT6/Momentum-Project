document.addEventListener('DOMContentLoaded', () => {
    const notificationButton = document.getElementById('notification-bell-button');
    if (!notificationButton) return;

    // 팝업 컨테이너 생성
    const popup = document.createElement('div');
    popup.id = 'notification-popup';
    popup.className = 'notification-popup';
    // .header-nav를 찾아 그 안에 팝업을 추가합니다.
    const headerNav = notificationButton.closest('.header-nav');
    if (headerNav) {
        headerNav.appendChild(popup);
    } else {
        // .header-nav가 없는 경우를 대비해 버튼의 부모에 추가
        notificationButton.parentNode.appendChild(popup);
    }

    let popupTimeout;
    let autoCloseTimeout;
    let isInitialLoad = true;
    let countdownInterval;

    function stopCountdown() {
        clearInterval(countdownInterval);
        const countdownSpan = popup.querySelector('#countdown-span');
        if (countdownSpan) {
            countdownSpan.textContent = '';
        }
    }

    function closePopup() {
        popup.classList.remove('visible');
        setTimeout(() => popup.style.display = 'none', 300);
        stopCountdown();
    }

    function startAutoCloseTimer() {
        clearTimeout(autoCloseTimeout);
        autoCloseTimeout = setTimeout(closePopup, 5000);
    }
    
    function startInitialCountdown() {
        const countdownSpan = popup.querySelector('#countdown-span');
        if (!countdownSpan) return;

        let seconds = 5;
        countdownSpan.textContent = `(${seconds}초)`;

        countdownInterval = setInterval(() => {
            seconds--;
            if (seconds > 0) {
                countdownSpan.textContent = `(${seconds}초)`;
            } else {
                clearInterval(countdownInterval);
            }
        }, 1000);
    }

    async function displayPopup() {
        await showNotifications(isInitialLoad);
        popup.style.display = 'block';
        setTimeout(() => popup.classList.add('visible'), 10);
        startAutoCloseTimer();

        if (isInitialLoad) {
            startInitialCountdown();
            isInitialLoad = false;
        }
    }

    async function showNotifications(isInitial = false) {
        try {
            const response = await fetch('./data/workouts.json');
            if (!response.ok) {
                popup.innerHTML = '<div class="notification-item"><div class="notification-item-name">알림을 불러올 수 없습니다.</div></div>';
                return;
            }
            const data = await response.json();
            const workouts = data.workouts;

            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            const todaysWorkouts = workouts[todayStr] || [];

            const headerText = isInitial
                ? '오늘의 일정<span id="countdown-span" style="font-weight: normal; margin-left: 8px;"></span>'
                : '오늘의 일정';

            let listContent = '';
            if (todaysWorkouts.length === 0) {
                listContent = '<div class="notification-item" style="justify-content: center;">오늘 예정된 일정이 없습니다.</div>';
            } else {
                const sortedWorkouts = todaysWorkouts.sort((a, b) => a.startTime.localeCompare(b.startTime));
                listContent = sortedWorkouts.map(workout => {
                    const now = new Date();
                    const [startHour, startMinute] = workout.startTime.split(':');
                    const [endHour, endMinute] = workout.endTime.split(':');
                    
                    const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(startHour, 10), parseInt(startMinute, 10));
                    const endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(endHour, 10), parseInt(endMinute, 10));

                    let statusText = '';
                    let statusClass = '';

                    if (now < startTime) {
                        const diffMs = startTime - now;
                        const diffHours = Math.floor(diffMs / 3600000);
                        const diffMinutes = Math.round((diffMs % 3600000) / 60000);
                        
                        if (diffHours > 0) {
                            statusText = `${diffHours}시간 ${diffMinutes % 60}분 후 시작`;
                        } else {
                            statusText = `${diffMinutes}분 후 시작`;
                        }
                        statusClass = 'before';
                    } else if (now >= startTime && now <= endTime) {
                        statusText = '일정 중';
                        statusClass = 'in-progress';
                    } else {
                        statusText = '일정 종료';
                        statusClass = 'after';
                    }

                    return `
                        <a href="./detail_page.html?id=${workout.id}" class="notification-item">
                            <div class="notification-item-name">${workout.name}</div>
                            <div class="notification-item-status ${statusClass}">${statusText}</div>
                        </a>
                    `;
                }).join('');
            }

            const popupContent = `
                <div class="notification-header">${headerText}</div>
                <div class="notification-list">${listContent}</div>
            `;

            popup.innerHTML = popupContent + '<button id="close-popup" style="width: 100%; padding: 8px; background-color: #3a3c47; color: white; border: none; cursor: pointer; border-radius: 0 0 0.75rem 0.75rem;">닫기</button>';
            
            document.getElementById('close-popup').addEventListener('click', () => {
                clearTimeout(autoCloseTimeout);
                closePopup();
            });

        } catch (error) {
            console.error('Error fetching notifications:', error);
            popup.innerHTML = '<div class="notification-item"><div class="notification-item-name">알림 로드 중 오류 발생.</div></div>';
        }
    }

    // 페이지 로드 시 팝업을 표시하고 자동 닫기 타이머 시작
    displayPopup();

    // 알림 벨 클릭으로 팝업 토글
    notificationButton.addEventListener('click', () => {
        if (popup.classList.contains('visible')) {
            closePopup();
        } else {
            displayPopup();
        }
    });

    popup.addEventListener('mouseenter', () => {
        // 팝업 위에 마우스를 올려도 카운트다운과 자동 닫힘은 계속 진행
        clearTimeout(popupTimeout); // 의도치 않게 바로 닫히는 것만 방지
    });

    popup.addEventListener('mouseleave', () => {
        startAutoCloseTimer();
    });
});