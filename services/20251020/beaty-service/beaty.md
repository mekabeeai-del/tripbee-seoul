# Beaty Service

**포트**: 8000
**역할**: AI 캐릭터 'Beaty'를 통한 통합 오케스트레이션 서비스

---

## 아키텍처

### 수직 구조 (Vertical Architecture)
```
beaty-service/
├── main.py (262줄)              # FastAPI 앱, 엔드포인트
├── test_ui.html                 # 테스트 UI
├── orchestration/               # 공통 모듈
│   ├── intent_classifier.py
│   ├── intent_classify_prompt.txt
│   ├── geocoder.py
│   └── beaty_character_prompt.txt
└── pipelines/                   # 의도별 파이프라인
    ├── recommend/               # RECOMMEND 파이프라인
    │   ├── pipeline.py
    │   ├── query_rewriter.py
    │   ├── query_rewrite_prompt.txt
    │   ├── category_resolver.py
    │   └── position_resolver.py
    ├── findplace/               # FIND_PLACE 파이프라인
    │   ├── pipeline.py
    │   ├── query_rewriter.py
    │   └── query_rewrite_prompt.txt
    └── route/                   # ROUTE 파이프라인
        └── pipeline.py
```

---

## 의도 분류 (Intent Classification)

### 7가지 의도

**1. FIND_PLACE** (기본 의도 - Google Places API)
- "알려줘", "추천해줘", "찾아줘" 등 일반적인 요청
- 브랜드명/체인점: "스타벅스", "CU", "맥도날드"
- 위치 질문: "어디야", "위치"
- **예시**: "홍대 일식집 알려줘", "카페 추천해줘", "경복궁 어디야"

**2. RECOMMEND** (히든 기능 - "비티" 키워드 필수, DB POI)
- "비티" 키워드가 명시적으로 포함된 경우만
- **예시**: "비티가 추천해줘", "비티 생각엔?", "비티가 좋아하는 카페"

**3. ROUTE** (경로/길찾기 - ODSay API)
- "~에서 ~까지", "가는 길", "어떻게 가"
- **예시**: "명동에서 경복궁 가는 길"

**4-7. EXPERIENCE, EVENT, RANDOM, GENERAL_CHAT**
- 체험/투어, 행사/이벤트, 무작위 추천, 일반 대화

### FIND_PLACE vs RECOMMEND 핵심 구분
```
✅ FIND_PLACE (기본):
   - "일식집 알려줘" → FIND_PLACE
   - "카페 추천해줘" → FIND_PLACE
   - "홍대 일식집" → FIND_PLACE

✅ RECOMMEND (히든):
   - "비티가 추천하는 일식집" → RECOMMEND
   - "비티 생각엔 어디가 좋아?" → RECOMMEND
```

**중요**: "추천해줘", "알려줘" 같은 일반 동사는 **FIND_PLACE**!
**RECOMMEND**는 오직 **"비티" 키워드가 있을 때만**!

---

## 통합 파이프라인 플로우

```
사용자 질의
  ↓
Step 1: 의도분류/슬롯추출 (Intent Classifier)
  ↓
Step 2-N: 의도별 파이프라인 실행
  ↓
  ├─ FIND_PLACE → findplace/pipeline.py
  ├─ RECOMMEND → recommend/pipeline.py
  └─ ROUTE → route/pipeline.py
  ↓
최종 응답 반환 (answer + data)
```

---

## Orchestration 모듈

### 1. intent_classifier.py
**기능**: 의도분류 및 슬롯추출
**모델**: GPT-4o-mini Function Calling
**프롬프트**: `intent_classify_prompt.txt`

**슬롯 추출** (FIND_PLACE/RECOMMEND 공통):
- `location_keyword`: 장소명 (홍대, 명동 등)
- `category_text`: 카테고리 (일식집, 카페 등)
- `emotion`: 감정/분위기 (힐링, 조용한 등)
- `hard_constraints`: 절대 조건 (주차가능, 무료 등)

**슬롯 추출** (ROUTE 전용):
- `origin_keyword`: 출발지
- `destination_keyword`: 도착지
- `transportation_mode`: 교통수단 (subway, bus, null)
- `route_preference`: 경로 우선순위 (fastest, min_transfer, min_walk)

### 2. geocoder.py (GoogleGeocoder)
**기능**: Google Geocoding API로 주소 → 좌표 변환
**사용처**: ROUTE 파이프라인 (출발지/도착지 좌표 변환)

---

## Pipeline 모듈

