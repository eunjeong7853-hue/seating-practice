// 배열을 무작위로 섞는 함수 (피셔-예이츠 셔플)
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function generateSeating() {
    const studentInput = document.getElementById('studentList').value.trim();
    const avoidInput = document.getElementById('avoidList').value.trim();
    const mixGender = document.getElementById('mixGender').checked;

    // 1. 학생 데이터 파싱
    const students = studentInput.split('\n').map(line => {
        const [name, gender] = line.split(',').map(s => s.trim());
        return { name, gender };
    }).filter(s => s.name); // 빈 줄 제거

    // 30명 검사로 수정
    if (students.length !== 30) {
        alert(`현재 입력된 학생 수는 ${students.length}명입니다. 정확히 30명을 입력해주세요.`);
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
        let currentLayout = shuffle([...students]);
        if (isValidLayout(currentLayout, avoidPairs, mixGender)) {
            finalLayout = currentLayout;
            break;
        }
        attempts++;
    }

    // 4. 결과 출력
    if (finalLayout) {
        renderClassroom(finalLayout);
    } else {
        alert("입력하신 조건(기피 학생, 남녀 짝꿍)을 모두 만족하는 배치를 찾지 못했습니다. 조건을 완화해주세요.");
    }
}

// 배치된 자리가 조건에 맞는지 검사하는 함수
function isValidLayout(layout, avoidPairs, mixGender) {
    // 6열 5행 구조로 변경
    const cols = 6;
    const rows = 5;
    
    for (let i = 0; i < layout.length; i++) {
        let row = Math.floor(i / cols);
        let col = i % cols;
        
        // 가. 남녀 짝꿍 조건 검사 (0-1, 2-3, 4-5열 짝꿍)
        if (mixGender) {
            // 짝수 열(0, 2, 4)일 때 바로 오른쪽 홀수 열 학생과 성별 비교
            if (col % 2 === 0) {
                if (layout[i].gender === layout[i+1].gender) return false;
            }
        }

        // 나. 기피 학생 조건 검사 (상하좌우 검사)
        for (let pair of avoidPairs) {
            const [student1, student2] = pair;
            
            if (layout[i].name === student1 || layout[i].name === student2) {
                const targetName = (layout[i].name === student1) ? student2 : student1;
                
                // 오른쪽 확인
                if (col < cols - 1 && layout[i+1].name === targetName) return false;
                // 아래쪽(뒷자리) 확인
                if (row < rows - 1 && layout[i+cols].name === targetName) return false;
            }
        }
    }
    return true;
}

// 화면에 자리표를 그리는 함수
function renderClassroom(layout) {
    const classroom = document.getElementById('classroom');
    classroom.innerHTML = ''; // 기존 자리 초기화

    layout.forEach(student => {
        const seat = document.createElement('div');
        seat.className = `seat ${student.gender === '남' ? 'boy' : 'girl'}`;
        seat.textContent = student.name;
        classroom.appendChild(seat);
    });
}
