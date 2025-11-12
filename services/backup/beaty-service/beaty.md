# Beaty Service

**포트**: 8000
**역할**: AI 캐릭터 'Beaty'를 통한 사용자 대화 처리 - 통합 오케스트레이션 서비스

---

## 파이프라인

```
사용자 질의
  → 의도분류/슬롯추출
  → 카테고리 해결
  → 거점위치 해결
  → 쿼리 리라이트
  → POI 검색 (recommend-service 호출)
  → 자연어 응답 생성
  → GeoJSON 생성
  → 응답 반환
```

---

## 내부 모듈 (외부 의존성 제거됨)

### 1. intent_classifier.py
**기능**: 의도분류 및 슬롯추출
**모델**: GPT-4o-mini Function Calling

**의도 분류 (7가지)**:
- `FIND_PLACE`: 특정 장소 찾기 ("경복궁 어디야")
- `RECOMMEND`: 추천 요청 ("맛집 추천해줘")
- `ROUTE`: 경로/길찾기 ("명동에서 경복궁 가는 길")
- `EVENT`: 행사/이벤트 ("이번 주 축제")
- `GENERAL_CHAT`: 일반 대화 ("안녕")

**슬롯 추출**:
- `location_keyword`: 장소명 (홍대, 명동, 경복궁 등)
- `category_text`: 카테고리 텍스트 (맛집, 카페, 관광지 등)
- `emotion`: 감정/분위기 (힐링, 조용한, 예쁜 등)
- `hard_constraints`: 절대 조건 (주차가능, 무료, 카드결제 등)
- `confidence`: 분류 신뢰도 (0~1)

**프롬프트 관리**: `system_prompt.txt` 파일

---

### 2. category_resolver.py
**기능**: 카테고리 키워드를 실제 카테고리 코드/레벨로 해결
**모델**: text-embedding-ada-002

**알고리즘**: LIKE 검색 (60%) + 벡터 유사도 (40%) 하이브리드
1. LIKE 검색으로 후보 찾기 (name, keywords)
2. 각 후보의 벡터 유사도 계산
3. 결합 점수 = LIKE 점수 * 0.6 + 벡터 점수 * 0.4
4. 레벨 가산점 적용 (하위 레벨 선호: +0.02 * (4 - cat_level))

**DB 테이블**: `kto_tour_category`
- cat_code, cat_level, parent_code
- name, keywords
- content_type_id, content_type_name
- embedding (vector)
- lang

**출력**:
```python
{
  "cat_code": "A05020900",
  "cat_level": 3,
  "content_type_id": "39",
  "name": "카페/전문음료점",
  "similarity": 0.89
}
```

---

### 3. position_resolver.py
**기능**: 위치 키워드를 실제 거점 정보로 해결
**모델**: text-embedding-ada-002

**알고리즘**: LIKE 검색 + 벡터 유사도 하이브리드
1. LIKE 검색 (name, alias) + 벡터 유사도 동시 계산
2. POLYGON 타입 가산점 (+0.03)

**DB 테이블**:
- `mkb_master_position_info`: 거점 정보
- `mkb_master_position_geometry`: 지오메트리 데이터

**출력**:
```python
{
  "geometry_id": 7,
  "name": "홍대 상권특구",
  "geom_type": "POLYGON",
  "geojson": {...},
  "similarity": 0.90
}
```

---

### 4. query_rewriter.py
**기능**: 쿼리 최적화 및 구조화
**모델**: GPT-4o-mini Function Calling

**변환 작업**:
1. `hard_constraints` → `filters` 변환
   - "주차" → `is_parking_available: true`
   - "무료" → `is_free_admission: true`
   - "카드" → `is_credit_card_ok: true`
   - "24시간" → `is_currently_open: true`

2. `emotion` → `preferences` 변환
   - "힐링, 조용한" → `emotions: ["힐링", "조용한"]`

3. `core_keywords` 추출
   - POI 제목/설명 LIKE 검색용 핵심 키워드
   - 예: "라멘이나 우동 맛집" → `["라멘", "우동"]`

**프롬프트 관리**: `query_rewrite_prompt.txt` 파일

---

### 5. main.py
**기능**: FastAPI 메인 서버

**BeatyService 클래스**:
- 전체 파이프라인 오케스트레이션
- GPT-4o-mini로 자연어 응답 생성 (Beaty 캐릭터)
- GeoJSON 생성 및 반환
- recommend-service 호출

**Beaty 캐릭터 특징**:
- 친근하고 밝은 성격
- 서울 여행 전문가
- 간결하고 유용한 정보 제공
- 이모티콘 사용 안 함
- 존댓말 사용
- 2-4문장으로 간결하게 응답

---

## 외부 의존성

- **recommend-service (8001)**: POI 검색만 외부 호출

---

## API 엔드포인트

