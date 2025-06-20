// 기본 Express 서버 설정
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 35000;

// JSON 요청 본문을 파싱하고 정적 파일을 제공하기 위한 미들웨어 설정
app.use(express.json());
app.use(express.static('.'));

// 루트 경로 접속 시 기본 페이지로 리다이렉트
app.get('/', (req, res) => {
  res.redirect('/calender.html');
});

// '/api/images' - assets 폴더의 이미지 목록 반환
app.get('/api/images', async (req, res) => {
  const assetsPath = path.join(__dirname, 'assets');
  try {
    const allFiles = await fs.readdir(assetsPath);
    // jpg, png 등 이미지 파일만 필터링해서 클라이언트용 경로로 변환
    const imageFiles = allFiles
      .filter(file => ['.jpg', '.jpeg', '.png', '.gif'].includes(path.extname(file).toLowerCase()))
      .map(file => `assets/${file}`);
    
    res.json(imageFiles);
  } catch (error) {
    console.error('이미지 목록 로딩 중 에러:', error);
    res.status(500).json({ success: false, message: '이미지 목록을 가져오는 데 실패했습니다.' });
  }
});

// '/api/profile' - 프로필 정보 업데이트
app.post('/api/profile', async (req, res) => {
  const filePath = path.join(__dirname, 'data', 'profile.json');
  
  try {
    let existingProfile = {};
    // 기존 프로필 파일이 있으면 읽고, 없으면 빈 객체로 시작 (파일이 없는 경우도 정상 처리)
    try {
      const currentData = await fs.readFile(filePath, 'utf8');
      existingProfile = JSON.parse(currentData);
    } catch (readError) {
      console.log('profile.json을 찾을 수 없어 새로 생성합니다.');
    }

    // 기존 데이터에 새로 받은 데이터를 덮어쓰기
    const updatedProfile = { ...existingProfile, ...req.body };
    const newProfileJson = JSON.stringify(updatedProfile, null, 2);

    await fs.writeFile(filePath, newProfileJson, 'utf8');
    
    res.json({ success: true, message: '프로필이 성공적으로 저장되었습니다.' });

  } catch (error) {
    console.error('프로필 저장 중 에러:', error);
    res.status(500).json({ success: false, message: '서버에서 프로필 저장 중 오류가 발생했습니다.' });
  }
});

// '/api/workouts' - 운동 일정 추가
app.post('/api/workouts', async (req, res) => {
  const filePath = path.join(__dirname, 'data', 'workouts.json');
  const newWorkoutsByDate = req.body.workouts;

  try {
    let workoutsData = { workouts: {} };
    try {
      const data = await fs.readFile(filePath, 'utf8');
      workoutsData = JSON.parse(data);
    } catch (readError) {
      console.log('workouts.json을 찾을 수 없어 새로 생성합니다.');
    }

    if (!workoutsData.workouts) {
      workoutsData.workouts = {};
    }

    // 새로운 데이터를 기존 데이터에 병합
    for (const date in newWorkoutsByDate) {
      if (workoutsData.workouts[date]) {
        workoutsData.workouts[date].push(...newWorkoutsByDate[date]);
      } else {
        workoutsData.workouts[date] = newWorkoutsByDate[date];
      }
    }

    await fs.writeFile(filePath, JSON.stringify(workoutsData, null, 2), 'utf8');
    res.json({ success: true, message: '일정이 성공적으로 저장되었습니다.' });

  } catch (error) {
    console.error('일정 저장 중 에러:', error);
    res.status(500).json({ success: false, message: '서버에서 일정 저장 중 오류가 발생했습니다.' });
  }
});

