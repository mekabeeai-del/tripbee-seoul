"""
Landmark Service 테스트 스크립트
"""

import requests
import json

API_URL = "http://localhost:8005"

def test_landmark():
    """랜드마크 조회 테스트"""
    print("="*60)
    print("Landmark Service 테스트")
    print("="*60)
    print()

    # 서울 랜드마크 조회
    print("[Test 1] 서울 랜드마크 10개 조회")
    response = requests.post(
        f"{API_URL}/api/landmark",
        json={
            "location_keyword": "서울",
            "limit": 10
        }
    )

    if response.status_code == 200:
        data = response.json()
        print(f"✅ 성공: {data['count']}개 랜드마크")
        print()
        for landmark in data["landmarks"][:5]:  # 처음 5개만 출력
            print(f"  {landmark['rank']}. {landmark['title']}")
            print(f"     {landmark['addr1']}")
            if landmark['description']:
                print(f"     💬 {landmark['description']}")
            print()
    else:
        print(f"❌ 실패: {response.status_code}")
        print(response.text)

    print()

    # 서울 랜드마크 3개만
    print("[Test 2] 서울 랜드마크 3개만 조회")
    response = requests.post(
        f"{API_URL}/api/landmark",
        json={
            "location_keyword": "서울",
            "limit": 3
        }
    )

    if response.status_code == 200:
        data = response.json()
        print(f"✅ 성공: {data['count']}개 랜드마크")
        for landmark in data["landmarks"]:
            print(f"  {landmark['rank']}. {landmark['title']}")
    else:
        print(f"❌ 실패: {response.status_code}")

    print()

    # 없는 지역 조회
    print("[Test 3] 부산 랜드마크 조회 (데이터 없음)")
    response = requests.post(
        f"{API_URL}/api/landmark",
        json={
            "location_keyword": "부산",
            "limit": 10
        }
    )

    if response.status_code == 200:
        data = response.json()
        print(f"✅ 요청 성공: {data['count']}개 랜드마크")
        if data['count'] == 0:
            print("  (등록된 랜드마크가 없습니다)")
    else:
        print(f"❌ 실패: {response.status_code}")

    print()
    print("="*60)

if __name__ == "__main__":
    try:
        test_landmark()
    except requests.exceptions.ConnectionError:
        print("❌ 서버에 연결할 수 없습니다.")
        print("landmark-service가 실행 중인지 확인하세요. (Port 8005)")
