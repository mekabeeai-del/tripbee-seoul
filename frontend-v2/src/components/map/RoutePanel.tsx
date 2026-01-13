import { useState, useMemo } from 'react';
import { MdClose, MdDirectionsWalk, MdDirectionsBus, MdDirectionsSubway, MdSwapVert } from 'react-icons/md';
import { getTranslation, type Language } from '../../locales';
import './RoutePanel.css';

type TransportType = 'bus' | 'subway' | 'walk';

interface RouteStep {
  type: TransportType;
  name: string;
  description: string;
  distance?: string;
  duration?: string;
  lineColor?: string;
  lineNumber?: string;
}

interface RouteOption {
  id: string;
  duration: string;
  cost: string;
  transfers: number;
  distance: string;
  steps: RouteStep[];
}

type RouteFilter = 'all' | 'bus' | 'subway' | 'bus+subway';

interface RoutePanelProps {
  isOpen: boolean;
  onClose: () => void;
  fromName: string;
  toName: string;
  routes?: RouteOption[];
  language?: Language;
}

export default function RoutePanel({
  isOpen,
  onClose,
  fromName,
  toName,
  routes = [],
  language = 'ko'
}: RoutePanelProps) {
  const [activeFilter, setActiveFilter] = useState<RouteFilter>('all');
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const t = useMemo(() => getTranslation(language), [language]);

  // 필터별 경로 필터링
  const filteredRoutes = routes.filter(route => {
    if (activeFilter === 'all') return true;

    const hasSubway = route.steps.some(step => step.type === 'subway');
    const hasBus = route.steps.some(step => step.type === 'bus');

    if (activeFilter === 'subway') return hasSubway && !hasBus;
    if (activeFilter === 'bus') return hasBus && !hasSubway;
    if (activeFilter === 'bus+subway') return hasSubway && hasBus;

    return true;
  });

  // 아이콘 렌더링
  const renderTransportIcon = (type: TransportType) => {
    switch (type) {
      case 'bus':
        return <MdDirectionsBus className="step-icon bus" />;
      case 'subway':
        return <MdDirectionsSubway className="step-icon subway" />;
      case 'walk':
        return <MdDirectionsWalk className="step-icon walk" />;
    }
  };

  // 경로 스텝 렌더링
  const renderRouteSteps = (steps: RouteStep[]) => {
    return (
      <div className="route-steps">
        {steps.map((step, idx) => (
          <div key={idx} className="route-step">
            <div className="step-marker">
              {renderTransportIcon(step.type)}
              {idx < steps.length - 1 && <div className="step-connector" />}
            </div>
            <div className="step-info">
              <div className="step-header">
                {step.lineNumber && (
                  <span
                    className="line-badge"
                    style={{ backgroundColor: step.lineColor || '#999' }}
                  >
                    {step.lineNumber}
                  </span>
                )}
                <span className="step-name">{step.name}</span>
              </div>
              <div className="step-description">{step.description}</div>
              {(step.duration || step.distance) && (
                <div className="step-meta">
                  {step.duration && <span>{step.duration}</span>}
                  {step.distance && <span>{step.distance}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  const selectedRouteData = routes.find(r => r.id === selectedRoute);

  return (
    <div className="route-panel">
      <div className="route-backdrop" onClick={onClose} />
      <div className="route-content">
        {/* 헤더 */}
        <div className="route-header">
          <div className="route-title">
            <div className="route-locations">
              <div className="location-item">
                <span className="location-badge start">{t.route.start}</span>
                <span className="location-name">{fromName}</span>
              </div>
              <MdSwapVert className="location-arrow" />
              <div className="location-item">
                <span className="location-badge end">{t.route.end}</span>
                <span className="location-name">{toName}</span>
              </div>
            </div>
          </div>
          <button className="route-close" onClick={onClose}>
            <MdClose size={24} />
          </button>
        </div>

        {/* 필터 탭 */}
        <div className="route-filters">
          <button
            className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            {t.route.filterAll} {routes.length}
          </button>
          <button
            className={`filter-btn ${activeFilter === 'bus' ? 'active' : ''}`}
            onClick={() => setActiveFilter('bus')}
          >
            {t.route.filterBus} {routes.filter(r => r.steps.some(s => s.type === 'bus') && !r.steps.some(s => s.type === 'subway')).length}
          </button>
          <button
            className={`filter-btn ${activeFilter === 'subway' ? 'active' : ''}`}
            onClick={() => setActiveFilter('subway')}
          >
            {t.route.filterSubway} {routes.filter(r => r.steps.some(s => s.type === 'subway') && !r.steps.some(s => s.type === 'bus')).length}
          </button>
          <button
            className={`filter-btn ${activeFilter === 'bus+subway' ? 'active' : ''}`}
            onClick={() => setActiveFilter('bus+subway')}
          >
            {t.route.filterBusSubway} {routes.filter(r => r.steps.some(s => s.type === 'bus') && r.steps.some(s => s.type === 'subway')).length}
          </button>
        </div>

        {/* 경로 목록 또는 상세 */}
        {selectedRoute ? (
          // 경로 상세
          <div className="route-detail">
            <button
              className="back-button"
              onClick={() => setSelectedRoute(null)}
            >
              ← {t.route.backToList}
            </button>
            {selectedRouteData && (
              <>
                <div className="route-summary-card">
                  <div className="summary-time">{selectedRouteData.duration}</div>
                  <div className="summary-meta">
                    <span>{t.route.cost} {selectedRouteData.cost}</span>
                    <span>{t.route.transfersCount(selectedRouteData.transfers)}</span>
                    <span>{selectedRouteData.distance}</span>
                  </div>
                </div>
                {renderRouteSteps(selectedRouteData.steps)}
              </>
            )}
          </div>
        ) : (
          // 경로 목록
          <div className="route-list">
            {filteredRoutes.length > 0 ? (
              filteredRoutes.map(route => (
                <div
                  key={route.id}
                  className="route-card"
                  onClick={() => setSelectedRoute(route.id)}
                >
                  <div className="route-card-header">
                    <div className="route-duration">{route.duration}</div>
                    <div className="route-tags">
                      {route.steps.map((step, idx) =>
                        step.type !== 'walk' && (
                          <span
                            key={idx}
                            className={`route-tag ${step.type}`}
                          >
                            {step.type === 'bus' ? t.route.filterBus : t.route.filterSubway}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                  <div className="route-card-meta">
                    <span>{t.route.walk} {route.steps.find(s => s.type === 'walk')?.duration || '0분'}</span>
                    <span>{t.route.transfersCount(route.transfers)}</span>
                    <span>{t.route.cost} {route.cost}</span>
                    <span>{route.distance}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-routes">
                {t.route.noRoutes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
