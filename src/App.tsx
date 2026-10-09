import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { TopBar } from './components/TopBar';
import { EndMonthBar } from './components/EndMonthBar';
import { MonthReportModal } from './components/MonthReportModal';
import { TutorialOverlay } from './components/TutorialOverlay';
import { VictoryScreen } from './components/VictoryScreen';
import { CommunityPage } from './components/pages/CommunityPage';
import { PropertyPage } from './components/pages/PropertyPage';
import { ManagementPage } from './components/pages/ManagementPage';
import { TenantsPage } from './components/pages/TenantsPage';
import { RecordsPage } from './components/pages/RecordsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { setSoundEnabled, playSound } from './components/SoundManager';
import { AnimatedEmoji } from './components/AnimatedEmoji';
import { hasSave } from './game/save';
import { selectEventsForMonth } from './game/events';
import { createInitialState } from './game/economy';
import type { GameState } from './game/types';

type TabId = 'community' | 'property' | 'management' | 'tenants' | 'records' | 'settings';

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'community', label: '社区', emoji: '🏘️' },
  { id: 'property', label: '房产', emoji: '🏢' },
  { id: 'management', label: '经营', emoji: '🛠️' },
  { id: 'tenants', label: '租客', emoji: '👥' },
  { id: 'records', label: '记录', emoji: '📊' },
  { id: 'settings', label: '设置', emoji: '⚙️' },
];

