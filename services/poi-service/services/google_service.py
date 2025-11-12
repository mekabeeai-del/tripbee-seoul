"""
Google Service - Google Places API를 사용한 장소 검색
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
from config import CONFIG
import psycopg2
from psycopg2.extras import RealDictCursor


# =====================================================================================
# REQUEST/RESPONSE MODELS
# =====================================================================================

class PlaceFilters(BaseModel):
    """장소 검색 필터"""
    parking: Optional[bool] = None  # 주차 가능
    good_for_children: Optional[bool] = None  # 아이 동반 가능
    open_now: Optional[bool] = None  # 현재 영업 중
    min_rating: Optional[float] = None  # 최소 평점 (0.0 ~ 5.0)
    max_price_level: Optional[int] = None  # 최대 가격대 (0~4)
    wheelchair_accessible: Optional[bool] = None  # 휠체어 접근 가능
    vegetarian_food: Optional[bool] = None  # 채식 메뉴
    takeout: Optional[bool] = None  # 포장 가능
    delivery: Optional[bool] = None  # 배달 가능
    allows_dogs: Optional[bool] = None  # 반려견 동반 가능
    reservable: Optional[bool] = None  # 예약 가능


class GoogleRequest(BaseModel):
    """Google Places 검색 요청"""
    keyword: str
    user_lat: Optional[float] = 37.5665  # 기본: 서울시청
    user_lng: Optional[float] = 126.9780
    limit: Optional[int] = 5
    language: Optional[str] = "ko"  # 언어 코드 (ko, en, ja, zh 등)
    filters: Optional[PlaceFilters] = None  # 필터 조건


class PlaceInfo(BaseModel):
    """장소 정보"""
    name: str
    address: str
    lat: float
    lng: float
    category: Optional[str] = None
    place_type: Optional[str] = None
    place_id: Optional[str] = None

    # 추가 정보
    rating: Optional[float] = None
    user_rating_count: Optional[int] = None
    price_level: Optional[str] = None
    open_now: Optional[bool] = None
    phone_number: Optional[str] = None
    website: Optional[str] = None

    # 편의시설
    parking_available: Optional[bool] = None
    good_for_children: Optional[bool] = None
    wheelchair_accessible: Optional[bool] = None
    vegetarian_food: Optional[bool] = None
    takeout: Optional[bool] = None
    delivery: Optional[bool] = None
    allows_dogs: Optional[bool] = None
    reservable: Optional[bool] = None

    # 감정 태깅용
    editorial_summary: Optional[str] = None

    # 이미지
    image: Optional[str] = None

    # 리뷰
    reviews: Optional[List[Dict[str, Any]]] = None

    # 사진 갤러리 (여러 장)
    photos: Optional[List[str]] = None

    # 메뉴 (Google Places menu 정보가 있다면)
    menu_url: Optional[str] = None


# =====================================================================================
# GOOGLE SERVICE
# =====================================================================================

class GoogleService:
    """Google Places API 장소 검색 서비스"""

    def __init__(self):
        self.google_api_key = CONFIG["google_api_key"]
        self.google_places_url = "https://places.googleapis.com/v1/places:searchText"

    def _get_db_connection(self):
        """데이터베이스 연결"""
        return psycopg2.connect(
            host=CONFIG["db_host"],
            port=CONFIG["db_port"],
            database=CONFIG["db_name"],
            user=CONFIG["db_user"],
            password=CONFIG["db_password"],
            cursor_factory=RealDictCursor
        )

    def _save_emotion_origin(
        self,
        place_id: str,
        source: str,
        language: str,
        emotion_origin: str
    ):
        """감정 원본 텍스트 저장 (emotion, emotion_vector는 NULL)"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()

            # place_id + source + language 조합이 이미 있는지 확인
            cursor.execute("""
                SELECT COUNT(*) FROM place_emotion_tags
                WHERE place_id = %s AND source = %s AND language = %s
            """, (place_id, source, language))

            count = cursor.fetchone()[0]
            if count > 0:
                print(f"[EMOTION] 이미 존재함 (스킵): {place_id} (source: {source}, language: {language})")
                cursor.close()
                conn.close()
                return

            # 존재하지 않으면 INSERT
            cursor.execute("""
                INSERT INTO place_emotion_tags
                    (place_id, source, language, emotion_origin, emotion, emotion_vector)
                VALUES (%s, %s, %s, %s, NULL, NULL)
            """, (place_id, source, language, emotion_origin))

            conn.commit()
            cursor.close()
            conn.close()

            print(f"[EMOTION] 원본 저장 완료: {place_id} ({language})")

        except Exception as e:
            print(f"[EMOTION] 저장 실패 ({place_id}): {e}")

    def _build_field_mask(self, filters: Optional[PlaceFilters]) -> str:
        """필터에 따라 동적으로 FieldMask 생성"""
        # 기본 필드 (항상 요청)
        base_fields = [
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.types",
            "places.id",
            "places.rating",
            "places.userRatingCount",
            "places.priceLevel",
            "places.currentOpeningHours",
            "places.nationalPhoneNumber",
            "places.websiteUri",
            "places.parkingOptions",
            "places.goodForChildren",
            "places.accessibilityOptions",
            "places.servesVegetarianFood",
            "places.takeout",
            "places.delivery",
            "places.allowsDogs",
            "places.reservable",
            "places.editorialSummary",  # 감정 태깅용
            "places.photos",  # 사진 정보
            "places.reviews"  # ← 리뷰 정보 추가
        ]

        return ",".join(list(set(base_fields)))  # 중복 제거

    def _matches_filters(self, place_data: Dict[str, Any], filters: Optional[PlaceFilters]) -> bool:
        """장소가 필터 조건을 만족하는지 확인"""
        if not filters:
            return True

        # 주차 필터
        if filters.parking:
            parking_opts = place_data.get("parkingOptions", {})
            has_parking = any([
                parking_opts.get("freeParkingLot"),
                parking_opts.get("paidParkingLot"),
                parking_opts.get("freeStreetParking"),
                parking_opts.get("paidStreetParking"),
                parking_opts.get("freeGarageParking"),
                parking_opts.get("paidGarageParking")
            ])
            if not has_parking:
                return False

        # 아이 동반 필터
        if filters.good_for_children:
            if not place_data.get("goodForChildren"):
                return False

        # 현재 영업 중 필터
        if filters.open_now:
            opening_hours = place_data.get("currentOpeningHours", {})
            if not opening_hours.get("openNow"):
                return False

        # 최소 평점 필터
        if filters.min_rating is not None:
            rating = place_data.get("rating")
            if rating is None or rating < filters.min_rating:
                return False

        # 최대 가격대 필터
        if filters.max_price_level is not None:
            price_level_str = place_data.get("priceLevel", "")
            # PRICE_LEVEL_FREE=0, INEXPENSIVE=1, MODERATE=2, EXPENSIVE=3, VERY_EXPENSIVE=4
            price_map = {
                "PRICE_LEVEL_FREE": 0,
                "PRICE_LEVEL_INEXPENSIVE": 1,
                "PRICE_LEVEL_MODERATE": 2,
                "PRICE_LEVEL_EXPENSIVE": 3,
                "PRICE_LEVEL_VERY_EXPENSIVE": 4
            }
            price_level = price_map.get(price_level_str, 999)
            if price_level > filters.max_price_level:
                return False

        # 휠체어 접근성 필터
        if filters.wheelchair_accessible:
            accessibility = place_data.get("accessibilityOptions", {})
            has_accessibility = any([
                accessibility.get("wheelchairAccessibleParking"),
                accessibility.get("wheelchairAccessibleEntrance"),
                accessibility.get("wheelchairAccessibleRestroom"),
                accessibility.get("wheelchairAccessibleSeating")
            ])
            if not has_accessibility:
                return False

        # 채식 메뉴 필터
        if filters.vegetarian_food:
            if not place_data.get("servesVegetarianFood"):
                return False

        # 포장 필터
        if filters.takeout:
            if not place_data.get("takeout"):
                return False

        # 배달 필터
        if filters.delivery:
            if not place_data.get("delivery"):
                return False

        # 반려견 필터
        if filters.allows_dogs:
            if not place_data.get("allowsDogs"):
                return False

        # 예약 가능 필터
        if filters.reservable:
            if not place_data.get("reservable"):
                return False

        return True

    async def search(self, request: GoogleRequest) -> Dict[str, Any]:
        """
        Google Places API로 장소 검색

        Args:
            request: 검색 요청 (keyword, user_lat, user_lng, limit, language, filters)

        Returns:
            검색 결과
        """
        try:
            filters_str = f" (필터: {request.filters.dict() if request.filters else 'None'})"
            print(f"[GOOGLE] 검색: '{request.keyword}' (언어: {request.language}){filters_str}")

            # 동적 FieldMask 생성
            field_mask = self._build_field_mask(request.filters)

            # Google Places API (New) - Text Search
            headers = {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self.google_api_key,
                "X-Goog-FieldMask": field_mask
            }

            # 필터에 open_now가 있으면 더 많은 결과 요청 (필터링 후 limit 맞추기 위해)
            max_results = request.limit * 3 if request.filters else request.limit

            payload = {
                "textQuery": request.keyword,
                "languageCode": request.language,
                "maxResultCount": min(max_results, 20),  # Google API 최대 20
                "locationBias": {
                    "circle": {
                        "center": {
                            "latitude": request.user_lat,
                            "longitude": request.user_lng
                        },
                        "radius": 500.0  # 500m 반경
                    }
                }
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.google_places_url,
                    headers=headers,
                    json=payload,
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()

            # 디버깅: API 응답 로깅
            places_count = len(data.get('places', []))
            print(f"[GOOGLE] Google Places API 응답: {places_count}개 장소")
            if data.get('places'):
                first_place = data['places'][0]
                print(f"[GOOGLE] 첫 번째 결과: {first_place.get('displayName', {}).get('text', 'N/A')}")
                # 전체 응답 디버깅
                import json
                print(f"[FINDPLACE DEBUG] 첫 번째 장소 전체 데이터:")
                print(json.dumps(first_place, indent=2, ensure_ascii=False))

            # 결과 파싱 및 필터링
            places = []
            filtered_count = 0

            for place in data.get("places", []):
                try:
                    # 필터 조건 확인
                    if not self._matches_filters(place, request.filters):
                        filtered_count += 1
                        continue

                    # 이름
                    display_name = place.get("displayName", {})
                    name = display_name.get("text", "")

                    # 주소
                    address = place.get("formattedAddress", "")

                    # 좌표
                    location = place.get("location", {})
                    lat = location.get("latitude")
                    lng = location.get("longitude")

                    if not lat or not lng:
                        continue

                    # 타입 (카테고리)
                    types = place.get("types", [])
                    category = types[0] if types else None
                    place_type = types[0] if types else None

                    # Google Place ID
                    google_id = place.get("id", "")

                    # editorialSummary 추출 및 저장
                    editorial_summary = place.get("editorialSummary", {})
                    emotion_origin = editorial_summary.get("text") if editorial_summary else None

                    if emotion_origin and google_id:
                        # 비동기로 DB 저장 (사용자 응답 지연 방지)
                        try:
                            self._save_emotion_origin(
                                place_id=google_id,
                                source="google",
                                language=request.language,
                                emotion_origin=emotion_origin
                            )
                        except Exception as e:
                            print(f"[GOOGLE] 감정 원본 저장 실패: {e}")
                            # 저장 실패해도 검색 결과는 반환

                    # 추가 정보 파싱
                    rating = place.get("rating")
                    user_rating_count = place.get("userRatingCount")
                    price_level = place.get("priceLevel")

                    opening_hours = place.get("currentOpeningHours", {})
                    open_now = opening_hours.get("openNow")

                    phone_number = place.get("nationalPhoneNumber")
                    website = place.get("websiteUri")

                    # 편의시설 파싱
                    parking_opts = place.get("parkingOptions", {})
                    parking_available = any([
                        parking_opts.get("freeParkingLot"),
                        parking_opts.get("paidParkingLot"),
                        parking_opts.get("freeStreetParking"),
                        parking_opts.get("paidStreetParking"),
                        parking_opts.get("freeGarageParking"),
                        parking_opts.get("paidGarageParking")
                    ]) if parking_opts else None

                    good_for_children = place.get("goodForChildren")

                    accessibility = place.get("accessibilityOptions", {})
                    wheelchair_accessible = any([
                        accessibility.get("wheelchairAccessibleParking"),
                        accessibility.get("wheelchairAccessibleEntrance"),
                        accessibility.get("wheelchairAccessibleRestroom"),
                        accessibility.get("wheelchairAccessibleSeating")
                    ]) if accessibility else None

                    vegetarian_food = place.get("servesVegetarianFood")
                    takeout = place.get("takeout")
                    delivery = place.get("delivery")
                    allows_dogs = place.get("allowsDogs")
                    reservable = place.get("reservable")

                    # Photos 파싱
                    photos_data = place.get("photos", [])
                    image_url = None  # 대표 이미지
                    photo_urls = []  # 전체 사진 배열

                    if photos_data and len(photos_data) > 0:
                        # 대표 이미지 (첫 번째)
                        photo = photos_data[0]
                        photo_name = photo.get("name")
                        if photo_name:
                            image_url = f"https://places.googleapis.com/v1/{photo_name}/media?key={self.google_api_key}&maxHeightPx=400&maxWidthPx=400"

                        # 전체 사진 배열 (제한 없음)
                        for photo in photos_data:
                            photo_name = photo.get("name")
                            if photo_name:
                                photo_url = f"https://places.googleapis.com/v1/{photo_name}/media?key={self.google_api_key}&maxHeightPx=400&maxWidthPx=400"
                                photo_urls.append(photo_url)

                    # Menu URL (Google Places에서 제공하는 메뉴 링크)
                    menu_url = place.get("menuForBusinessUrl")  # 또는 websiteUri에서 메뉴 찾기

                    # Reviews 파싱 (최대 5개)
                    reviews_data = place.get("reviews", [])
                    print(f"[GOOGLE_REVIEWS] place: {name}, reviews count: {len(reviews_data)}")
                    reviews = []
                    for review in reviews_data[:5]:  # 최대 5개만
                        author = review.get("authorAttribution", {})
                        reviews.append({
                            "author_name": author.get("displayName", "익명"),
                            "author_photo": author.get("photoUri"),
                            "rating": review.get("rating"),
                            "text": review.get("text", {}).get("text", ""),
                            "time": review.get("relativePublishTimeDescription", ""),
                            "language": review.get("originalText", {}).get("languageCode", "")
                        })

                    place_info = PlaceInfo(
                        name=name,
                        address=address,
                        lat=lat,
                        lng=lng,
                        category=category,
                        place_type=place_type,
                        place_id=google_id,
                        # 추가 정보
                        rating=rating,
                        user_rating_count=user_rating_count,
                        price_level=price_level,
                        open_now=open_now,
                        phone_number=phone_number,
                        website=website,
                        # 편의시설
                        parking_available=parking_available,
                        good_for_children=good_for_children,
                        wheelchair_accessible=wheelchair_accessible,
                        vegetarian_food=vegetarian_food,
                        takeout=takeout,
                        delivery=delivery,
                        allows_dogs=allows_dogs,
                        reservable=reservable,
                        # 감정 태깅용
                        editorial_summary=emotion_origin,
                        # 이미지
                        image=image_url,
                        # 리뷰
                        reviews=reviews if reviews else None,
                        # 사진 갤러리
                        photos=photo_urls if photo_urls else None,
                        # 메뉴
                        menu_url=menu_url
                    )
                    places.append(place_info)

                    rating_str = f" (⭐{rating:.1f})" if rating else ""
                    print(f"[GOOGLE] 발견: {name}{rating_str} ({lat:.4f}, {lng:.4f})")

                    # limit에 도달하면 중단
                    if len(places) >= request.limit:
                        break

                except Exception as e:
                    print(f"[GOOGLE] 파싱 오류: {e}")
                    import traceback
                    traceback.print_exc()
                    continue

            print(f"[GOOGLE] 총 {len(places)}개 장소 발견 (필터링: {filtered_count}개)")

            return {
                "success": True,
                "query": request.keyword,
                "results": places,
                "count": len(places)
            }

        except httpx.HTTPStatusError as e:
            print(f"[GOOGLE] Google Places API 오류: {e}")
            print(f"[GOOGLE] 응답: {e.response.text if hasattr(e, 'response') else 'N/A'}")
            raise Exception(f"Google Places API error: {str(e)}")
        except Exception as e:
            print(f"[GOOGLE] 오류: {e}")
            import traceback
            traceback.print_exc()
            raise
