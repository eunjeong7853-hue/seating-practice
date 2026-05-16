let globalCurrentLayout = null; 
let globalCurrentCols = null;

// 페이지가 켜질 때 저장된 기록 목록을 업데이트합니다.
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
        alert(`총 좌석은 ${totalSeats}석인데, 명단은 ${lines.length}명입니다. 숫자를 맞춰주세요.`);
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

        const student = { name, gender, isFixed: (fixedIndex !== -1) };
        
        if (fixedIndex !== -1) fixedSeats.push({ student, index: fixedIndex });
        else students.push(student);
    }

    const duplicateCheck = new Set(fixedSeats.map(fs => fs.index));
    if (duplicateCheck.size !== fixedSeats.length) {
        alert("같은 자리에 두 명 이상이 고정 지정되었습니다. 확인해주세요.");
        return;
    }

    const avoidPairs = avoidInput.split('\n').map(line => line.split(',').map(s => s.trim())).filter(pair => pair.length === 2);

    // [핵심] 직전 자리 피하기 로직 (가장 최근 저장된 데이터 불러오기)
    let lastLayout = null;
    if (avoidPrevious) {
        let history = JSON.parse(localStorage.getItem('seatingHistory')) || [];
        if (history.length > 0) {
            history.sort((a, b) => b.timestamp - a.timestamp); // 최신순 정렬
            lastLayout = history[0].layout;
        } else {
            alert("저장된 기록이 없어서 '직전 자리 피하기' 기능을 사용할 수 없습니다. 자리를 먼저 저장해주세요.");
        }
    }

    let finalLayout = null;
    let attempts = 0;
    const maxAttempts = 20000; 

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
        alert("조건(기피, 짝꿍, 직전 자리 피하기 등)이 너무 까다로워 배치에 실패했습니다. 조건을 조금 완화하고 다시 시도해주세요.");
    }
}

function isValidLayout(layout, avoidPairs, mixGender, cols, rows, lastLayout) {
    for (let i = 0; i < layout.length; i++) {
        let row = Math.floor(i / cols);
        let col = i % cols;
        
        // 1. 남녀 짝꿍 검사
        if (mixGender && col % 2 === 0 && col < cols - 1) {
            if (layout[i].gender === layout[i+1].gender) return false;
        }

        // 2. 기피 학생 검사
        for (let pair of avoidPairs) {
            const [student1, student2] = pair;
            if (layout[i].name === student1 || layout[i].name === student2) {
                const targetName = (layout[i].name === student1) ? student2 : student1;
                if (col < cols - 1 && layout[i+1].name === targetName) return false;
                if (row < rows - 1 && layout[i+cols].name === targetName) return false;
            }
        }

        // 3. 직전 자리와 겹치는지 검사 (고정석은 제외)
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
// 💾 로컬 스토리지(기록 저장) 관리 함수들
// ==========================================

function saveCurrentLayout() {
    if (!globalCurrentLayout) return alert("저장할 자리가 없습니다. 먼저 '자리 배치하기' 버튼을 눌러주세요.");
    
    const saveName = document.getElementById('saveName').value.trim();
    if (!saveName) return alert("저장할 이름(예: 4월 자리)을 입력해주세요.");

    let history = JSON.parse(localStorage.getItem('seatingHistory')) || [];
    
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

    history.sort((a, b) => b.timestamp - a.timestamp); // 최신순
    history.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.name;
        
        const date = new Date(item.timestamp);
        const dateString = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
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
        alert(`[${selectedName}] 자리를 불러왔습니다.`);
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
