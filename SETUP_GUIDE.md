# sandroad 셋업 가이드 — 1부

이 문서는 sandroad 1부(프로젝트 셋업 + Firebase 인증) 실행을 위한 단계별 가이드입니다.

---

## 📁 최종 폴더 구조 (전체 계획)

```
sandroad/
├── .env.local                    # Firebase config (gitignore)
├── .env.example                  # 예시 (커밋)
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── README.md
├── firestore.rules
├── api/                          # Vercel serverless (4부)
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── firebase/
    │   └── config.js
    ├── contexts/
    │   └── AuthContext.jsx
    ├── screens/
    │   ├── LoginScreen.jsx
    │   ├── SignupScreen.jsx
    │   ├── ProjectListScreen.jsx   # 2부
    │   ├── EditorScreen.jsx        # 2부
    │   └── GraphViewScreen.jsx     # 3부
    ├── components/
    │   ├── auth/
    │   │   └── ProtectedRoute.jsx
    │   ├── common/
    │   │   ├── LoadingSpinner.jsx
    │   │   └── ErrorBoundary.jsx
    │   ├── editor/                 # 2부
    │   ├── dashboard/              # 2부
    │   ├── graph/                  # 3부
    │   └── ai/                     # 4부
    ├── hooks/                      # 2부부터
    ├── utils/                      # 2부부터
    └── constants/                  # 2부부터
```

**1부에서 만든 파일만 이 레포에 있습니다. 2~4부 폴더는 다음 단계에서 채워집니다.**

---

## 🚀 1부 실행 단계

### 1. 레포 클론 & 의존성 설치

```bash
# 압축 해제한 sandroad 폴더로 이동
cd sandroad

# 의존성 설치
npm install
```

### 2. Firebase 프로젝트 셋업

#### 2-1. Firebase 프로젝트 생성
1. https://console.firebase.google.com 접속 → **"프로젝트 추가"**
2. 프로젝트 이름: `sandroad` (원하는 이름 가능)
3. Google Analytics: 끄거나 켜거나 자유
4. **"프로젝트 만들기"** 클릭

#### 2-2. 웹 앱 등록
1. 프로젝트 대시보드에서 **`</>`(웹)** 아이콘 클릭
2. 앱 닉네임: `sandroad-web`
3. **"Firebase 호스팅 설정" 체크 안 함** (Vercel 쓸 거라서)
4. **"앱 등록"** 클릭
5. 나오는 `firebaseConfig` 값 6개를 **메모장에 복사**

#### 2-3. Authentication 설정
1. 왼쪽 메뉴 → **Authentication** → **"시작하기"**
2. **Sign-in method** 탭 이동
3. 두 가지 활성화:
   - **이메일/비밀번호**: 클릭 → "사용 설정" 토글 ON → 저장
   - **Google**: 클릭 → "사용 설정" 토글 ON → 프로젝트 지원 이메일 선택 → 저장

#### 2-4. Firestore 설정
1. 왼쪽 메뉴 → **Firestore Database** → **"데이터베이스 만들기"**
2. 위치: **asia-northeast3 (Seoul)** 추천
3. 보안 규칙: **"프로덕션 모드로 시작"** 선택
4. 생성 완료 후 **규칙** 탭으로 이동
5. 레포의 `firestore.rules` 내용을 복사해서 붙여넣기 → **"게시"**

### 3. 환경변수 설정

레포 루트에 `.env.local` 파일 생성:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=sandroad-xxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sandroad-xxx
VITE_FIREBASE_STORAGE_BUCKET=sandroad-xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

위 2-2에서 복사한 `firebaseConfig` 값을 각 변수에 대응해서 붙여넣기.

**주의**: `.env.local`은 절대 Git에 커밋되면 안 됨. `.gitignore`에 이미 포함되어 있어요.

### 4. 로컬 실행

```bash
npm run dev
```

→ http://localhost:5173 자동으로 열림

### 5. 테스트

- [ ] 회원가입 화면에서 계정 만들기 → 홈으로 이동
- [ ] 로그아웃
- [ ] 이메일/비번 로그인 → 홈으로 이동
- [ ] 로그아웃
- [ ] Google 로그인 → 홈으로 이동
- [ ] 홈 화면에 이메일, UID 표시되는지 확인
- [ ] Firebase 콘솔 → Authentication → Users 탭에서 계정 등록 확인

---

## 📦 GitHub 레포 생성

```bash
git init
git add .
git commit -m "1부: 프로젝트 셋업 + Firebase 인증"

# GitHub에서 sandroad 레포 새로 생성한 후
git remote add origin https://github.com/YOUR_USERNAME/sandroad.git
git branch -M main
git push -u origin main
```

**공개 레포로 만들어주세요.** 다음 단계 작업할 때 Claude가 레포 URL로 접근해서 코드 검토할 수 있어야 합니다.

---

## ⚠️ 자주 나는 오류

### `auth/api-key-not-valid`
→ `.env.local`의 `VITE_FIREBASE_API_KEY` 값이 잘못됨. Firebase 콘솔의 프로젝트 설정에서 다시 확인.

### `auth/unauthorized-domain` (Google 로그인 시)
→ Firebase Authentication → Settings → 승인된 도메인에 `localhost`가 있는지 확인 (기본적으로 있어야 함).

### `Missing or insufficient permissions` (Firestore 관련)
→ `firestore.rules`를 제대로 게시했는지 확인. 1부에서는 Firestore 아직 쓰지 않지만 2부에서 이 규칙이 필요해요.

### Vite 환경변수가 `undefined`
→ 환경변수 이름은 반드시 `VITE_`로 시작해야 함. `.env.local` 수정 후에는 `npm run dev` 재시작 필요.

### `npm install` 중 에러
→ Node.js 버전 확인. 18 이상 권장.

---

## ✅ 1부 완료 체크리스트

- [ ] `npm run dev`로 로컬 실행됨
- [ ] 회원가입 성공
- [ ] 이메일/비번 로그인 성공
- [ ] Google 로그인 성공
- [ ] 로그인 후 홈 화면에 이메일/UID 표시됨
- [ ] 로그아웃 → 로그인 화면으로 이동
- [ ] Firebase 콘솔 → Users에 계정 등록 확인
- [ ] GitHub 공개 레포에 푸시됨

---

## 다음 단계

전부 동작 확인되면 레포 URL과 함께 **"2부 가자"** 라고 말해주세요.

**2부 내용**:
- 프로젝트 CRUD (생성/삭제/이름변경)
- Firestore 실시간 동기화
- 에디터 화면 (컬럼, 트리노드, 태그)
- 멀티 탭 + 크로스 프로젝트 복붙
- 계기판 위젯 시스템
- 자동저장
- Markdown 내보내기
