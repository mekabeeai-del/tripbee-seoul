"""
POI Service Configuration
공통 설정 관리
"""

import os
import json
from pathlib import Path
from typing import Dict, Any


def load_config() -> Dict[str, Any]:
    """CLAUDE.md에서 설정 로드"""
    try:
        config_path = Path(__file__).parent.parent.parent / "CLAUDE.md"
        if config_path.exists():
            with open(config_path, "r", encoding="utf-8") as f:
                content = f.read()
                import re
                config_match = re.search(r'config:\s*{([^}]+)}', content, re.DOTALL)
                if config_match:
                    config_str = '{' + config_match.group(1) + '}'
                    config = json.loads(config_str.replace('\t', ''))
                    return config

        # Fallback to env
        return {
            "db_host": os.getenv("DB_HOST", "aws-1-ap-northeast-2.pooler.supabase.com"),
            "db_port": int(os.getenv("DB_PORT", 5432)),
            "db_name": os.getenv("DB_NAME", "postgres"),
            "db_user": os.getenv("DB_USER", "postgres.gibhwsrislzraqsoykov"),
            "db_password": os.getenv("DB_PASSWORD", "UsXp4ijCnWw@$eJ"),
            "openai_api_key": os.getenv("OPENAI_API_KEY"),
            "google_api_key": os.getenv("GOOGLE_API_KEY", "AIzaSyBIQVYNLnbSdjIN2agdGeo0K10cbseBXoM")
        }
    except Exception as e:
        print(f"[CONFIG] 설정 로드 실패: {e}")
        raise


# Global config
CONFIG = load_config()
