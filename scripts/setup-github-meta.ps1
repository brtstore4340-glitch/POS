$ErrorActionPreference = "Stop"

$owner = (gh repo view --json owner -q ".owner.login").Trim()
$repo  = (gh repo view --json name -q ".name").Trim()
Write-Host "Repo: $owner/$repo"

function Ensure-Label($name, $color, $desc) {
  gh label create $name --color $color --description $desc --force | Out-Null
  Write-Host "Label: $name"
}

function Ensure-Milestone($title, $desc) {
  $exists = gh api "repos/$owner/$repo/milestones" --paginate -q ".[] | select(.title==""$title"") | .number"
  if ($exists) {
    Write-Host "Milestone exists: $title"
  } else {
    gh api -X POST "repos/$owner/$repo/milestones" -f title="$title" -f description="$desc" | Out-Null
    Write-Host "Milestone: $title"
  }
}

# Type
Ensure-Label "type: feature" "1D4ED8" "New feature"
Ensure-Label "type: bug" "DC2626" "Bug fix"
Ensure-Label "type: techdebt" "6B7280" "Refactor/cleanup"
Ensure-Label "type: docs" "0EA5E9" "Documentation"

# Priority
Ensure-Label "priority: P0" "7F1D1D" "Blocker / urgent"
Ensure-Label "priority: P1" "DC2626" "High"
Ensure-Label "priority: P2" "F59E0B" "Medium"
Ensure-Label "priority: P3" "10B981" "Low"

# Area
Ensure-Label "area: pos-ui" "2563EB" "POS UI & keyboard UX"
Ensure-Label "area: catalog" "0EA5E9" "Catalog import/search"
Ensure-Label "area: pricing" "F59E0B" "Pricing engine"
Ensure-Label "area: auth-security" "DC2626" "Auth, rules, security"
Ensure-Label "area: reports-pdf" "14B8A6" "Daily report / PDF"
Ensure-Label "area: infra-ci" "6B7280" "CI/CD, tooling"

# Modules
0..7 | ForEach-Object { Ensure-Label "module: M$_" "22C55E" "Module $_" }

# Milestones
Ensure-Milestone "Module 0 — Foundation" "Routing/layout, baseline state, POS shell"
Ensure-Milestone "Module 1 — Keyboard UX" "F8 qty modal, F4 payment focus, scan focus lock"
Ensure-Milestone "Module 2 — Catalog + Search/Scan" "Import mapping, scan resolver, dynamic search"
Ensure-Milestone "Module 3 — Pricing Engine" "Server-truth pricing rules + totals"
Ensure-Milestone "Module 4 — Aggregation View" "Aggregate cart display + better UX"
Ensure-Milestone "Module 5 — Checkout & Finalize Bill" "Payment flow, finalize lock, reset to new bill"
Ensure-Milestone "Module 6 — Admin Upload" "Upload/import with role gate + audit"
Ensure-Milestone "Module 7 — Daily Report + PDF" "Daily report + PDF generation in backend"

Write-Host "Done."
