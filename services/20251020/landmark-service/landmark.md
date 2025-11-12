# Landmark Service

**포트**: 8005
**역할**: 지역별 필수 명소 제공 서비스

---

## 개요

지역별로 큐레이션된 "꼭 가봐야 할 곳" 필수 명소 정보를 제공합니다.

**사용처**: LANDMARK 의도 ("서울에서 꼭 가봐야 할 곳")

---

## 데이터 소스

### LANDMARK_MAPPING 테이블
- 지역별 필수 명소 큐레이션
- 수동 관리 (LandmarkManager 10003)
- location_keyword + content_id + rank

### KTO_TOUR_BASE_LIST 테이블
- POI 상세 정보
- 제목, 주소, 좌표, 이미지 등

---

## API 엔드포인트

### POST /api/landmark
**필수 명소 조회**

**Request:**
```json
{
  "location_keyword": "서울",
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "location": "서울",
  "count": 10,
  "landmarks": [
    {
      "rank": 1,
      "content_id": 126508,
      "title": "경복궁",
      "description": "조선시대 대표 궁궐",
      "addr1": "서울특별시 종로구 사직로 161",
      "mapx": 126.9770,
      "mapy": 37.5796,
      "first_image": "http://...",
      "overview": "...",
      "content_type_id": "12",
      "cat3": "A02030100"
    }
  ]
}
```

### GET /health
**헬스체크**

---

## 검색 로직

```sql
SELECT
    lm.rank,
    lm.content_id,
    lm.description,
    poi.*
FROM LANDMARK_MAPPING lm
LEFT JOIN KTO_TOUR_BASE_LIST poi
    ON lm.content_id::VARCHAR = poi.content_id
WHERE lm.location_keyword = '서울'
ORDER BY lm.rank ASC
LIMIT 10
```

**특징:**
- location_keyword로 필터링
- rank 순으로 정렬 (1위부터)
- limit으로 개수 제한

---

## Beaty Service 통합 (예정)

**호출 위치**: `pipelines/landmark/pipeline.py`

**플로우:**
```
Step 1: 의도분류 (main.py)
  → intent: "LANDMARK"
  → location_keyword: "서울"

Step 2: 랜드마크 조회 (landmark-service 호출)
  → 10개 명소 반환

Step 3: 최종 응답 생성 (GPT-4o-mini)
  → "서울에서 꼭 가봐야 할 곳 10곳을 알려드릴게요..."
```

**호출 예시:**
```python
async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8005/api/landmark",
        json={
            "location_keyword": "서울",
            "limit": 10
        },
        timeout=30.0
    )
```

---

## 실행 방법

```bash
cd services\landmark-service
quick_start.bat
```

**접속**: http://localhost:8005

---

## 테스트

### Python 테스트
```python
import requests

response = requests.post(
    "http://localhost:8005/api/landmark",
    json={"location_keyword": "서울", "limit": 10}
)

print(response.json())
```

### cURL 테스트
```bash
curl -X POST http://localhost:8005/api/landmark \
  -H "Content-Type: application/json" \
  -d '{"location_keyword": "서울", "limit": 10}'
```

---

## 현재 등록된 지역

**서울**: 10개
1. 경복궁
2. 광화문
3. 남산서울타워
4. 청계천
5. 북촌한옥마을
6. 익선동 한옥거리
7. 광장시장
8. 여의도한강공원
9. 국립중앙박물관
10. 석촌호수

**향후 추가 예정:**
- 명동, 홍대, 강남 (서울 내 세부 지역)
- 부산, 제주 (전국 확장)

---

## LANDMARK vs FIND_PLACE vs RECOMMEND

| 의도 | 데이터 소스 | 특징 | 용도 |
|------|------------|------|------|
| **LANDMARK** | LANDMARK_MAPPING (큐레이션) | 필수 명소만, 고정 랭킹 | "꼭 가봐야 할 곳" |
| **FIND_PLACE** | Google Places API | 실시간, 모든 장소 | "일식집 알려줘" |
| **RECOMMEND** | KTO DB (감정 벡터) | 감정 기반, 취향 맞춤 | "비티가 추천해줘" |

---

## 비용

**무료**: 내부 DB만 사용

---

## 데이터 관리

**LandmarkManager (10003)**에서 관리:
- 지역별 랜드마크 추가/수정/삭제
- POI 검색
- 랭킹 조정

**접속**: http://localhost:10003

---

## 향후 개선 사항

### Phase 1: 기본 완성 ✅
- [x] landmark-service 구현
- [x] 서울 10개 등록

### Phase 2: 지역 확장
- [ ] 명동, 홍대, 강남 등 서울 세부 지역
- [ ] 부산, 제주 주요 도시
- [ ] 전국 확장

### Phase 3: Beaty 통합
- [ ] LANDMARK 의도 추가
- [ ] 파이프라인 구현
- [ ] 자연어 응답 생성

### Phase 4: 고도화
- [ ] 사진 갤러리
- [ ] 방문 추천 시간
- [ ] 소요 시간 정보
- [ ] 주변 랜드마크 추천

---

## 상태

**현재**: 서비스 구현 완료, 서울 10개 등록
**다음**: Beaty 통합, 지역 확장