### 사용자용
- `POST /api/chat`: 전체 파이프라인
  ```json
  Request: {
    "query": "홍대 근처 조용한 카페 추천해줘",
    "user_location": {"lat": 37.5665, "lng": 126.9780}
  }

  Response: {
    "success": true,
    "query": "...",
    "intent": "RECOMMEND",
    "natural_response": "홍대 근처에 조용한 카페 10곳을 찾았습니다...",
    "geojson": {...},
    "pois": [...],
    "debug_info": {...}
  }
  ```

### 테스트/디버깅용
- `POST /api/step1/classify`: 의도분류 테스트
- `POST /api/step2/category`: 카테고리 해결 테스트
- `POST /api/step3/position`: 거점위치 해결 테스트
- `POST /api/step4/rewrite`: 쿼리 리라이트 테스트
- `POST /api/step5/recommend`: POI 검색 테스트
- `POST /api/step6/generate-response`: 자연어 응답 생성 테스트

### 프롬프트 관리
- `GET /api/system-prompt`: 의도분류 프롬프트 조회
- `POST /api/system-prompt`: 의도분류 프롬프트 업데이트
- `GET /api/rewrite-prompt`: 리라이트 프롬프트 조회
- `POST /api/rewrite-prompt`: 리라이트 프롬프트 업데이트

### 헬스체크
- `GET /health`: 서비스 상태 확인

---

## 비용 분석 (1회 조회당)

### GPT-4o-mini (3회 호출)
1. 의도분류/슬롯추출: ~150 토큰
2. 쿼리 리라이트: ~300 토큰
3. 자연어 응답 생성: ~500 토큰

**가격**: Input $0.15/1M, Output $0.60/1M
**비용**: ~$0.0006

### text-embedding-ada-002 (3회 호출)
1. 카테고리 임베딩: ~10 토큰
2. 위치 임베딩: ~10 토큰
3. 감정 임베딩: ~20 토큰

**가격**: $0.10/1M
**비용**: ~$0.000004

### 총 비용
- **1회당: 약 0.85원**
- **일 3천명 × 10회 = 일 3만회 = 25,500원/일**
- **월 30일 기준: 약 77만원/월**
- **연간: 약 920만원**

---

## 전체 플로우 예시

**사용자 질의**: "홍대 근처 조용한 카페 추천해줘"

### Step 1: 의도분류
```python
{
  "intent": "RECOMMEND",
  "location_keyword": "홍대",
  "category_text": "카페",
  "emotion": "조용한",
  "hard_constraints": [],
  "confidence": 0.95
}
```

### Step 2: 카테고리 해결
```python
{
  "cat_code": "A05020900",
  "cat_level": 3,
  "content_type_id": "39"
}
```

### Step 3: 거점위치 해결
```python
{
  "geometry_id": 7,
  "name": "홍대 상권특구",
  "geom_type": "POLYGON"
}
```

### Step 4: 쿼리 리라이트
```python
{
  "query_text": "조용한 카페",
  "filters": {},
  "preferences": {"emotions": ["조용한"]},
  "core_keywords": []
}
```

### Step 5: POI 검색 (recommend-service 호출)
- WHERE: content_type_id=39, cat3="A05020900", ST_Intersects(홍대 POLYGON)
- ORDER BY: emotion_score DESC, distance ASC
- 결과: 10개 POI

### Step 6: 자연어 응답 생성
```
홍대 근처에 조용한 분위기의 카페 10곳을 찾았습니다.
1. XX카페 - 서교동 123
2. YY카페 - 연남동 456
...
```

### Step 7: GeoJSON 생성
```json
{
  "type": "FeatureCollection",
  "features": [...]
}
```

---

## 최적화 여지

### 비용 절감 (최대 66% 가능)
1. **의도분류/슬롯추출**: 경량 분류 모델로 전환
   - DistilBERT, FastText 등
   - 7개 의도 분류는 충분히 가능
   - 비용 33% 절감

2. **쿼리 리라이트**: 규칙 기반으로 전환
   - 템플릿 기반 변환
   - 이미 fallback 로직 존재
   - 비용 33% 절감

3. **자연어 응답 생성**: GPT 유지 필수
   - Beaty 캐릭터 톤앤매너 유지 위해 필요

**결과**: 월 77만원 → 26만원 (51만원 절감)

### 성능 최적화
1. 자주 나오는 쿼리 패턴 캐싱
2. 임베딩 결과 캐싱 (동일 키워드)
3. 카테고리/위치 해결 결과 캐싱
4. 의도분류 결과 캐싱

---

## 실행 방법

```bash
cd services/beaty-service
python main.py
# 또는
quick_start.bat
```

**접속**: http://localhost:8000

---

## 테스트 UI

`test_ui.html` - 단계별 테스트 및 전체 파이프라인 테스트 가능
