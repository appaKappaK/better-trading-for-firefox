const RELEASE_HIGHLIGHTS: Record<string, string[]> = {
  '1.3.1': [
    'Confirm before replacing a saved bookmark search.',
    'Maintenance update with refreshed development and security dependencies.',
  ],
  '1.3.0': [
    'Reorder bookmark folders and pinned items with smooth dragging, including wheel scrolling through long lists.',
    'See saved leagues on bookmark folders and compact price and league details in the collapsed launcher.',
    'Browse long saved-data lists with tighter cards, contained names, preserved positions, and transient scrollbars.',
  ],
  '1.2.0': [
    'Personalize folders and bookmarks with color-coded names and a streamlined icon picker.',
    'Manage saved data safely with confirmation dialogs and clearing that preserves your extension settings.',
    'Quickly hide or restore the popup header, drag the collapsed panel, and double-click the logo to shrink it.',
  ],
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
  const highlights = RELEASE_HIGHLIGHTS[version] ?? [
    'See the full changelog for details about this update.',
  ];
  const releaseUrl = `https://github.com/appaKappaK/better-trading-for-firefox/releases/tag/v${encodeURIComponent(version)}`;

  return (
    <div className="popup-update-notice-content">
      <ul className="popup-release-notes__highlights">
        {highlights.map((highlight) => (
          <li key={highlight}>{highlight}</li>
        ))}
      </ul>
      <a
        className="popup-release-notes__link"
        href={releaseUrl}
        rel="noreferrer"
        target="_blank">
        View full changelog
      </a>
    </div>
  );
}
