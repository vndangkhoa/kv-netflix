$content = Get-Content 'watch_page_internal.html' -Raw
$regex = [regex]'<script.*?>.*?</script>'
$matches = $regex.Matches($content)
foreach ($m in $matches) {
    $m.Value
    Write-Output "--- SCRIPT END ---"
}