export default function App() {
  const {
    state,
    lastSettlement,
    pendingReport,
    newGame,
    loadFromStorage,
    buyProperty,
    renovateGroup,
    renovateType,
    setMarketingPlan,
    setMaintenancePlan,
    setRenewalService,
    setAutoRecruit,
    setPriority,
    toggleManager,
    toggleAmenities,
    upgradeManager,
    upgradeAmenity,
    recruitIntoGroup,
    recruitAuto,
    chooseEvent,
    endMonth,
    dismissReport,
    applyBasicOps,
    pauseAllServices,
    renameCommunity,
    setPreference,
    importSave,
    exportSave,
    confirmRestart,
    advanceTutorial,
    skipTutorial,
    debugSet,
    debugFillGoal,
  } = useGameStore();

  const [tab, setTab] = useState<TabId>('community');
  const [toast, setToast] = useState<{ message: string; kind: 'info' | 'error' | 'success' } | null>(null);
  const [showVictory, setShowVictory] = useState(false);
  const [victoryNotifiedFor, setVictoryNotifiedFor] = useState(false);

  // 启动：读取存档或新游戏
  useEffect(() => {
    const loaded = loadFromStorage();
    if (!loaded) {
      const initial = createInitialState();
      useGameStore.setState({
        state: { ...initial, currentEventIds: selectEventsForMonth(initial) },
      });
      useGameStore.getState().newGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 音效开关同步
  useEffect(() => {
    setSoundEnabled(state.preferences.soundEnabled);
  }, [state.preferences.soundEnabled]);

  // 减少动效偏好
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = state.preferences.reducedMotion ? 'true' : 'false';
  }, [state.preferences.reducedMotion]);

  // 胜利提示：月报关闭后再展示胜利页面
  useEffect(() => {
    if (state.hasWon && !victoryNotifiedFor && !pendingReport) {
      setVictoryNotifiedFor(true);
      setShowVictory(true);
      playSound('win');
    }
    if (!state.hasWon) {
      setVictoryNotifiedFor(false);
    }
  }, [state.hasWon, victoryNotifiedFor, pendingReport]);

  const notify = (message: string, kind: 'info' | 'error' | 'success' = 'info') => {
    setToast({ message, kind });
    playSound(kind === 'error' ? 'error' : kind === 'success' ? 'success' : 'click');
  };

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleEndMonth = () => {
    const result = endMonth();
    if (!result.ok) {
      notify(result.error ?? '无法结束本月', 'error');
    }
  };

  const reportMonthIndex = useMemo(() => {
    if (!pendingReport || !lastSettlement) return state.monthIndex - 1;
    return Math.max(0, state.monthIndex - 1);
  }, [pendingReport, lastSettlement, state.monthIndex]);

  const tutorialVisible = state.tutorialStep >= 1 && state.tutorialStep <= 5;

  return (
    <div className="app">
      <TopBar state={state} />

      <main className={`main main--${tab}`}>
        {tab === 'community' && (
          <CommunityPage state={state} onRenameCommunity={renameCommunity} />
        )}
        {tab === 'property' && (
          <PropertyPage
            state={state}
            onBuy={buyProperty}
            onRenovateGroup={renovateGroup}
            onRenovateType={renovateType}
            onRecruitGroup={recruitIntoGroup}
            onRecruitAuto={recruitAuto}
            notify={notify}
          />
        )}
        {tab === 'management' && (
          <ManagementPage
            state={state}
            onSetMarketing={setMarketingPlan}
            onSetMaintenance={setMaintenancePlan}
            onSetRenewal={setRenewalService}
            onSetAutoRecruit={setAutoRecruit}
            onSetPriority={setPriority}
            onToggleManager={toggleManager}
            onToggleAmenities={toggleAmenities}
            onUpgradeManager={upgradeManager}
            onUpgradeAmenity={upgradeAmenity}
            notify={notify}
          />
        )}
        {tab === 'tenants' && (
          <TenantsPage state={state} onChooseEvent={chooseEvent} notify={notify} />
        )}
        {tab === 'records' && <RecordsPage state={state} />}
        {tab === 'settings' && (
          <SettingsPage
            state={state}
            onSetPreference={setPreference}
            onExport={exportSave}
            onImport={importSave}
            onRestart={confirmRestart}
            onDebugSet={debugSet}
            onDebugFillGoal={debugFillGoal}
            notify={notify}
          />
        )}
      </main>

      <nav className="tabbar" aria-label="功能导航">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tabbar-item ${tab === t.id ? 'tabbar-item--active' : ''}`}
            onClick={() => {
              setTab(t.id);
              playSound('click');
            }}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            <span className="tabbar-emoji" aria-hidden="true">
              {t.emoji}
            </span>
            <span className="tabbar-label">{t.label}</span>
            {t.id === 'tenants' && state.currentEventIds.length > 0 && (
              <span className="tabbar-badge" aria-label={`${state.currentEventIds.length} 个待处理事件`}>
                {state.currentEventIds.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      <EndMonthBar
        state={state}
        onEndMonth={handleEndMonth}
        onApplyBasicOps={() => {
          applyBasicOps();
          notify('已调整为基础运营：自然招租、节省维护、关闭续租沟通', 'info');
        }}
        onPauseAll={() => {
          pauseAllServices();
          notify('已暂停全部付费服务，本月零费用推进', 'info');
        }}
      />

      {pendingReport && lastSettlement && (
        <MonthReportModal
          reportIndex={reportMonthIndex}
          result={lastSettlement}
          consecutive={state.consecutiveGoalMonths}
          onClose={() => {
            dismissReport();
            playSound('click');
          }}
        />
      )}

      {tutorialVisible && (
        <TutorialOverlay
          step={state.tutorialStep}
          onNext={advanceTutorial}
          onSkip={skipTutorial}
        />
      )}

      {showVictory && (
        <VictoryScreen
          state={state}
          onContinue={() => setShowVictory(false)}
          onRestart={() => {
            setShowVictory(false);
            confirmRestart();
          }}
        />
      )}

      {toast && (
        <div className={`toast toast--${toast.kind}`} role="status" aria-live="polite">
          <AnimatedEmoji
            name={toast.kind === 'error' ? 'smile-soft' : toast.kind === 'success' ? 'celebration' : 'bulb'}
            size={20}
            play="once"
          />
          {toast.message}
        </div>
      )}
    </div>
  );
}

export type { GameState };
