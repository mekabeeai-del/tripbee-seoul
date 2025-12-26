"""
Category Resolver - 카테고리 키워드 해결
CategoryVector 로직을 Beaty 서비스 내부로 통합
"""

import asyncpg
from typing import Dict, List, Optional
from openai import OpenAI


class CategoryResolver:
    """카테고리 키워드를 실제 카테고리 코드/레벨로 해결"""

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
            print(f"[CATEGORY_RESOLVER] DB connection error: {e}")
            return None

    async def resolve(self, category_text: str) -> Optional[Dict]:
        """카테고리 키워드를 실제 카테고리 정보로 해결"""
        if not category_text:
            return None

        try:
            conn = await self.get_db_connection()
            if not conn:
                return None

            # 벡터 임베딩 생성
            response = self.client.embeddings.create(
                model="text-embedding-ada-002",
                input=category_text
            )
            query_embedding = response.data[0].embedding
            embedding_str = '[' + ','.join(map(str, query_embedding)) + ']'

            # 1단계: LIKE 검색 먼저 (name, keywords) + 벡터 유사도도 함께 계산
            like_query = """
                SELECT
                    c.category_id,
                    c.cat_code,
                    c.cat_level,
                    c.parent_code,
                    c.name,
                    c.keywords,
                    c.content_type_id,
                    c.content_type_name,
                    CASE
                        WHEN LOWER(c.name) = LOWER($1) THEN 1.0
                        WHEN LOWER(c.name) LIKE LOWER($1 || '%') THEN 0.9
                        WHEN LOWER(c.keywords) LIKE LOWER('%' || $1 || '%') THEN 0.85
                        WHEN LOWER(c.name) LIKE LOWER('%' || $1 || '%') THEN 0.8
                        ELSE 0.7
                    END AS like_score,
                    CASE
                        WHEN c.embedding IS NOT NULL THEN 1 - (c.embedding <=> $2::vector)
                        ELSE 0
                    END AS vector_score
                FROM kto_tour_category c
                WHERE c.lang = $3
                    AND (
                        LOWER(c.name) LIKE LOWER('%' || $1 || '%')
                        OR LOWER(c.keywords) LIKE LOWER('%' || $1 || '%')
                    )
                ORDER BY like_score DESC, c.cat_level ASC
            """

            like_rows = await conn.fetch(like_query, category_text, embedding_str, 'Kor')

            # 2단계: LIKE 결과가 있으면, LIKE 점수와 벡터 점수 결합
            if like_rows:
                print(f"[CATEGORY_RESOLVER] LIKE search found {len(like_rows)} candidates")

                best_result = None
                best_score = 0.0

                for row in like_rows:
                    # 0레벨은 너무 넓으니까 건너뛰기
                    if row['cat_level'] == 0:
                        continue

                    # LIKE 점수와 벡터 유사도 결합 (LIKE 점수 우선 60%, 벡터 40%)
                    like_score = float(row['like_score']) if row['like_score'] is not None else 0.0
                    vector_score = float(row['vector_score']) if row['vector_score'] is not None else 0.0
                    combined_score = float(like_score) * 0.6 + float(vector_score) * 0.4

                    # 레벨 가산점
                    level_bonus = float(0.02 * (4 - row['cat_level']))
                    final_score = min(float(combined_score) + level_bonus, 1.0)

                    if final_score > best_score:
                        best_score = final_score
                        best_result = {
                            "category_id": row['category_id'],
                            "cat_code": row['cat_code'],
                            "cat_level": row['cat_level'],
                            "parent_code": row['parent_code'],
                            "name": row['name'],
                            "keywords": row['keywords'],
                            "content_type_id": row['content_type_id'],
                            "content_type_name": row['content_type_name'],
                            "similarity": final_score,
                            "level_bonus": level_bonus,
                            "match_type": "like_with_vector"
                        }

                await conn.close()

                if best_result:
                    print(f"[CATEGORY_RESOLVER] '{category_text}' -> {best_result['name']} (score: {best_score:.2f}, type: LIKE+Vector)")
                    return best_result

            # 3단계: LIKE 결과가 없으면 전체 벡터 검색
            print(f"[CATEGORY_RESOLVER] No LIKE match, falling back to vector search")
            vector_query = """
                SELECT
                    c.category_id,
                    c.cat_code,
                    c.cat_level,
                    c.parent_code,
                    c.name,
                    c.keywords,
                    c.content_type_id,
                    c.content_type_name,
                    1 - (c.embedding <=> $1::vector) AS similarity,
                    'vector_only' as match_type
                FROM kto_tour_category c
                WHERE c.lang = $2
                    AND c.embedding IS NOT NULL
                    AND c.cat_level > 0
                    AND c.embedding <=> $1::vector < 0.4
                ORDER BY c.embedding <=> $1::vector ASC, c.cat_level ASC
                LIMIT 1
            """

            vector_rows = await conn.fetch(vector_query, embedding_str, 'Kor')
            await conn.close()

            if vector_rows:
                row = vector_rows[0]
                similarity_value = float(row['similarity'])
                level_bonus = 0.02 * (4 - row['cat_level'])
                similarity_value = min(similarity_value + level_bonus, 1.0)

                result = {
                    "category_id": row['category_id'],
                    "cat_code": row['cat_code'],
                    "cat_level": row['cat_level'],
                    "parent_code": row['parent_code'],
                    "name": row['name'],
                    "keywords": row['keywords'],
                    "content_type_id": row['content_type_id'],
                    "content_type_name": row['content_type_name'],
                    "similarity": similarity_value,
                    "level_bonus": level_bonus,
                    "match_type": row['match_type']
                }

                print(f"[CATEGORY_RESOLVER] '{category_text}' -> {result['name']} (score: {similarity_value:.2f}, type: Vector only)")
                return result

            print(f"[CATEGORY_RESOLVER] '{category_text}' -> No match found")
            return None

        except Exception as e:
            print(f"[CATEGORY_RESOLVER] Error: {e}")
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
        resolver = CategoryResolver(openai_api_key, db_config)

        test_categories = ["맛집", "카페", "관광지", "박물관"]

        for cat in test_categories:
            print(f"\n{'='*60}")
            result = await resolver.resolve(cat)
            print(f"Result: {json.dumps(result, ensure_ascii=False, indent=2)}")

    asyncio.run(test())
