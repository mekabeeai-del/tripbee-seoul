# FindPlace Service

**포트**: 8003
**역할**: Google Places API를 활용한 장소 검색 서비스 (다국어 지원)

---

## 개요

전 세계 POI(Point of Interest) 검색 및 상세 정보 제공
**사용처**: FIND_PLACE 의도 ("일식집 알려줘" - 기본 의도)

---

## 외부 API 의존성

### Google Places API (New)
- **제공**: Google Cloud Platform
- **URL**: https://places.googleapis.com/v1/places:searchText
- **기능**: 텍스트 기반 장소 검색
- **비용**: $32/1,000 requests (약 43원/1회)
- **무료 크레딧**: $200/월

**필수 요구사항**:
1. Google Cloud Console에서 Billing 활성화
2. Places API (New) 활성화
3. API 키 발급
4. 시스템 전파 대기 (5-10분)

---

## 설계 의도

### 왜 Google Places API인가?

**FIND_PLACE vs RECOMMEND 전략**:
```
FIND_PLACE (기본):
- "홍대 일식집 알려줘"
- "카페 추천해줘"
- 브랜드명: "스타벅스", "CU"
→ Google Places API 사용 (글로벌 커버리지, 다국어, 최신 정보)

RECOMMEND (히든):
- "비티가 추천하는 홍대 카페"
- "비티 생각엔 어디가 좋아?"
→ DB POI 사용 (큐레이션, 감정 유사도)
```

**Google Places API 장점**:
1. **다국어 지원 우수**: 전 세계 POI를 각 언어로 검색 가능
2. **글로벌 커버리지**: 한국뿐만 아니라 전 세계 장소 검색
3. **상세 정보**: 평점, 리뷰, 영업시간 등 풍부한 데이터
4. **실시간 데이터**: 최신 정보, 폐업/신규 오픈 반영

**다른 API와 비교**:
| API | 한국 POI | 다국어 | 비용 | 결론 |
|-----|---------|--------|------|------|
| **Google Places** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 💰💰 | ✅ 선택 |
| Kakao Local | ⭐⭐⭐⭐⭐ | ⭐⭐ | 무료 | 한국 전용 |
| Mapbox Geocoding | ⭐⭐ | ⭐⭐⭐ | 💰 | POI 부족 |
| Naver Maps | ⭐⭐⭐⭐⭐ | ⭐ | 💰 | 한국 전용 |

---

## API 엔드포인트

### POST /api/find-place
**장소 검색**

**Request**:
```json
{
  "keyword": "홍대 일식집",
  "user_lat": 37.5665,      // optional: 기본 서울시청
  "user_lng": 126.9780,     // optional: 기본 서울시청
  "filters": {              // optional: Google Places 필터
    "parking": true,
    "open_now": true,
    "min_rating": 4.0
  },
  "limit": 5,               // optional: 기본 5
  "language": "ko"          // optional: ko, en, ja, zh 등
}
```

**Response**:
```json
{
  "success": true,
  "query": "홍대 일식집",
  "count": 5,
  "results": [
    {
      "place_id": "ChIJa...",
      "name": "XX일식집",
      "address": "서울특별시 마포구 서교동 123",
      "lat": 37.5563,
      "lng": 126.9233,
      "category": "restaurant",
      "place_types": ["restaurant", "food", "point_of_interest"]
    }
  ]
}
```

### GET /health
**헬스체크**

---

## Google Places API 상세

### Text Search 요청
```json
{
  "textQuery": "홍대 일식집",
  "languageCode": "ko",
  "maxResultCount": 5,
  "locationBias": {
    "circle": {
      "center": {
        "latitude": 37.5665,
        "longitude": 126.9780
      },
      "radius": 50000.0  // 50km
    }
  }
}
```

### 필드 마스크 (Field Mask)
**현재 요청 필드**:
```
places.displayName
places.formattedAddress
places.location
places.types
places.id
```

**추가 가능 필드** (향후):
- `places.rating`: 평점
- `places.userRatingCount`: 리뷰 수
- `places.businessStatus`: 영업 상태
- `places.currentOpeningHours`: 영업시간
- `places.photos`: 사진
- `places.priceLevel`: 가격대

**주의**: 필드 추가 시 비용 증가!

---

## 다국어 지원

### Language Code 예시
- `ko`: 한국어
- `en`: 영어
- `ja`: 일본어
- `zh`: 중국어 (간체)
- `zh-TW`: 중국어 (번체)

### 사용 예
```python
# 한국어로 검색
{"keyword": "경복궁", "language": "ko"}
# → "경복궁", "서울특별시 종로구..."

# 영어로 검색
{"keyword": "Gyeongbokgung", "language": "en"}
# → "Gyeongbokgung Palace", "161 Sajik-ro, Seoul..."

# 일본어로 검색
{"keyword": "景福宮", "language": "ja"}
# → "景福宮", "大韓民国ソウル特別市..."
```

---

## Beaty Service 통합

**호출 위치**: `pipelines/findplace/pipeline.py`

**플로우**:
```
Step 1: 의도분류 (main.py)
  → intent: "FIND_PLACE"
  → location_keyword: "홍대"
  → category_text: "일식집"

Step 2: 쿼리 리라이트 (query_rewriter.py)
  → search_keyword: "홍대 일식집"
  → filters: {}

Step 3: 장소 검색 (findplace-service 호출)
  → 5~10개 장소 반환

Step 4: 최종 응답 생성 (GPT-4o-mini)
  → "홍대 근처 일식집 10곳을 찾았습니다..."
```

