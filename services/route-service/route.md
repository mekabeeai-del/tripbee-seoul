# Route Service

**포트**: 8002
**역할**: ODSay 공공 대중교통 API를 활용한 경로 검색 서비스

---

## 개요

서울 대중교통(지하철, 버스) 경로 검색 및 최적 경로 제공
**사용처**: ROUTE 의도 ("명동에서 경복궁 가는 길")

---

## 외부 API 의존성

### ODSay 대중교통 API
- **제공**: ODSay (오디세이)
- **URL**: https://api.odsay.com/v1/api/searchPubTransPathT
- **기능**: 출발지/도착지 좌표 기반 대중교통 경로 검색
- **비용**: **무료** (공공데이터, API 키 필요)

**API 파라미터**:
```
SX: 출발지 경도
SY: 출발지 위도
EX: 도착지 경도
EY: 도착지 위도
SearchType: 0 (전체), 1 (지하철), 2 (버스)
SearchPathType: 0 (빠른경로), 1 (최소환승), 2 (최소도보)
```

**응답 구조**:
```json
{
  "result": {
    "path": [
      {
        "info": {
          "totalTime": 27,          // 총 소요시간 (분)
          "payment": 1400,          // 요금
          "busTransitCount": 0,     // 버스 환승 횟수
          "subwayTransitCount": 1,  // 지하철 환승 횟수
          "totalDistance": 5800     // 총 거리 (m)
        },
        "subPath": [
          {
            "trafficType": 1,       // 1=지하철, 2=버스, 3=도보
            "sectionTime": 5,       // 구간 소요시간 (분)
            "distance": 380,        // 거리 (m)
            "startName": "홍대입구역",
            "endName": "경복궁역",
            "stationCount": 7,      // 정거장 수
            "lane": [{
              "name": "2호선",
              "subwayCode": "2"     // 호선 코드
            }],
            "passStopList": {
              "stations": [
                {"x": 126.923, "y": 37.557},  // 좌표 배열
                ...
              ]
            }
          }
        ]
      }
    ]
  }
}
```

---

## API 엔드포인트

### POST /api/route
**대중교통 경로 검색**

**Request**:
```json
{
  "origin": {
    "lat": 37.5563,
    "lng": 126.9233
  },
  "destination": {
    "lat": 37.5796,
    "lng": 126.9770
  },
  "transportation_mode": "subway",  // optional: "subway", "bus", null (전체)
  "route_preference": "fastest"     // optional: "fastest", "min_transfer", "min_walk"
}
```

**Response**:
```json
{
  "success": true,
  "origin": {"lat": 37.5563, "lng": 126.9233},
  "destination": {"lat": 37.5796, "lng": 126.9770},
  "paths": [
    {
      "info": {
        "totalTime": 27,
        "payment": 1400,
        "busTransitCount": 0,
        "subwayTransitCount": 1,
        "totalDistance": 5800
      },
      "subPath": [...]
    }
  ],
  "summary": {
    "total_time": 27,
    "payment": 1400,
    "subway_transit_count": 1,
    "bus_transit_count": 0
  },
  "geojson": {
    "type": "FeatureCollection",
    "features": [
      // 출발지 마커
      // 도착지 마커
      // 경로별 LineString
    ]
  }
}
```

### GET /health
**헬스체크**

---

## 데이터 구조

### trafficType
- `1`: 지하철
- `2`: 버스
- `3`: 도보

