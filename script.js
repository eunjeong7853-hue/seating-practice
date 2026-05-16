// 배열을 무작위로 섞는 함수
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// 뷰 모드(교사용/학생용) 변경 함수
function changeView() {
    const container = document.getElementById('deskContainer');
    const mode = document.querySelector('input[name="viewMode"]:checked').value;
    
    if (mode === 'teacher') {
        container.classList.add('teacher-view');
    } else {
        container.classList.remove('teacher-view');
    }
}

function generateSeating() {
    const studentInput = document.getElementById('studentList').value.trim();
    const avoidInput = document.getElementById('avoidList').value.trim();
    const mixGender = document.getElementById('mixGender').checked;
    
    const cols = parseInt(document.getElementById('columns').value);
    const rows = parseInt(document.getElementById('rows').value);
    const totalSeats = cols * rows;

    let students = [];
    let fixedSeats = []; // 고정석 정보 저장 배열

    // 1. 학생 데이터 및 고정 자리 파싱
    const lines = studentInput.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length !== totalSeats) {
        alert(`총 좌석은 ${totalSeats}석인데, 명단은 ${lines.length}명입니다. 인원수를 맞춰주세요.`);
        return;
    }

    for (let line of lines) {
        const parts = line.split(',').map(s => s.trim());
        const name = parts[0];
        const gender = parts[1] || '남';
        let fixedIndex = -1;

        // 고정 행과 열 데이터가 있는 경우
        if (parts.length >= 4 && parts[2] !== '' && parts[3] !== '') {
            const r = parseInt(parts[2]) - 1; // 사용자는 1부터 입력하므로 1을 빼줍니다.
            const c = parseInt(parts[3]) - 1;
            
            if (!isNaN(r) && !isNaN(c) && r >= 0 && r < rows && c >= 0 && c < cols) {
                fixedIndex = r * cols + c;
            } else {
                alert(`${name} 학생의 고정 위치(행:${parts[2]}, 열:${parts[3]})가 교실 범위를 벗어났습니다.`);
                return;
            }
        }

        const student = { name, gender };
        
        if (fixedIndex !== -1) {
            fixedSeats.push({ student, index: fixedIndex });
        } else {
            students.push(student);
        }
    }

    // 고정 자리가 겹치는지 검사
    const duplicateCheck = new Set(fixedSeats.map(fs => fs.index));
    if (duplicateCheck.size !== fixedSeats.length) {
        alert("같은 자리에 두 명 이상의 학생이 지정되었습니다. 고정 행/열을 확인해주세요.");
        return;
    }

    // 2. 기피 조합 파싱
    const avoidPairs = avoidInput.split('\n').map(line => {
        return line.split(',').map(s => s.trim());
    }).filter(pair => pair.length === 2);

    // 3. 조건에 맞는 배치를 찾을 때까지 반복 (최대 10,000번)
    let finalLayout = null;
    let attempts = 0;
    const maxAttempts = 10000;

    while (attempts < maxAttempts) {
        // 전체 빈 좌석 생성
        let currentLayout = new Array(totalSeats).fill(null);
        
        // 고정석 먼저 배치
        for (let fs of fixedSeats) {
            currentLayout[fs.index] = fs.student;
        }

        // 남은 학생들 무작위로 섞어서 빈 자리에 넣기
        let shuffledStudents = shuffle([...students]);
        let sIdx = 0;
        for (let i = 0; i < totalSeats; i++) {
            if (currentLayout[i] === null) {
                currentLayout[i] = shuffledStudents[sIdx];
                sIdx++;
            }
        }

        // 배치 검사 통과 시 완료
        if (isValidLayout(currentLayout, avoidPairs, mixGender, cols, rows)) {
            finalLayout = currentLayout;
            break;
        }
        attempts++;
    }

    // 4. 결과 출력
    if (finalLayout) {
        renderClassroom(finalLayout, cols);
    } else {
        alert("조건(기피 학생, 남녀 짝꿍, 고정석 위치)이 충돌하여 배치를 찾지 못했습니다. 조건을 조금 완화해주세요.");
    }
}

// 조건 검사 함수 (기존과 동일)
function isValidLayout(layout, avoidPairs, mixGender, cols, rows) {
    for (let i = 0; i < layout.length; i++) {
        let row = Math.floor(i / cols);
        let col = i % cols;
        
        if (mixGender) {
            if (col % 2 === 0 && col < cols - 1) {
                if (layout[i].gender === layout[i+1].gender) return false;
            }
        }

        for (let pair of avoidPairs) {
            const [student1, student2] = pair;
            if (layout[i].name === student1 || layout[i].name === student2) {
                const targetName = (layout[i].name === student1) ? student2 : student1;
                
                if (col < cols - 1 && layout[i+1].name === targetName) return false;
                if (row < rows - 1 && layout[i+cols].name === targetName) return false;
            }
        }
    }
    return true;
}

// 화면 렌더링 함수
function renderClassroom(layout, cols) {
    const classroom = document.getElementById('classroom');
    classroom.innerHTML = ''; 
    
    classroom.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    layout.forEach((student, index) => {
        const seat = document.createElement('div');
        seat.className = `seat ${student.gender === '남' ? 'boy' : 'girl'}`;
        
        let col = index % cols;
        if (col % 2 === 1 && col !== cols - 1) {
            seat.classList.add('aisle');
        }

        seat.textContent = student.name;
        classroom.appendChild(seat);
    });
}