### RECOMMEND Pipeline
**파일**: `pipelines/recommend/pipeline.py`
**의도**: "비티가 추천해줘" (히든 기능)
**데이터 소스**: DB POI (KTO_TOUR_BASE_LIST)

**단계**:
1. Intent 분류 (main.py)
2. 카테고리 해결 (category_resolver.py)
3. 위치 해결 (position_resolver.py)
4. 쿼리 리라이트 (query_rewriter.py)
5. POI 검색 (recommend-service 호출)
6. 최종 응답 생성

**내부 모듈**:
- `category_resolver.py`: 카테고리 키워드 → cat_code 변환 (벡터 유사도)
- `position_resolver.py`: 위치 키워드 → geometry_id 변환 (벡터 유사도)
- `query_rewriter.py`: 자연어 → 구조화된 쿼리 변환 (GPT-4o-mini)

### FIND_PLACE Pipeline
**파일**: `pipelines/findplace/pipeline.py`
**의도**: "일식집 알려줘" (기본)
**데이터 소스**: Google Places API

**단계**:
1. Intent 분류 (main.py)
2. 쿼리 리라이트 (query_rewriter.py)
3. 장소 검색 (findplace-service 호출)
4. 최종 응답 생성

**내부 모듈**:
- `query_rewriter.py`: 자연어 → Google Places API 필터 변환

### ROUTE Pipeline
**파일**: `pipelines/route/pipeline.py`
**의도**: "명동에서 경복궁 가는 길"
**데이터 소스**: ODSay 대중교통 API

**단계**:
1. Intent 분류 (main.py)
2. 출발지/도착지 추출
3. 좌표 변환 (Google Geocoder)
4. 경로 검색 (route-service 호출)
5. GeoJSON 생성
6. 최종 응답 생성

---

## API 엔드포인트

### POST /api/query
**통합 파이프라인 엔드포인트**

**Request**:
```json
{
  "query": "홍대 일식집 알려줘",
  "user_location": {"lat": 37.5665, "lng": 126.9780},  // optional
  "mode": "test"  // "test" or "real"
}
```

**Response (test mode)**:
```json
{
  "intent": "FIND_PLACE",
  "steps": [
    {"step": 1, "name": "의도분류", "result": {...}},
    {"step": 2, "name": "쿼리 리라이트", "result": {...}},
    {"step": 3, "name": "장소 검색", "result": {...}},
    {"step": 4, "name": "최종응답", "result": {...}}
  ],
  "final_response": {
    "answer": "홍대 근처 일식집 10곳을 찾았습니다...",
    "places": [...]
  }
}
```

**Response (real mode)**:
```json
{
  "intent": "FIND_PLACE",
  "answer": "홍대 근처 일식집 10곳을 찾았습니다...",
  "data": {
    "places": [...],
    "count": 10
  }
}
```

### GET /health
헬스체크

---

## 외부 서비스 의존성

**recommend-service** (port 8001):
- RECOMMEND 의도 처리
- DB POI 검색 (벡터 유사도 + 필터)

**route-service** (port 8002):
- ROUTE 의도 처리
- ODSay 대중교통 API 호출

**findplace-service** (port 8003):
- FIND_PLACE 의도 처리
- Google Places API 호출

---

## BeatyService 클래스

**main.py** (262줄)

**초기화**:
- `intent_classifier`: 의도분류기
- `google_geocoder`: Google Geocoding API
- `config`: API keys, DB config
- `character_prompt`: Beaty 캐릭터 프롬프트

**메서드**:
- `__init__()`: 설정 로드 및 모듈 초기화

**Beaty 캐릭터 특징** (`beaty_character_prompt.txt`):
- 친근하고 밝은 성격
- 서울 여행 전문가
- 간결하고 유용한 정보 제공
- 존댓말 사용
- 2-4문장으로 간결하게 응답

---

## 비용 분석 (1회 조회당)

### GPT-4o-mini 호출
1. **의도분류**: ~150 토큰
2. **쿼리 리라이트** (RECOMMEND/FIND_PLACE): ~300 토큰
3. **최종 응답 생성**: ~500 토큰

**가격**: Input $0.15/1M, Output $0.60/1M
**비용**: ~$0.0006 (약 0.85원)

### text-embedding-ada-002 (RECOMMEND만)
1. 카테고리 임베딩: ~10 토큰
2. 위치 임베딩: ~10 토큰

**가격**: $0.10/1M
**비용**: ~$0.000002 (거의 무료)

### Google Places API (FIND_PLACE만)
**Text Search**: $32/1,000 requests (약 43원/1회)