### 호선 코드 (subwayCode)
- `1`: 1호선 (진남색 #0052A4)
- `2`: 2호선 (초록 #00A84D)
- `3`: 3호선 (주황 #EF7C1C)
- `4`: 4호선 (하늘 #00A5DE)
- `5`: 5호선 (보라 #996CAC)
- `6`: 6호선 (갈색 #CD7C2F)
- `7`: 7호선 (올리브 #747F00)
- `8`: 8호선 (분홍 #E6186C)
- `9`: 9호선 (금색 #BDB092)
- `101`: 공항철도
- `102`: 신분당선

### 좌표 데이터
- `passStopList.stations`: 경로 상의 모든 정거장 좌표
- 각 station: `{x: 경도, y: 위도}`
- 지도 시각화용 LineString 생성에 사용

---

## GeoJSON 생성

**route-service에서 생성하는 GeoJSON 구조**:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [126.9233, 37.5563]
      },
      "properties": {
        "type": "origin",
        "name": "출발지"
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [126.9770, 37.5796]
      },
      "properties": {
        "type": "destination",
        "name": "도착지"
      }
    },
    {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [
          [126.923, 37.557],
          [126.930, 37.565],
          ...
        ]
      },
      "properties": {
        "type": "route",
        "routeIndex": 0,
        "totalTime": 27,
        "payment": 1400,
        "totalDistance": 5800
      }
    }
  ]
}
```

---

## Beaty Service 통합

**호출 위치**: `pipelines/route/pipeline.py`

**플로우**:
```
Step 1: 의도분류 (main.py)
  → intent: "ROUTE"
  → origin_keyword: "명동"
  → destination_keyword: "경복궁"

Step 2: 출발지/도착지 추출 (pipeline.py)
  → origin: "명동", destination: "경복궁"

Step 3: 좌표 변환 (Google Geocoding API)
  → origin: (37.563, 126.982)
  → destination: (37.580, 126.977)
  → Geocoding 실패 시 → FIND_PLACE로 전환

Step 4: 경로 검색 (route-service 호출)
  → 3개 경로 반환

Step 5: 최종 응답 생성 (GPT-4o-mini)
  → "경복궁까지 가는 경로를 찾았어요! 약 15분..."
```

**호출 예시**:
```python
async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8002/api/route",
        json={
            "origin": {"lat": 37.5563, "lng": 126.9233},
            "destination": {"lat": 37.5796, "lng": 126.9770},
            "transportation_mode": "subway",
            "route_preference": "fastest"
        },
        timeout=30.0
    )
```

---

## UI 시각화 (test_ui.html)

**왼쪽 패널**: 경로 선택 리스트
- 경로별 카드 (시간, 요금, 환승 정보)
- 클릭 시 상세 단계 펼침
- 상세: 도보 → 지하철 승차 → N개 정거장 이동 → 하차 → 도착

**오른쪽 패널**: 지도 (Mapbox GL JS)
- 출발지 마커 (초록)
- 도착지 마커 (빨강)
- 경로 LineString (호선별 색상)
- 선택한 경로만 표시

---

## 실행 방법

```bash
cd services/route-service
python main.py
# 또는
quick_start.bat
```

**접속**: http://localhost:8002

---

## 비용

**ODSay API**: **무료** (공공데이터)
- 월 호출 제한: 없음
- 필요: API 키만 발급

---

## 제약사항

### 현재 미지원
- **도보 경로 상세 좌표**: ODSay API가 제공하지 않음
  - 도보 구간은 시간과 거리만 표시
  - 실제 걷는 경로 라인은 그려지지 않음

### 향후 개선 가능
1. 도보 경로: Mapbox Directions API로 보완
2. 실시간 지연 정보: 서울 열린데이터광장 API 연동
3. 경로 저장/공유 기능
4. 즐겨찾기 경로 관리
5. 택시/자가용 경로 옵션 추가

---

## 설정

**환경 변수** (.env):
```
ODSAY_API_KEY=umaW9m8h85uVnERxSo9qFA
```

**CLAUDE.md 설정**:
```json
{
  "odsay_api_key": "umaW9m8h85uVnERxSo9qFA"
}
```

---

## 테스트

```bash
curl -X POST http://localhost:8002/api/route \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat": 37.5563, "lng": 126.9233},
    "destination": {"lat": 37.5796, "lng": 126.9770},
    "transportation_mode": "subway"
  }'
```

---

## 에러 핸들링

### Geocoding 실패 시
- route/pipeline.py에서 FIND_PLACE로 자동 전환
- 예: "홍대 스타벅스 가는 길" → 스타벅스 위치 찾기 실패 → FIND_PLACE로 전환

```python
# route/pipeline.py:94
if not dest_result:
    # Geocoding 실패 → FIND_PLACE로 전환
    from ..findplace.pipeline import execute as execute_findplace
    return await execute_findplace(service, query, classification, user_location, steps)
```

---

## 향후 개선 사항

### 기능 추가
1. 출발 시간 지정 ("내일 오전 9시 출발")
2. 막차 시간 알림
3. 교통 혼잡도 반영
4. 배리어프리 경로 (엘리베이터 있는 역)

### 성능 최적화
1. 자주 검색되는 경로 캐싱
2. 응답 시간 개선 (현재 ~2초)

### UI 개선
1. 도보 경로 시각화
2. 실시간 위치 추적
3. AR 네비게이션 (모바일)
