# Recommend Service

**포트**: 8001
**역할**: 하이브리드 POI 검색 엔진 (벡터 유사도 + 필터)

---

## 개요

내부 DB (KTO_TOUR_BASE_LIST)에서 큐레이션된 POI를 검색하는 서비스
**사용처**: RECOMMEND 의도 ("비티가 추천해줘" - 히든 기능)

---

## 검색 알고리즘

### 3단계 우선순위
```sql
ORDER BY
  keyword_match_count DESC,  -- 1순위: 핵심 키워드 매칭 (절대적)
  emotion_score DESC,         -- 2순위: 감정 유사도 (상대적)
  distance_km ASC             -- 3순위: 거리
```

### 1단계: Core Keywords LIKE 매칭 (절대적)
**목적**: POI 제목/설명에서 핵심 키워드 직접 매칭

**방법**:
```sql
keyword_match_count = (
  CASE WHEN LOWER(title) LIKE LOWER('%라멘%')
       OR LOWER(overview) LIKE LOWER('%라멘%') THEN 1 ELSE 0 END +
  CASE WHEN LOWER(title) LIKE LOWER('%우동%')
       OR LOWER(overview) LIKE LOWER('%우동%') THEN 1 ELSE 0 END
)
```

**예시**:
- 검색: "라멘이나 우동 맛집"
- core_keywords: `["라멘", "우동"]`
- POI 제목에 "라멘" 포함 → +1
- POI 제목에 "우동" 포함 → +1
- 둘 다 포함 → keyword_match_count = 2

**특징**: 가장 높은 우선순위 (정확한 매칭)

### 2단계: Emotion Vector (상대적)
**목적**: 분위기/감정 키워드에 대한 유사도 계산

**모델**: text-embedding-ada-002

**방법**:
1. 감정 키워드를 벡터 임베딩으로 변환
2. POI의 `combined_embedding`과 코사인 유사도 계산
3. `emotion_score = 1 - (combined_embedding <=> query_embedding)`

**예시**:
- 감정 키워드: `["힐링", "조용한", "예쁜"]`
- 임베딩 생성: "힐링 조용한 예쁜" → vector
- 각 POI와 유사도 계산 → 0~1 점수

**특징**: 상대적 매칭 (비슷한 분위기)

### 3단계: Distance (거리)
**목적**: 사용자 위치 또는 거점 중심으로부터의 거리

**방법**:
```sql
ST_Distance(
  location::geography,
  ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
) / 1000 AS distance_km
```

**특징**: 최종 정렬 기준

---

## 필터링 조건

### 1. Category Filter (카테고리)
```python
WHERE content_type_id = '39'  -- 대분류
  AND cat3 = 'A05020900'      -- 소분류
```

**카테고리 구조**:
- `content_type_id`: 대분류
  - `12`: 관광지
  - `14`: 문화시설
  - `15`: 축제공연
  - `28`: 레포츠
  - `32`: 숙박
  - `38`: 쇼핑
  - `39`: 음식점
- `cat_level`: 카테고리 깊이 (1~3)
- `cat_code`: 실제 카테고리 코드

### 2. Geometry Filter (위치)

#### POLYGON/MULTIPOLYGON (면 데이터)
```sql
WHERE ST_Intersects(location, geometry)
```
**예시**: 홍대 상권특구 POLYGON 내부

#### POINT (점 데이터)
```sql
WHERE ST_DWithin(
  location::geography,
  geometry::geography,
  500  -- 500m 반경
)
```
**예시**: 경복궁 POINT로부터 500m 반경

#### user_location만 있는 경우
```sql
WHERE ST_DWithin(
  location::geography,
  ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
  500
)
```

### 3. Hard Constraints (절대 조건)
```python
filters = {
  "is_parking_available": true,   # 주차 가능
  "is_free_admission": true,       # 무료 입장
  "is_credit_card_ok": true,       # 카드 결제
  "is_currently_open": true        # 현재 영업 중
}
```

---

## API 엔드포인트

### POST /api/recommend
**POI 추천 검색**

**Request**:
```json
{
  "query_text": "조용한 카페",
  "category": {
    "cat_code": "A05020900",
    "cat_level": 3,
    "content_type_id": "39"
  },
  "geometry_id": 7,
  "user_location": {
    "lat": 37.5665,
    "lng": 126.9780
  },
  "filters": {
    "is_parking_available": true
  },
  "preferences": {
    "emotions": ["힐링", "조용한"]
  },
  "core_keywords": ["라멘", "우동"],
  "limit": 10
}
```

**Response**:
```json
{
  "success": true,
  "query": "조용한 카페",
  "count": 10,
  "results": [
    {
      "content_id": 12345,
      "content_type_id": "39",
      "title": "XX카페",
      "overview": "조용하고 아늑한...",
      "addr1": "서울 마포구 서교동 123",
      "mapx": 126.9220,
      "mapy": 37.5563,
      "first_image": "http://...",
      "is_parking_available": true,
      "emotion_score": 0.87,
      "distance_km": 0.5,
      "keyword_match_count": 0
    }
  ]
}
```