### ODSay API (ROUTE만)
**무료** (공공데이터)

---

## 전체 플로우 예시

### 예시 1: FIND_PLACE (기본)
**질의**: "홍대 일식집 알려줘"

```
Step 1: 의도분류
→ intent: "FIND_PLACE"
→ location_keyword: "홍대"
→ category_text: "일식집"

Step 2: 쿼리 리라이트
→ search_keyword: "홍대 일식집"
→ filters: {}

Step 3: 장소 검색 (Google Places API)
→ 10개 장소 반환

Step 4: 최종 응답 생성 (GPT-4o-mini)
→ "홍대 근처 일식집 10곳을 찾았습니다..."
```

### 예시 2: RECOMMEND (히든)
**질의**: "비티가 추천하는 홍대 카페"

```
Step 1: 의도분류
→ intent: "RECOMMEND"
→ location_keyword: "홍대"
→ category_text: "카페"

Step 2: 카테고리 해결
→ cat_code: "A05020900", cat_level: 3

Step 3: 위치 해결
→ geometry_id: 7, name: "홍대 상권특구"

Step 4: 쿼리 리라이트
→ query_text: "카페"
→ preferences: {}

Step 5: POI 검색 (DB)
→ 10개 POI 반환 (벡터 유사도)

Step 6: 최종 응답 생성
→ "홍대에 있는 카페 10곳을 추천드릴게요..."
```

### 예시 3: ROUTE
**질의**: "명동에서 경복궁 가는 길"

```
Step 1: 의도분류
→ intent: "ROUTE"
→ origin_keyword: "명동"
→ destination_keyword: "경복궁"

Step 2: 출발지/도착지 추출
→ origin: "명동", destination: "경복궁"

Step 3: 좌표 변환 (Google Geocoding)
→ origin: (37.563, 126.982)
→ destination: (37.580, 126.977)

Step 4: 경로 검색 (ODSay API)
→ 3개 경로 반환

Step 5: GeoJSON 생성
→ 출발지/도착지 마커 + 경로 LineString

Step 6: 최종 응답 생성
→ "경복궁까지 가는 경로를 찾았어요! 약 15분..."
```

---

## 실행 방법

```bash
cd services/beaty-service
python main.py
# 또는
quick_start.bat
```

**접속**: http://localhost:8000

**테스트 UI**: http://localhost:8000 (test_ui.html)

---

## 테스트 시나리오

### FIND_PLACE 테스트
```json
{"query": "홍대 일식집", "mode": "test"}
{"query": "일식집 알려줘", "mode": "test"}
{"query": "카페 추천해줘", "mode": "test"}
```

### RECOMMEND 테스트
```json
{"query": "비티가 추천해줘", "mode": "test"}
{"query": "비티가 좋아하는 홍대 카페", "mode": "test"}
```

### ROUTE 테스트
```json
{"query": "명동에서 경복궁 가는 길", "mode": "test"}
```

---

## 최적화 이력

### 2025-10-10 리팩토링
**목표**: 코드 정리 및 구조 개선

**변경사항**:
1. ✅ 수직 구조로 전환 (orchestration/ + pipelines/)
2. ✅ main.py 대폭 축소 (502줄 → 262줄, 240줄 감소)
3. ✅ 사용 안 하는 메서드 5개 삭제 (229줄)
4. ✅ poi_geocoder.py 삭제 (사용 안 함)
5. ✅ resolver들을 recommend pipeline 내부로 이동
6. ✅ FIND_PLACE vs RECOMMEND 구분 재정의
   - 기본: FIND_PLACE ("추천해줘", "알려줘")
   - 히든: RECOMMEND ("비티" 키워드 포함)
7. ✅ intent_classify_prompt.txt 재작성
8. ✅ 각 pipeline이 독립적으로 동작

**결과**:
- 코드 라인 수: 502 → 262줄 (240줄 감소, 52% 감소)
- 의존성 명확화
- 유지보수성 향상

---

## 향후 개선 사항

### 성능 최적화
1. 자주 나오는 쿼리 패턴 캐싱
2. 임베딩 결과 캐싱 (동일 키워드)
3. 의도분류 결과 캐싱

### 기능 추가
1. 다국어 지원 (영어, 일본어, 중국어)
2. 음성 입력/출력
3. 대화 히스토리 관리
4. 개인화 추천

### 비용 절감
1. 의도분류: 경량 모델로 전환 (DistilBERT)
2. 쿼리 리라이트: 규칙 기반으로 전환
3. Google Places API 캐싱
