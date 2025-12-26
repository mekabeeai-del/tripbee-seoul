"""
Position Resolver - 거점 위치 키워드 해결
MasterPosition 로직을 Beaty 서비스 내부로 통합
"""

import asyncpg
from typing import Dict, List, Optional
from openai import OpenAI


class PositionResolver:
    """위치 키워드를 실제 거점 정보로 해결"""

    def __init__(self, openai_api_key: str, db_config: Dict):
        self.openai_api_key = openai_api_key
        self.db_config = db_config
        self.client = OpenAI(api_key=openai_api_key)

    async def get_db_connection(self):
        """데이터베이스 연결"""
        try:
            import ssl
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

            conn = await asyncpg.connect(
                host=self.db_config["host"],
                port=self.db_config["port"],
                database=self.db_config["database"],
                user=self.db_config["user"],
                password=self.db_config["password"],
                ssl=ssl_context,
                command_timeout=60
            )
            return conn
        except Exception as e:
            print(f"[POSITION_RESOLVER] DB connection error: {e}")
            return None

    async def resolve(self, location_keyword: str) -> Optional[Dict]:
        """위치 키워드를 실제 거점 정보로 해결"""
        if not location_keyword:
            return None

        try:
            conn = await self.get_db_connection()
            if not conn:
                return None

            # 벡터 임베딩 생성
            response = self.client.embeddings.create(
                model="text-embedding-ada-002",
                input=location_keyword
            )
            query_embedding = response.data[0].embedding
            embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'

            # LIKE 매칭 + 벡터 유사도 검색
            query = """
                SELECT
                    i.info_id,
                    i.name,
                    i.alias,
                    i.lang_code,
                    i.geometry_id,
                    g.geom_type,
                    ST_AsGeoJSON(g.geom) as geojson,
                    CASE
                        WHEN i.embedding IS NOT NULL THEN 1 - (i.embedding <=> $2::vector)
                        WHEN LOWER(i.name) = LOWER($1) THEN 1.0
                        WHEN LOWER(i.name) LIKE LOWER($1 || '%') THEN 0.9
                        WHEN LOWER(i.name) LIKE LOWER('%' || $1 || '%') THEN 0.8
                        WHEN LOWER(i.alias) = LOWER($1) THEN 0.95
                        WHEN LOWER(i.alias) LIKE LOWER($1 || '%') THEN 0.85
                        WHEN LOWER(i.alias) LIKE LOWER('%' || $1 || '%') THEN 0.75
                        ELSE 0.7
                    END AS similarity,
                    'location_resolved' as match_type
                FROM mkb_master_position_info i
                LEFT JOIN mkb_master_position_geometry g ON i.geometry_id = g.geometry_id
                WHERE i.lang_code = $3
                    AND (
                        LOWER(i.name) LIKE LOWER('%' || $1 || '%')
                        OR LOWER(i.alias) LIKE LOWER('%' || $1 || '%')
                        OR (i.embedding IS NOT NULL AND i.embedding <=> $2::vector < 0.4)
                    )
                ORDER BY
                    CASE
                        WHEN i.embedding IS NOT NULL THEN i.embedding <=> $2::vector
                        WHEN LOWER(i.name) = LOWER($1) THEN 0
                        WHEN LOWER(i.alias) = LOWER($1) THEN 0.05
                        WHEN LOWER(i.name) LIKE LOWER($1 || '%') THEN 0.1
                        WHEN LOWER(i.alias) LIKE LOWER($1 || '%') THEN 0.15
                        ELSE 0.2
                    END
                LIMIT 1
            """

            rows = await conn.fetch(query, location_keyword, embedding_str, 9159)
            await conn.close()

            if rows:
                row = rows[0]
                # POLYGON 가산점 적용
                similarity_value = float(row['similarity'])
                has_polygon_bonus = False
                if row['geom_type'] and row['geom_type'].upper() in ['POLYGON', 'MULTIPOLYGON']:
                    similarity_value = min(similarity_value + 0.03, 1.0)
                    has_polygon_bonus = True

                result = {
                    "info_id": row['info_id'],
                    "name": row['name'],
                    "alias": row['alias'],
                    "geometry_id": row['geometry_id'],
                    "geom_type": row['geom_type'],
                    "geojson": row['geojson'],
                    "similarity": similarity_value,
                    "has_polygon_bonus": has_polygon_bonus,
                    "match_type": row['match_type']
                }

                print(f"[POSITION_RESOLVER] '{location_keyword}' -> {result['name']} (similarity: {similarity_value:.2f}, type: {result['geom_type']})")
                return result

            print(f"[POSITION_RESOLVER] '{location_keyword}' -> No match found")
            return None

        except Exception as e:
            print(f"[POSITION_RESOLVER] Error: {e}")
            return None


# 테스트 코드
if __name__ == "__main__":
    import asyncio
    import json
    from pathlib import Path
    from dotenv import load_dotenv

    load_dotenv()

    # Config 로드
    config_path = Path(__file__).parent.parent.parent / "CLAUDE.md"
    with open(config_path, "r", encoding="utf-8") as f:
        content = f.read()
        import re
        config_match = re.search(r'config:\s*{([^}]+)}', content, re.DOTALL)
        if config_match:
            config_str = '{' + config_match.group(1) + '}'
            config = json.loads(config_str.replace('\t', ''))
            openai_api_key = config["openai_api_key"]
            db_config = {
                "host": config["db_host"],
                "port": config["db_port"],
                "database": config["db_name"],
                "user": config["db_user"],
                "password": config["db_password"]
            }

    async def test():
        resolver = PositionResolver(openai_api_key, db_config)

        test_locations = ["홍대", "명동", "경복궁", "강남"]

        for loc in test_locations:
            print(f"\n{'='*60}")
            result = await resolver.resolve(loc)
            if result:
                # geojson은 너무 길어서 제외
                result_copy = result.copy()
                result_copy['geojson'] = '...(생략)...'
                print(f"Result: {json.dumps(result_copy, ensure_ascii=False, indent=2)}")

    asyncio.run(test())
