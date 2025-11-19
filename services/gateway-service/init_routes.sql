-- Gateway 초기 라우트 설정
-- Supabase SQL Editor에서 실행
--
-- target_url에는 서비스 키만 저장 (privacy, beaty, poi, route, beatmap)
-- Gateway가 환경(local/prod)에 따라 실제 URL로 치환함

-- Privacy Service 라우트
INSERT INTO gateway_routes (service_name, target_url, prefix, swagger_url, is_active)
VALUES
    ('Privacy Service', 'privacy', '/api/auth', '/docs', true)
ON CONFLICT (prefix) DO UPDATE SET
    service_name = EXCLUDED.service_name,
    target_url = EXCLUDED.target_url,
    swagger_url = EXCLUDED.swagger_url,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Beaty Service 라우트
INSERT INTO gateway_routes (service_name, target_url, prefix, swagger_url, is_active)
VALUES
    ('Beaty Service', 'beaty', '/api/beaty', '/docs', true)
ON CONFLICT (prefix) DO UPDATE SET
    service_name = EXCLUDED.service_name,
    target_url = EXCLUDED.target_url,
    swagger_url = EXCLUDED.swagger_url,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- POI Service 라우트
INSERT INTO gateway_routes (service_name, target_url, prefix, swagger_url, is_active)
VALUES
    ('POI Service', 'poi', '/api/poi', '/docs', true)
ON CONFLICT (prefix) DO UPDATE SET
    service_name = EXCLUDED.service_name,
    target_url = EXCLUDED.target_url,
    swagger_url = EXCLUDED.swagger_url,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Route Service 라우트
INSERT INTO gateway_routes (service_name, target_url, prefix, swagger_url, is_active)
VALUES
    ('Route Service', 'route', '/api/route', '/docs', true)
ON CONFLICT (prefix) DO UPDATE SET
    service_name = EXCLUDED.service_name,
    target_url = EXCLUDED.target_url,
    swagger_url = EXCLUDED.swagger_url,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Beatmap Service 라우트
INSERT INTO gateway_routes (service_name, target_url, prefix, swagger_url, is_active)
VALUES
    ('Beatmap Service', 'beatmap', '/api/beatmap', '/docs', true)
ON CONFLICT (prefix) DO UPDATE SET
    service_name = EXCLUDED.service_name,
    target_url = EXCLUDED.target_url,
    swagger_url = EXCLUDED.swagger_url,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- 확인
SELECT * FROM gateway_routes ORDER BY prefix;
