$word = New-Object -ComObject Word.Application
$word.Visible = $false
$htmlPath = 'D:\Appzeto\KlydoCart-main\Delivery_App_Notifications_Report.html'
$docxPath = 'D:\Appzeto\KlydoCart-main\Delivery_App_Notifications_Report.docx'

$doc = $word.Documents.Open($htmlPath)
$doc.SaveAs([ref]$docxPath, [ref]16)
$doc.Close()
$word.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
Write-Host "DOCX successfully created at $docxPath"
