import { useId, useState } from 'react';

const RELEASE_HIGHLIGHTS: Record<string, string[]> = {
  '1.1.0': [
    'Keep pinned items across searches in the current trade tab.',
    'Reopen a pinned item\'s saved search when its result is no longer visible.',
    'Use readable league names with corrected Firefox packaging and toolbar icons.',
  ],
};

interface UpdateNoticeContentProps {
  version: string;
}

export function UpdateNoticeContent({ version }: UpdateNoticeContentProps) {
  const previewId = useId();
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const highlights = RELEASE_HIGHLIGHTS[version] ?? [
    'Open the full changelog for the details included with this release.',
  ];
  const releaseUrl = `https://github.com/appaKappaK/better-trading-for-firefox/releases/tag/v${encodeURIComponent(version)}`;

  return (
    <div
      className="popup-update-notice-content"
      onMouseLeave={() => setIsPreviewVisible(false)}>
      <p>
        Better Trading for Firefox was just updated. Check the{' '}
        <a
          aria-describedby={isPreviewVisible ? previewId : undefined}
          className="popup-release-notes__link"
          href={releaseUrl}
          onBlur={() => setIsPreviewVisible(false)}
          onFocus={() => setIsPreviewVisible(true)}
          onMouseEnter={() => setIsPreviewVisible(true)}
          rel="noreferrer"
          target="_blank">
          changelog
        </a>{' '}
        for what is new.
      </p>

      {isPreviewVisible ? (
        <aside
          className="popup-release-notes__preview"
          id={previewId}
          role="tooltip">
          <strong>What&apos;s new in v{version}</strong>
          <ul>
            {highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
          <small>Click changelog to view the full release notes.</small>
        </aside>
      ) : null}
    </div>
  );
}
