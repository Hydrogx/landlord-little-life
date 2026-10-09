import { useRef, useState } from 'react';
import type { GameState } from '../../game/types';
import { monthLabel } from '../../game/economy';
import { AnimatedEmoji } from '../AnimatedEmoji';
import { ConfirmDialog } from '../ConfirmDialog';
import { hasSave } from '../../game/save';

interface SettingsPageProps {
  state: GameState;
  onSetPreference: (key: 'soundEnabled' | 'reducedMotion', value: boolean) => void;
  onExport: () => void;
  onImport: (json: string) => { ok: boolean; error?: string };
  onRestart: () => void;
  onDebugSet: (patch: Partial<GameState>) => void;
  onDebugFillGoal: () => void;
  notify: (message: string, kind?: 'info' | 'error' | 'success') => void;
}

/** 设置页：音效、动效、存档、重新开始 */
export function SettingsPage({
  state,
  onSetPreference,
  onExport,
  onImport,
  onRestart,
  onDebugSet,
  onDebugFillGoal,
  notify,
}: SettingsPageProps) {
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'paste' | 'file'>('paste');
  const fileRef = useRef<HTMLInputElement>(null);
  const isDev = import.meta.env.DEV;

  const handleImport = () => {
    const result = onImport(importText);
    if (!result.ok) {
      notify(`导入失败：${result.error ?? '未知错误'}`, 'error');
    } else {
      notify('存档导入成功', 'success');
      setImportText('');
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const result = onImport(text);
      if (!result.ok) {
        notify(`导入失败：${result.error ?? '未知错误'}`, 'error');
      } else {
        notify('存档导入成功', 'success');
      }
    };
    reader.onerror = () => notify('文件读取失败', 'error');
    reader.readAsText(file);
  };

  return (
    <div className="page settings-page">
      <section className="card" aria-label="偏好设置">
        <h3>
          <AnimatedEmoji name="sparkles" size={22} play="loop" />
          偏好设置
        </h3>
        <div className="service-list">
          <div className="service-item">
            <div className="service-text">
              <strong>音效</strong>
              <small>默认关闭，开启后播放轻量合成音效</small>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state.preferences.soundEnabled}
              aria-label="音效开关"
              className={`toggle ${state.preferences.soundEnabled ? 'toggle--on' : ''}`}
              onClick={() => onSetPreference('soundEnabled', !state.preferences.soundEnabled)}
            >
              <span className="toggle-knob" />
            </button>
          </div>
          <div className="service-item">
            <div className="service-text">
              <strong>减少动态效果</strong>
              <small>关闭循环动画与计数动效（也遵循系统 prefers-reduced-motion）</small>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state.preferences.reducedMotion}
              aria-label="减少动态效果开关"
              className={`toggle ${state.preferences.reducedMotion ? 'toggle--on' : ''}`}
              onClick={() => onSetPreference('reducedMotion', !state.preferences.reducedMotion)}
            >
              <span className="toggle-knob" />
            </button>
          </div>
        </div>
      </section>

      <section className="card" aria-label="存档管理">
        <h3>
          <AnimatedEmoji name="house" size={22} play="loop" />
          存档管理
        </h3>
        <p className="card-hint">
          {hasSave()
            ? `当前进度：${monthLabel(state.monthIndex)} · 本地自动存档已开启`
            : '暂无本地存档'}
        </p>
        <div className="settings-actions">
          <button type="button" className="btn btn--secondary" onClick={onExport}>
            导出存档 JSON
          </button>
          <div className="import-area">
            <div className="segmented" role="group" aria-label="导入方式">
              <button
                type="button"
                className={importMode === 'paste' ? 'segmented-item segmented-item--active' : 'segmented-item'}
                onClick={() => setImportMode('paste')}
              >
                粘贴文本
              </button>
              <button
                type="button"
                className={importMode === 'file' ? 'segmented-item segmented-item--active' : 'segmented-item'}
                onClick={() => setImportMode('file')}
              >
                选择文件
              </button>
            </div>
            {importMode === 'paste' ? (
              <>
                <textarea
                  className="import-textarea"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder='粘贴导出的存档 JSON，例如 {"saveVersion":1,...}'
                  aria-label="粘贴存档 JSON"
                  rows={4}
                />
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={importText.trim().length === 0}
                  onClick={handleImport}
                >
                  导入存档
                </button>
              </>
            ) : (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="file-input"
                  aria-label="选择存档文件"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => fileRef.current?.click()}
                >
                  选择存档文件
                </button>
              </>
            )}
          </div>
        </div>
        <p className="card-hint">导入存档会覆盖当前进度，请谨慎操作。</p>
      </section>

      <section className="card" aria-label="重新开始">
        <h3>
          <AnimatedEmoji name="seedling" size={22} play="loop" />
          重新开始
        </h3>
        <p className="card-hint">清空当前存档并从第 1 年 1 月重新开始。</p>
        <button type="button" className="btn btn--danger" onClick={() => setConfirmRestart(true)}>
          重新开始
        </button>
      </section>

      {isDev && (
        <section className="card card--debug" aria-label="调试工具">
          <h3>🛠 调试工具（仅开发环境）</h3>
          <div className="debug-grid">
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => {
                onDebugSet({ cashCents: 10_000_000_000 });
                notify('资金已设为 ¥100,000,000', 'info');
              }}
            >
              资金 +1亿
            </button>
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => {
                onDebugSet({ cashCents: 9_600_000_000 });
                notify('资金已设为 ¥96,000,000（足够买满）', 'info');
              }}
            >
              资金设为终局水平
            </button>
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => {
                onDebugSet({ monthIndex: state.monthIndex + 12 });
                notify('时间快进 1 年', 'info');
              }}
            >
              时间 +1年
            </button>
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => {
                onDebugSet({ satisfaction: 100, maintenance: 100 });
                notify('满意度与维护已拉满', 'info');
              }}
            >
              满意度/维护拉满
            </button>
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => {
                onDebugFillGoal();
                notify('已填充终局状态：1200 套满租', 'info');
              }}
            >
              填充终局状态（1200套满租）
            </button>
          </div>
        </section>
      )}

      <section className="card" aria-label="关于">
        <h3>关于</h3>
        <p className="card-hint">
          房东小日子 v1.0 · 单人网页经营小游戏 · 数据保存在浏览器本地
        </p>
        <p className="card-hint">
          动态 Emoji 素材：Noto Emoji Animation（Apache 2.0 / SIL OFL 1.1），详见 ASSET_LICENSES.md
        </p>
      </section>

      {confirmRestart && (
        <ConfirmDialog
          title="重新开始？"
          message="当前存档将被清空，所有进度丢失。确定要重新开始吗？"
          confirmLabel="确认重新开始"
          danger
          onConfirm={() => {
            setConfirmRestart(false);
            onRestart();
            notify('已重新开始', 'info');
          }}
          onCancel={() => setConfirmRestart(false)}
        />
      )}
    </div>
  );
}
