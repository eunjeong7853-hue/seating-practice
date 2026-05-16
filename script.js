let globalCurrentLayout = null; // 현재 화면에 표시된 배치를 저장하는 변수
let globalCurrentCols = null;

// 페이지 로드 시 저장된 기록 불러오기
window.onload = function() {
    updateHistoryUI();
}

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function changeView() {
    const container = document.getElementById('deskContainer');
    const mode = document.querySelector('input[name="viewMode"]:checked').value;
    if (mode === 'teacher') container.classList.add('teacher-view');
    else container.classList.remove('teacher-view');
}

function generateSeating() {
    const studentInput = document.getElementById('studentList').value.trim();
    const avoidInput = document.getElementById('avoidList').value.trim();
    const mixGender = document.getElementById('mixGender').checked;
    const avoidPrevious = document.getElementById('avoidPrevious').checked;
    
    const cols = parseInt(document.getElementById('columns').value);
    const rows = parseInt(document.getElementById('rows').value);
    const totalSeats = cols * rows;

    let students = [];
    let fixedSeats = [];

    const lines = studentInput.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length !== totalSeats) {
        alert(`총 좌석은 ${totalSeats}석인데, 명단은 ${lines.length}명입니다.`);
        return;
    }

    for (let line of lines) {
        const parts = line.split(',').map(s => s.trim());
        const name = parts[0];
        const gender = parts[1] || '남';
        let fixedIndex = -1;

        if (parts.length >= 4 && parts[2] !== '' && parts[3] !== '') {
            const r = parseInt(parts[2]) - 1; 
            const c = parseInt(parts[3]) - 1;
            if (!isNaN(r) && !isNaN(c) && r >= 0 && r < rows && c >= 0 && c < cols) {
                fixedIndex = r * cols + c;
            }
        }

        // isFixed 속성을 추가하여 이전 자리 피하기 검사에서 고정석은 면제합니다
        const student = { name, gender, isFixed: (fixedIndex !== -1) };
        
        if (fixedIndex !== -1) fixedSeats.push({ student, index: fixedIndex });
        else students.push(student);
    }

    const duplicateCheck = new Set(fixedSeats.map(fs => fs.index));
    if (duplicateCheck.size !== fixedSeats.length) {
        alert("같은 자리에 두 명 이상이 고정되었습니다.");
        return;
    }

    const avoidPairs = avoidInput.split('\n').map(line => line.split(',').map(s => s.trim())).filter(pair => pair.length === 2);

    // 가장 최근에 저장된 자리 불러오기 (직전 자리 피하기 용도)
    let lastLayout = null;
    if (avoidPrevious) {
        let history = JSON.parse(localStorage.getItem('seatingHistory')) || [];
        if (history.length > 0) {
            history.sort((a, b) => b.timestamp - a.timestamp); // 최신순 정렬
            lastLayout = history[0].layout;
        } else {
            alert("저장된 자리 기록이 없어 '직전 자리 피하기'가 적용되지 않습니다.");
        }
    }

    let finalLayout = null;
    let attempts = 0;
    const maxAttempts = 20000; // 조건이 빡빡해졌으므로 시도 횟수 증가

    while (attempts < maxAttempts) {
        let currentLayout = new Array(totalSeats).fill(null);
        
        for (let fs of fixedSeats) currentLayout[fs.index] = fs.student;

        let shuffledStudents = shuffle([...students]);
        let sIdx = 0;
        for (let i = 0; i < totalSeats; i++) {
            if (currentLayout[i] === null) {
                currentLayout[i] = shuffledStudents[sIdx];
                sIdx++;
            }
        }

        if (isValidLayout(currentLayout, avoidPairs, mixGender, cols, rows, lastLayout)) {
            finalLayout = currentLayout;
            break;
        }
        attempts++;
    }

    if (finalLayout) {
        globalCurrentLayout = finalLayout;
        globalCurrentCols = cols;
        renderClassroom(finalLayout, cols);
    } else {
        alert("조건(기피, 짝꿍, 고정, 직전 자리)이 너무 엄격하여 배치를 찾지 못했습니다. 기피 학생이나 직전 자리 조건을 완화해주세요.");
    }
}

