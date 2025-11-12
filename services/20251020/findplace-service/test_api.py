"""FindPlace Service API 테스트"""
import requests
import json

BASE_URL = "http://localhost:8003"

def test_find_place(keyword: str):
    """장소 검색 테스트"""
    url = f"{BASE_URL}/api/find-place"
    payload = {
        "keyword": keyword,
        "user_lat": 37.5665,
        "user_lng": 126.9780,
        "limit": 5
    }

    print(f"\n{'='*60}")
    print(f"검색: '{keyword}'")
    print(f"{'='*60}")

    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        data = response.json()

        print(f"[SUCCESS] {data['count']}개 장소 발견\n")

        for idx, place in enumerate(data['results'], 1):
            print(f"{idx}. {place['name']}")
            print(f"   주소: {place['address']}")
            print(f"   좌표: ({place['lat']:.6f}, {place['lng']:.6f})")
            if place.get('category'):
                print(f"   카테고리: {place['category']}")
            if place.get('place_type'):
                print(f"   타입: {place['place_type']}")
            print()

    except requests.exceptions.RequestException as e:
        print(f"[ERROR] 오류: {e}")
        if hasattr(e, 'response') and e.response:
            print(f"Response: {e.response.text}")


if __name__ == "__main__":
    # 테스트 케이스
    test_keywords = [
        "경복궁",
        "스타벅스 홍대점",
        "서울시청",
        "명동교자",
        "홍대입구역"
    ]

    for keyword in test_keywords:
        test_find_place(keyword)
