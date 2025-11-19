-- Gateway 라우트 prefix 통일 작업
-- 서비스명으로 prefix 변경 (/privacy, /beaty, /poi, /route, /beatmap)

-- Privacy Service
UPDATE gateway_routes
SET prefix = '/privacy'
WHERE service_name = 'Privacy Service';

-- Beaty Service
UPDATE gateway_routes
SET prefix = '/beaty'
WHERE service_name = 'Beaty Service';

-- POI Service
UPDATE gateway_routes
SET prefix = '/poi'
WHERE service_name = 'POI Service';

-- Route Service
UPDATE gateway_routes
SET prefix = '/route'
WHERE service_name = 'Route Service';

-- Beatmap Service
UPDATE gateway_routes
SET prefix = '/beatmap'
WHERE service_name = 'Beatmap Service';

-- 확인
SELECT service_name, prefix, target_url FROM gateway_routes ORDER BY prefix;
