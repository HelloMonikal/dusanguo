import type { ReaderSettings } from '../lib/settings'

interface Props {
  settings: ReaderSettings
  onChange: (next: ReaderSettings) => void
  onClose: () => void
}

export default function SettingsPanel({ settings, onChange, onClose }: Props) {
  const set = <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) =>
    onChange({ ...settings, [key]: value })

  return (
    <div className="settings-panel" role="dialog" aria-label="阅读设置">
      <div className="settings-head">
        <strong>阅读设置</strong>
        <button type="button" className="annotation-close" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="settings-row">
        <span className="settings-label">原文字形</span>
        <div className="seg-group">
          <button
            type="button"
            className={settings.script === 'traditional' ? 'on' : ''}
            onClick={() => set('script', 'traditional')}
          >
            繁体
          </button>
          <button
            type="button"
            className={settings.script === 'simplified' ? 'on' : ''}
            onClick={() => set('script', 'simplified')}
          >
            简体
          </button>
        </div>
      </div>

      <div className="settings-row">
        <span className="settings-label">白话对照</span>
        <div className="seg-group">
          <button
            type="button"
            className={settings.showTranslation ? 'on' : ''}
            onClick={() => set('showTranslation', true)}
          >
            显示
          </button>
          <button
            type="button"
            className={!settings.showTranslation ? 'on' : ''}
            onClick={() => set('showTranslation', false)}
          >
            仅原文
          </button>
        </div>
      </div>

      <div className="settings-row">
        <span className="settings-label">生卒信息</span>
        <div className="seg-group">
          <button
            type="button"
            className={settings.showLifespan ? 'on' : ''}
            onClick={() => set('showLifespan', true)}
          >
            显示
          </button>
          <button
            type="button"
            className={!settings.showLifespan ? 'on' : ''}
            onClick={() => set('showLifespan', false)}
          >
            隐藏
          </button>
        </div>
      </div>

      <div className="settings-row">
        <span className="settings-label">原文字体</span>
        <div className="seg-group">
          <button
            type="button"
            className={settings.fontFamily === 'song' ? 'on' : ''}
            onClick={() => set('fontFamily', 'song')}
          >
            宋体
          </button>
          <button
            type="button"
            className={settings.fontFamily === 'kai' ? 'on' : ''}
            onClick={() => set('fontFamily', 'kai')}
          >
            楷体
          </button>
          <button
            type="button"
            className={settings.fontFamily === 'hei' ? 'on' : ''}
            onClick={() => set('fontFamily', 'hei')}
          >
            黑体
          </button>
        </div>
      </div>

      <div className="settings-row">
        <span className="settings-label">字号 {settings.fontSize}px</span>
        <input
          type="range"
          min={14}
          max={26}
          step={1}
          value={settings.fontSize}
          onChange={(e) => set('fontSize', Number(e.target.value))}
        />
      </div>
    </div>
  )
}