function isValidLayout(layout, avoidPairs, mixGender, cols, rows, lastLayout) {
    for (let i = 0; i < layout.length; i++) {
        let row = Math.floor(i / cols);
        let col = i % cols;
        
        if (mixGender && col % 2 === 0 && col < cols - 1) {
            if (layout[i].gender === layout[i+1].gender) return false;
        }

        for (let pair of avoidPairs) {
            const [student1, student2] = pair;
            if (layout[i].name === student1 || layout[i].name === student2) {
                const targetName = (layout[i].name === student1) ? student2 : student1;
                if (col < cols - 1 && layout[i+1].name === targetName) return false;
                if (row < rows - 1 && layout[i+cols].name === targetName) return false;
            }
        }

        // [추가된 로직] 직전 자리와 같은지 검사 (고정석은 무시)
        if (lastLayout && !layout[i].isFixed) {
            if (lastLayout[i] && lastLayout[i].name === layout[i].name) return false;
        }
    }
    return true;
}

function renderClassroom(layout, cols) {
    const classroom = document.getElementById('classroom');
    classroom.innerHTML = ''; 
    classroom.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    layout.forEach((student, index) => {
        const seat = document.createElement('div');
        seat.className = `seat ${student.gender === '남' ? 'boy' : 'girl'}`;
        
        let col = index % cols;
        if (col % 2 === 1 && col !== cols - 1) seat.classList.add('aisle');

        seat.textContent = student.name;
        classroom.appendChild(seat);
    });
}

// ==========================================
// 로컬 스토리지 데이터 관리 함수들
// ==========================================

function saveCurrentLayout() {
    if (!globalCurrentLayout) return alert("저장할 자리가 없습니다. 먼저 '자리 배치하기'를 눌러주세요.");
    
    const saveName = document.getElementById('saveName').value.trim();
    if (!saveName) return alert("저장할 이름(예: 3월 자리)을 입력해주세요.");

    let history = JSON.parse(localStorage.getItem('seatingHistory')) || [];
    
    // 동일한 이름이 있으면 덮어쓰기 여부 확인
    const existingIndex = history.findIndex(h => h.name === saveName);
    if (existingIndex !== -1) {
        if (!confirm("같은 이름의 기록이 있습니다. 덮어쓰시겠습니까?")) return;
        history[existingIndex] = { name: saveName, layout: globalCurrentLayout, cols: globalCurrentCols, timestamp: Date.now() };
    } else {
        history.push({ name: saveName, layout: globalCurrentLayout, cols: globalCurrentCols, timestamp: Date.now() });
    }

    localStorage.setItem('seatingHistory', JSON.stringify(history));
    document.getElementById('saveName').value = '';
    updateHistoryUI();
    alert(`[${saveName}] 저장 완료!`);
}

function updateHistoryUI() {
    let history = JSON.parse(localStorage.getItem('seatingHistory')) || [];
    const select = document.getElementById('historySelect');
    select.innerHTML = '';

    if (history.length === 0) {
        const opt = document.createElement('option');
        opt.value = "";
        opt.textContent = "저장된 기록 없음";
        select.appendChild(opt);
        return;
    }

    // 최신순으로 보여주기
    history.sort((a, b) => b.timestamp - a.timestamp);
    history.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.name;
        
        // 날짜 포맷 변환 (선택사항)
        const date = new Date(item.timestamp);
        const dateString = `${date.getMonth()+1}/${date.getDate()}`;
        opt.textContent = `${item.name} (${dateString})`;
        
        select.appendChild(opt);
    });
}

function loadSelectedLayout() {
    const select = document.getElementById('historySelect');
    const selectedName = select.value;
    if (!selectedName) return alert("불러올 기록이 없습니다.");

    let history = JSON.parse(localStorage.getItem('seatingHistory')) || [];
    const record = history.find(h => h.name === selectedName);

    if (record) {
        globalCurrentLayout = record.layout;
        globalCurrentCols = record.cols;
        renderClassroom(record.layout, record.cols);
        alert(`[${selectedName}] 기록을 불러왔습니다.`);
    }
}

function deleteSelectedLayout() {
    const select = document.getElementById('historySelect');
    const selectedName = select.value;
    if (!selectedName) return alert("삭제할 기록이 없습니다.");

    if (confirm(`[${selectedName}] 기록을 정말 삭제하시겠습니까?`)) {
        let history = JSON.parse(localStorage.getItem('seatingHistory')) || [];
        history = history.filter(h => h.name !== selectedName);
        localStorage.setItem('seatingHistory', JSON.stringify(history));
        updateHistoryUI();
    }
}
