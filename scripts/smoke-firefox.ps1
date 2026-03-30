param(
  [string]$FirefoxBinary = "",
  [string]$StartUrl = "https://www.pathofexile.com/trade/search/Standard"
)

$ErrorActionPreference = "Stop"

Push-Location $PSScriptRoot\..
try {
  if ($FirefoxBinary) {
    $env:FIREFOX_BINARY = $FirefoxBinary
  }
  $env:BTFF_START_URL = $StartUrl
  npm run smoke:firefox
}
finally {
  Pop-Location
}