### GET /health
**헬스체크**

---

## DB 테이블

### KTO_TOUR_BASE_LIST
**메인 POI 테이블**

**주요 컬럼**:
- `content_id` (PK): POI 고유 ID
- `content_type_id`: 대분류 코드
- `cat1`, `cat2`, `cat3`: 카테고리 (레벨별)
- `title`: 제목
- `overview`: 설명
- `addr1`, `addr2`: 주소
- `mapx`, `mapy`: 경위도 좌표
- `location` (geometry): PostGIS 위치 데이터
- `combined_embedding` (vector): 임베딩 벡터
- `first_image`, `first_image2`: 이미지 URL
- `language`: 언어 코드

**필터 컬럼**:
- `is_parking_available`: 주차 가능 여부
- `is_credit_card_ok`: 카드 결제 가능 여부
- `is_free_admission`: 무료 입장 여부
- `is_currently_open`: 현재 영업 여부
- `price_range`: 가격대
- `cuisine_type`: 음식 종류 (음식점)
- `accommodation_type`: 숙박 유형 (숙박)

---

## 검색 시나리오 예시

### 시나리오 1: 절대적 키워드 우선
**검색**: "홍대 라멘 맛집"

**처리**:
1. core_keywords: `["라멘"]`
2. category: 음식점 (39)
3. geometry_id: 홍대 (7)

**결과**:
- 제목에 "라멘" 포함된 POI가 최우선
- emotion_score는 참고용
- 거리 가까운 순

### 시나리오 2: 상대적 키워드 (분위기)
**검색**: "홍대 힐링되는 조용한 카페"

**처리**:
1. core_keywords: `[]` (특정 메뉴 없음)
2. category: 카페/전문음료점 (A05020900)
3. geometry_id: 홍대 (7)
4. preferences: `{"emotions": ["힐링", "조용한"]}`

**결과**:
- emotion_score 높은 순
- 거리 가까운 순

### 시나리오 3: 혼합 (절대 + 상대)
**검색**: "명동 주차 가능한 분위기 좋은 일식집"

**처리**:
1. core_keywords: `["일식"]`
2. category: 음식점 (39)
3. geometry_id: 명동
4. filters: `{"is_parking_available": true}`
5. preferences: `{"emotions": ["분위기 좋은"]}`

**결과**:
1. 주차 가능 필터링 (hard constraint)
2. "일식" 포함된 POI 우선
3. emotion_score 높은 순
4. 거리 가까운 순

---

## 성능 최적화

### 인덱스
```sql
-- 위치 인덱스
CREATE INDEX idx_location
ON KTO_TOUR_BASE_LIST USING GIST(location);

-- 벡터 인덱스
CREATE INDEX idx_embedding
ON KTO_TOUR_BASE_LIST
USING ivfflat(combined_embedding vector_cosine_ops);

-- 카테고리 인덱스
CREATE INDEX idx_category
ON KTO_TOUR_BASE_LIST(content_type_id, cat3);

-- 복합 인덱스
CREATE INDEX idx_lang_type
ON KTO_TOUR_BASE_LIST(language, content_type_id);
```

### 쿼리 최적화
1. `language = 'Kor'` 먼저 필터링
2. category, geometry 순차 필터링
3. 벡터 유사도는 필터링 후 계산
4. LIMIT으로 결과 제한

---

## Beaty Service 통합

**호출 위치**: `pipelines/recommend/pipeline.py`

**호출 예시**:
```python
async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8001/api/recommend",
        json={
            "query_text": "조용한 카페",
            "category": {"cat_code": "A05020900", ...},
            "geometry_id": 7,
            "user_location": {"lat": 37.5665, "lng": 126.9780}
        },
        timeout=30.0
    )
```

---

## 실행 방법

```bash
cd services/recommend-service
python main.py
# 또는
quick_start.bat
```

**접속**: http://localhost:8001

---

## 비용

**무료** (내부 DB 사용)
- PostgreSQL 쿼리 비용만 발생
- 벡터 유사도 계산도 DB 내부에서 처리

---

## 테스트

```bash
curl -X POST http://localhost:8001/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "query_text": "조용한 카페",
    "category": {
      "cat_code": "A05020900",
      "cat_level": 3,
      "content_type_id": "39"
    },
    "geometry_id": 7,
    "limit": 10
  }'
```

---

## 향후 개선 사항

### 검색 품질
1. 동의어 사전 구축 ("힐링" = "편안한", "여유로운")
2. 부정어 처리 ("조용하지 않은" 필터링)
3. 멀티모달 검색 (이미지 유사도)

### 성능
1. 캐싱 (인기 검색어)
2. 벡터 인덱스 튜닝
3. 쿼리 플랜 최적화

### 기능
1. 개인화 추천 (사용자 히스토리)
2. 실시간 인기도 반영
3. 리뷰/평점 통합
