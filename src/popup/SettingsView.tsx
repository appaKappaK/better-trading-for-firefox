import {
  ENHANCER_DEFINITIONS,
  isEnhancerEnabled,
} from '@/src/lib/preferences/enhancers';
import type { StorageSchemaV1 } from '@/src/lib/storage/schema';

const REPO_URL = 'https://github.com/appaKappaK/better-trading-for-firefox';
const ORIGINAL_REPO_URL = 'https://github.com/exile-center/better-trading';

interface Props {
  isSchemaLoading: boolean;
  onSetSidePanelCollapsed: (collapsed: boolean) => Promise<void> | void;
  onSetSidePanelDraggable: (draggable: boolean) => Promise<void> | void;
  onSetSidePanelSidebar: (sidebar: boolean) => Promise<void> | void;
  onToggleEnhancer: (slug: string, nextEnabled: boolean) => Promise<void> | void;
  schema: StorageSchemaV1 | null;
}

export function SettingsView({
  isSchemaLoading,
  onSetSidePanelCollapsed,
  onSetSidePanelDraggable,
  onSetSidePanelSidebar,
  onToggleEnhancer,
  schema,
}: Props) {
  const disabledEnhancers = schema?.preferences.disabledEnhancers ?? [];
  const sidePanelCollapsed = Boolean(schema?.preferences.sidePanelCollapsed);
  const sidePanelDraggable = Boolean(schema?.preferences.sidePanelDraggable);
  const sidePanelSidebar = Boolean(schema?.preferences.sidePanelSidebar);
  const manifest = readManifestInfo();

  return (
    <>

      {isSchemaLoading ? (
        <p className="popup-empty">Loading saved settings...</p>
      ) : (
        <>
          <section className="popup-settings-list">
            <label className="popup-setting-card">
              <div>
                <strong>Open the in-page panel collapsed</strong>
                <p>The side panel will start docked until you expand it.</p>
              </div>
              <input
                checked={sidePanelCollapsed}
                onChange={(event) => {
                  void onSetSidePanelCollapsed(event.target.checked);
                }}
                type="checkbox"
              />
            </label>
            <label className="popup-setting-card">
              <div>
                <strong>Open the in-page panel as a sidebar</strong>
                <p>Pushes the trade page content over instead of overlaying it.</p>
              </div>
              <input
                checked={sidePanelSidebar}
                onChange={(event) => {
                  void onSetSidePanelSidebar(event.target.checked);
                }}
                type="checkbox"
              />
            </label>
            <label className="popup-setting-card">
              <div>
                <strong>Allow dragging the overlay panel</strong>
                <p>Drag the panel header to reposition it when not in sidebar mode.</p>
              </div>
              <input
                checked={sidePanelDraggable}
                disabled={sidePanelSidebar}
                onChange={(event) => {
                  void onSetSidePanelDraggable(event.target.checked);
                }}
                type="checkbox"
              />
            </label>
          </section>


          <section className="popup-settings-list">
            {ENHANCER_DEFINITIONS.map((enhancer) => {
              const enabled = isEnhancerEnabled(
                disabledEnhancers,
                enhancer.slug,
              );

              return (
                <label className="popup-setting-card" key={enhancer.slug}>
                  <div>
                    <strong>{enhancer.label}</strong>
                    <p>{enhancer.description}</p>
                  </div>
                  <input
                    checked={enabled}
                    onChange={(event) => {
                      void onToggleEnhancer(enhancer.slug, event.target.checked);
                    }}
                    type="checkbox"
                  />
                </label>
              );
            })}
          </section>

          <section className="popup-settings-list">
            <article className="popup-setting-card popup-setting-card--stack">
              <div>
                <strong>About this build</strong>
              </div>

              <div className="popup-about-grid">
                <span className="popup-about-pill">Firefox MV3</span>
                <span className="popup-about-pill">Legacy backup compatible</span>
                {manifest.geckoId ? (
                  <span className="popup-about-pill">Gecko ID set</span>
                ) : null}
              </div>

              <dl className="popup-about-details">
                <div>
                  <dt>Version</dt>
                  <dd>{manifest.version}</dd>
                </div>
                <div>
                  <dt>Extension ID</dt>
                  <dd>{manifest.geckoId ?? 'Not available in this context'}</dd>
                </div>
              </dl>

              <div className="popup-link-row">
                <a
                  className="popup-link-button"
                  href={REPO_URL}
                  rel="noreferrer"
                  target="_blank">
                  GitHub
                </a>
                <a
                  className="popup-link-button"
                  href={ORIGINAL_REPO_URL}
                  rel="noreferrer"
                  target="_blank">
                  Original add-on
                </a>
              </div>
            </article>
          </section>
        </>
      )}
    </>
  );
}

function readManifestInfo() {
  const manifest =
    typeof browser !== 'undefined' && browser.runtime?.getManifest
      ? browser.runtime.getManifest()
      : null;

  const gecko = manifest?.browser_specific_settings?.gecko as
    | { id?: string }
    | undefined;

  return {
    //name: manifest?.name ?? 'Better Trading for Firefox',
    version: manifest?.version ?? 'dev',
    geckoId: gecko?.id ?? null,
  };
}