// '/api/todo/update' - 할 일 완료 상태 변경
app.post('/api/todo/update', async (req, res) => {
  const { id, date, is_checked } = req.body;
  const filePath = path.join(__dirname, 'data', 'workouts.json');

  if (!id || !date || typeof is_checked !== 'boolean') {
    return res.status(400).json({ success: false, message: '잘못된 요청입니다. id, date, is_checked는 필수입니다.' });
  }

  try {
    const data = await fs.readFile(filePath, 'utf8');
    const workoutsData = JSON.parse(data);

    let wasUpdated = false;
    if (workoutsData.workouts && workoutsData.workouts[date]) {
      const targetIndex = workoutsData.workouts[date].findIndex(item => item.id == id);
      if (targetIndex !== -1) {
        workoutsData.workouts[date][targetIndex].todolist = is_checked;
        wasUpdated = true;
      }
    }

    if (!wasUpdated) {
      return res.status(404).json({ success: false, message: '해당 일정을 찾을 수 없습니다.' });
    }

    await fs.writeFile(filePath, JSON.stringify(workoutsData, null, 2), 'utf8');
    res.json({ success: true, message: '상태가 업데이트되었습니다.' });

  } catch (error) {
    console.error('Todo 상태 업데이트 중 에러:', error);
    res.status(500).json({ success: false, message: '서버에서 상태 업데이트 중 오류가 발생했습니다.' });
  }
});

// '/api/workout' - (PUT) 특정 운동 일정 수정
app.put('/api/workout', async (req, res) => {
  const { id, date, workout } = req.body;
  const filePath = path.join(__dirname, 'data', 'workouts.json');

  if (!id || !date || !workout) {
    return res.status(400).json({ success: false, message: 'id, date, workout 데이터는 필수입니다.' });
  }

  try {
    const data = await fs.readFile(filePath, 'utf8');
    let workoutsData = JSON.parse(data);
    
    if (!workoutsData.workouts || !workoutsData.workouts[date]) {
      return res.status(404).json({ success: false, message: '해당 날짜의 일정을 찾을 수 없습니다.' });
    }

    const index = workoutsData.workouts[date].findIndex(w => w.id == id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: '해당 ID의 일정을 찾을 수 없습니다.' });
    }

    // 기존 데이터는 그대로 두고, 변경된 내용만 업데이트
    workoutsData.workouts[date][index] = { ...workoutsData.workouts[date][index], ...workout };
    
    await fs.writeFile(filePath, JSON.stringify(workoutsData, null, 2), 'utf8');
    res.json({ success: true, message: '일정이 성공적으로 수정되었습니다.' });
  } catch (error) {
    console.error('일정 수정 중 에러:', error);
    res.status(500).json({ success: false, message: '서버 오류: 일정 수정에 실패했습니다.' });
  }
});

// '/api/workout' - (DELETE) 특정 운동 일정 삭제
app.delete('/api/workout', async (req, res) => {
  const { id, date } = req.body;
  const filePath = path.join(__dirname, 'data', 'workouts.json');

  if (!id || !date) {
    return res.status(400).json({ success: false, message: 'id, date는 필수입니다.' });
  }

  try {
    const data = await fs.readFile(filePath, 'utf8');
    let workoutsData = JSON.parse(data);

    if (!workoutsData.workouts || !workoutsData.workouts[date]) {
      return res.status(404).json({ success: false, message: '해당 날짜의 일정을 찾을 수 없습니다.' });
    }

    const initialLength = workoutsData.workouts[date].length;
    workoutsData.workouts[date] = workoutsData.workouts[date].filter(w => w.id != id);

    if (workoutsData.workouts[date].length === initialLength) {
      return res.status(404).json({ success: false, message: '삭제할 일정을 찾지 못했습니다.' });
    }

    // 만약 해당 날짜에 더 이상 일정이 없으면, 그 날짜의 키 자체를 삭제
    if (workoutsData.workouts[date].length === 0) {
      delete workoutsData.workouts[date];
    }

    await fs.writeFile(filePath, JSON.stringify(workoutsData, null, 2), 'utf8');
    res.json({ success: true, message: '일정이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('일정 삭제 중 에러:', error);
    res.status(500).json({ success: false, message: '서버 오류: 일정 삭제에 실패했습니다.' });
  }
});

// 서버 실행
app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  console.log('웹 브라우저에서 위 주소로 접속하세요.');
});