**호출 예시**:
```python
async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8003/api/find-place",
        json={
            "keyword": "홍대 일식집",
            "user_lat": 37.5665,
            "user_lng": 126.9780,
            "filters": {"open_now": true},
            "language": "ko",
            "limit": 10
        },
        timeout=30.0
    )
```

---

## Query Rewriter

**파일**: `pipelines/findplace/query_rewriter.py`

**기능**: 자연어 쿼리를 Google Places API 필터로 변환

**프롬프트**: `query_rewrite_prompt.txt`

**변환 예시**:
```
입력: "주차 가능한 24시간 편의점"

출력:
{
  "search_keyword": "편의점",
  "filters": {
    "parking": true,
    "open_now": true
  },
  "limit": 5
}
```

**브랜드명 처리**:
- "스타벅스" → search_keyword에 그대로 사용
- "홍대 스타벅스" → "홍대 스타벅스"로 검색

---

## UI 시각화 (test_ui.html)

**왼쪽 패널**: 장소 리스트 카드
- 장소명, 주소, 카테고리
- 평점, 리뷰 수 (추가 예정)
- "경로 찾기" 버튼 → ROUTE 파이프라인 전환
- "비티 추천" 버튼 → RECOMMEND 파이프라인 전환

**오른쪽 패널**: 지도 (Mapbox GL JS)
- 장소 마커 표시 (파란색)
- 자동 줌인
- 마커 클릭 시 상세 정보 표시

---

## 비용 분석

### Google Places API 비용
**Text Search**: $32/1,000 requests (약 43원/1회)

**월 사용량 시나리오**:
- 하루 100명 사용, 각 2회 검색
- 월 6,000 requests
- **비용**: $192/월 (약 26만원)

**무료 크레딧**:
- $200/월 무료 크레딧
- 약 6,250 requests까지 무료

### 비용 절감 방안
1. **캐싱**: 동일 키워드 검색 결과 캐싱 (1시간)
2. **필드 최소화**: 필요한 필드만 요청
3. **하이브리드 전략**: DB에 있는 관광지는 내부 검색 우선
4. **사용량 모니터링**: Cloud Console에서 실시간 확인

---

## 하이브리드 전략 (권장)

### 의도별 API 분리

**FIND_PLACE** (Google Places):
- 일반 장소/주소 검색
- 브랜드명 검색
- 글로벌 커버리지
- 비용: $32/1K (캐싱으로 절감)
- 품질: 풍부한 정보, 최신 데이터

**RECOMMEND** (DB POI):
- 큐레이션된 추천
- 감정 유사도 검색
- 비용: 거의 없음
- 품질: 큐레이션됨, 일관성 있음

**ROUTE** (하이브리드):
- 관광지: Google Geocoding (무료)
- 일반 장소: Google Places (fallback)

---

## 실행 방법

```bash
cd services/findplace-service
python main.py
# 또는
quick_start.bat
```

**접속**: http://localhost:8003

---

## 설정

**환경 변수** (.env):
```
GOOGLE_API_KEY=AIzaSyBIQVYNLnbSdjIN2agdGeo0K10cbseBXoM
```

**CLAUDE.md 설정**:
```json
{
  "google_api_key": "AIzaSyBIQVYNLnbSdjIN2agdGeo0K10cbseBXoM"
}
```

---

## Billing 활성화 필수!

**중요**: Google Places API는 Billing 활성화 없이 사용 불가

**활성화 절차**:
1. https://console.cloud.google.com/billing 접속
2. 신용카드 등록
3. Places API (New) 활성화
4. 5-10분 대기 (시스템 전파)
5. 테스트

**에러 예**:
```json
{
  "error": {
    "code": 403,
    "message": "This API method requires billing to be enabled",
    "status": "PERMISSION_DENIED"
  }
}
```

---

## 테스트

### Python 테스트
```bash
cd services/findplace-service
python test_api.py
```

### cURL 테스트
```bash
curl -X POST http://localhost:8003/api/find-place \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "홍대 일식집",
    "language": "ko",
    "limit": 5
  }'
```

---

## 캐싱 전략 (구현 예정)

### 캐시 키
```python
cache_key = f"{keyword}:{language}:{user_lat}:{user_lng}:{filters}"
```

### 캐시 TTL
- 일반 검색: 1시간
- 브랜드 검색: 6시간
- 관광지: 12시간

### 캐시 저장소
- Redis (권장)
- In-memory dict (간단한 경우)

---

## 향후 개선 사항

### Phase 1: 기본 완성 ✅
- [x] Billing 활성화 완료
- [x] 기본 검색 구현
- [x] 다국어 테스트

### Phase 2: 상세 정보 (진행 중)
- [ ] 평점/리뷰 추가
- [ ] 영업시간 추가
- [ ] 사진 추가
- [ ] 필터 기능 확장

### Phase 3: UI 구현
- [ ] test_ui.html FIND_PLACE 파이프라인
- [ ] 장소 상세 카드
- [ ] 지도 마커 표시
- [ ] 경로 찾기 버튼

### Phase 4: 최적화
- [ ] 캐싱 구현
- [ ] 하이브리드 검색 (내부 DB 우선)
- [ ] 비용 모니터링 대시보드
- [ ] 사용량 알림

---

## 상태

**현재**: Google Places API 연동 완료, 기본 검색 동작
**다음**: 필터 기능 확장, 캐싱 구현, UI 개선
